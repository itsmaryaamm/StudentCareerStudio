import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@reactive-resume/ui/components/button";
import { Icon } from "@reactive-resume/ui/components/icon";
import { Input } from "@reactive-resume/ui/components/input";
import { Textarea } from "@reactive-resume/ui/components/textarea";
import { cn } from "@reactive-resume/utils/style";
import { readAsBase64, UPLOAD_ACCEPT, uploadMime } from "../chat";
import { FactCard, useFacts } from "../profile";
import { isQuotaError, LimitBanner, studioErrorText, useStudioState } from "../shared";
import { BrandWordmark } from "@/components/brand-wordmark";
import { ENTER_CLASS } from "@/libs/motion";
import { orpc } from "@/libs/orpc/client";

type Step = "welcome" | "situation" | "goal" | "inventory" | "contact" | "resume" | "linkedin" | "interview" | "finish";
type Kind = "resume" | "linkedin" | "portfolio";
type Intake = {
	situation?: string | undefined;
	goal?: string | undefined;
	first?: Kind | undefined;
	has?: Partial<Record<Kind, boolean | undefined>> | undefined;
	contact?:
		| {
				email?: string | undefined;
				phone?: string | undefined;
				portfolio?: string | undefined;
				linkedin?: string | undefined;
		  }
		| undefined;
};
type Line = { id: string; role: "assistant" | "user"; text: string };

const SITUATIONS = [
	"Looking for a co-op",
	"Looking for an internship",
	"Looking for a summer or part-time job",
	"Graduating soon, looking for a full-time job",
	"Recent grad, looking for my first job",
	"Applying to grad school or a program",
	"Looking for volunteer or research experience",
	"Switching careers",
	"In high school, planning ahead",
	"Just exploring for now",
];
const KIND_LABEL: Record<Kind, string> = {
	resume: "A résumé",
	linkedin: "A LinkedIn profile",
	portfolio: "A portfolio",
};
const MAX_CHARS = 1900;

/** The documents to walk through, the one they named first leading. Portfolio has no guided step of its own. */
const queueFor = (intake: Intake): ("resume" | "linkedin")[] =>
	(intake.first === "linkedin" ? (["linkedin", "resume"] as const) : (["resume", "linkedin"] as const)).filter(
		(k) => intake.has?.[k],
	);

const PATTERNS: Record<Kind, string> = {
	resume: "résumé|resume|cv",
	linkedin: "linkedin|linked in",
	portfolio: "portfolio|website|github|behance|dribbble",
};

/** Reads "I have a resume and linkedin, no portfolio" into the kinds named, in the order they were said. */
function parseInventory(text: string) {
	const t = text.toLowerCase();
	const found: { kind: Kind; at: number }[] = [];
	for (const kind of Object.keys(PATTERNS) as Kind[]) {
		const hit = new RegExp(PATTERNS[kind]).exec(t);
		const negated = new RegExp(
			`(?:\\bno\\b|don'?t have|do not have|dont have|without|haven'?t (?:got|made)|never (?:made|had))\\s+(?:a\\s+|an\\s+|my\\s+|any\\s+)?(?:${PATTERNS[kind]})`,
		).test(t);
		if (hit && !negated) found.push({ kind, at: hit.index });
	}
	found.sort((a, b) => a.at - b.at);
	return found.map((f) => f.kind);
}

const asUrl = (value: string) => {
	const v = value.trim();
	if (!/linkedin\.com\/(in|pub)\//i.test(v)) return null;
	return /^https?:\/\//i.test(v) ? v : `https://${v.replace(/^\/+/, "")}`;
};

/** A mistake in what they typed (not a server failure): shown as is. */
class Hint extends Error {}

let counter = 0;
const line = (role: Line["role"], text: string): Line => ({ id: `l${++counter}`, role, text });

export function OnboardingChat() {
	const queryClient = useQueryClient();
	const { session } = useRouteContext({ from: "/dashboard" });
	const { data: state } = useStudioState();
	const { data: facts } = useFacts();
	const save = useMutation(orpc.scs.saveIntake.mutationOptions());
	const skip = useMutation(orpc.scs.setOnboarding.mutationOptions());
	const consent = useMutation(orpc.scs.acceptConsent.mutationOptions());
	const send = useMutation(orpc.scs.chat.send.mutationOptions());
	const analyze = useMutation(orpc.scs.chat.analyze.mutationOptions());
	const threads = useQuery(orpc.scs.chat.threads.queryOptions());

	const stored = state?.onboardingStep as Step | "done" | null | undefined;
	const [step, setStep] = useState<Step>(stored && stored !== "done" ? stored : "welcome");
	const [name, setName] = useState(state?.preferredName ?? "");
	const [intake, setIntake] = useState<Intake>((state?.intake as Intake | undefined) ?? {});
	const [items, setItems] = useState<Line[]>([]);
	const [typing, setTyping] = useState(false);
	const [draft, setDraft] = useState("");
	const [ticked, setTicked] = useState<Kind[]>([]);
	const [contact, setContact] = useState({
		email: session.user.email,
		phone: intake.contact?.phone ?? "",
		portfolio: intake.contact?.portfolio ?? "",
	});
	const [linkedinUrl, setLinkedinUrl] = useState(intake.contact?.linkedin ?? "");
	const [linkedinSaved, setLinkedinSaved] = useState(false);
	const [threadId, setThreadId] = useState<string | undefined>();
	const [turns, setTurns] = useState(0);
	const [error, setError] = useState<unknown>(null);
	const [uploaded, setUploaded] = useState(false);
	const endRef = useRef<HTMLDivElement>(null);
	const fileRef = useRef<HTMLInputElement>(null);
	const started = useRef(false);
	const queue = useRef<Promise<void>>(Promise.resolve());

	const aiOn = state?.aiAvailable ?? false;
	const hasConsent = Boolean(state?.aiConsentAt);
	const busy = send.isPending || analyze.isPending || save.isPending || typing;
	const proposed = (facts ?? []).filter((f) => f.status === "proposed");

	/** The coach "types" for a moment, so the conversation feels like one, and lines arrive in order. */
	const say = (text: string) => {
		setTyping(true);
		queue.current = queue.current.then(
			() =>
				new Promise<void>((resolve) => {
					window.setTimeout(
						() => {
							setItems((all) => [...all, line("assistant", text)]);
							setTyping(false);
							resolve();
						},
						Math.min(1100, 350 + text.length * 7),
					);
				}),
		);
	};
	const hear = (text: string) => setItems((all) => [...all, line("user", text)]);

	const prompts = (to: Step, n: string, i: Intake): string => {
		switch (to) {
			case "welcome":
				return "What should I call you?";
			case "situation":
				return `Nice to meet you, ${n}! Where are you at right now? Pick one, or tell me in your own words.`;
			case "goal":
				return "Great. What role are you aiming for, and by when? For example: software co-op, summer 2027. A rough idea is fine.";
			case "inventory":
				return "Do you already have any of these? Tap everything you have, in the order you'd like to start with, or just tell me. Tap none if you're starting fresh.";
			case "contact":
				return "Good. For your résumé I'll need a few contact details. Check these and add what's missing.";
			case "resume":
				return queueFor(i)[0] === "resume"
					? "Let's start with your résumé. Upload it (PDF, Word or a photo), or paste the text here, and I'll pull out what's in it. Nothing is saved until you approve it."
					: "Now your résumé. Upload it (PDF, Word or a photo), or paste the text, and I'll add anything new to your profile.";
			case "linkedin":
				return queueFor(i)[0] === "linkedin"
					? "Let's start with LinkedIn. Paste the link to your profile (it looks like linkedin.com/in/your-name)."
					: "Now LinkedIn. Paste the link to your profile (linkedin.com/in/your-name).";
			case "interview":
				return `No problem, ${n}. We'll build it by talking, like friends catching up. Who are you, and what do you study (or want to study)?`;
			case "finish":
				return `All set, ${n}! Your dashboard has your résumé, LinkedIn Studio and the Career Lab. I'll be on the side if you need me.`;
		}
	};

	// First paint: greet, or pick up where they left off.
	useEffect(() => {
		if (!state || started.current) return;
		started.current = true;
		const n = state.preferredName ?? "";
		if (step === "welcome") say(prompts("welcome", n, intake));
		else {
			say(`Welcome back${n ? `, ${n}` : ""}! Let's pick up where we left off.`);
			say(prompts(step, n, intake));
		}
		// oxlint-disable-next-line react-hooks/exhaustive-deps -- runs once when the account state first loads
	}, [state]);

	useEffect(() => {
		if (step !== "interview" || threadId || !threads.data?.length) return;
		const latest = threads.data[0];
		if (latest) setThreadId(latest.id);
	}, [step, threads.data, threadId]);

	useEffect(() => {
		endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
	}, [items.length, step, typing, send.isPending, analyze.isPending, proposed.length]);

	const go = (to: Step, nextName = name, nextIntake = intake, extra?: { preferredName?: string }) => {
		setStep(to);
		setError(null);
		setUploaded(false);
		setLinkedinSaved(false);
		save.mutate({
			step: to === "finish" ? "interview" : to,
			...(extra?.preferredName ? { preferredName: extra.preferredName } : {}),
			intake: nextIntake,
		});
		say(prompts(to, nextName, nextIntake));
	};

	const afterDocs = (done: "resume" | "linkedin" | "contact", i: Intake = intake) => {
		const docs = queueFor(i);
		const next = docs[done === "contact" ? 0 : docs.indexOf(done) + 1];
		if (next) return go(next, name, i);
		// Everything they had has been walked through. Someone with documents but little detail can still chat.
		go(docs.length ? "finish" : "interview", name, i);
	};

	const reportFacts = () =>
		Promise.all([
			queryClient.invalidateQueries({ queryKey: orpc.scs.state.key() }),
			queryClient.invalidateQueries({ queryKey: orpc.scs.facts.key() }),
		]);

	const chooseSituation = (text: string) => {
		hear(text);
		setDraft("");
		const next = { ...intake, situation: text.slice(0, 300) };
		setIntake(next);
		go("goal", name, next);
	};

	const chooseGoal = (text: string) => {
		hear(text);
		setDraft("");
		const next = { ...intake, goal: text.slice(0, 200) };
		setIntake(next);
		go("inventory", name, next);
	};

	const chooseInventory = (kinds: Kind[], said?: string) => {
		const has = {
			resume: kinds.includes("resume"),
			linkedin: kinds.includes("linkedin"),
			portfolio: kinds.includes("portfolio"),
		};
		const next: Intake = { ...intake, has, first: kinds[0] };
		setIntake(next);
		hear(said ?? (kinds.length ? kinds.map((k) => KIND_LABEL[k]).join(", ") : "None yet, I'm starting fresh"));
		setDraft("");
		go(kinds.length ? "contact" : "interview", name, next);
	};

	const confirmContact = () => {
		const next: Intake = {
			...intake,
			contact: {
				...intake.contact,
				email: contact.email.trim(),
				phone: contact.phone.trim(),
				portfolio: contact.portfolio.trim(),
			},
		};
		setIntake(next);
		hear("Contact details saved");
		afterDocs("contact", next);
	};

	const saveLinkedin = () => {
		const url = asUrl(linkedinUrl);
		if (!url) {
			setError(
				new Hint("That doesn't look like a LinkedIn profile link. It should look like linkedin.com/in/your-name."),
			);
			return;
		}
		const next: Intake = { ...intake, contact: { ...intake.contact, linkedin: url } };
		setIntake(next);
		setError(null);
		hear(url);
		setLinkedinSaved(true);
		save.mutate({ intake: next });
		say(
			"Saved. LinkedIn doesn't let anyone else read a profile, so to add what's on it, paste your About text and a few roles below, or upload LinkedIn's \"Save to PDF\" file. Or skip and we'll do it later.",
		);
	};

	/** Text pasted from a résumé or LinkedIn goes through the coach, which proposes facts for the student to verify. */
	const sendPaste = (kind: "resume" | "linkedin", text: string) => {
		hear(text.length > 160 ? `${text.slice(0, 160)}…` : text);
		setDraft("");
		setError(null);
		const label = kind === "resume" ? "Here is the text of my résumé:" : "Here is the text from my LinkedIn profile:";
		send.mutate(
			{ ...(threadId ? { threadId } : {}), message: `${label}\n\n${text}`.slice(0, 2000) },
			{
				onSuccess: async (r) => {
					setThreadId(r.threadId);
					setUploaded(true);
					say(r.reply);
					await reportFacts();
				},
				onError: (e) => {
					setError(e);
					setDraft(text);
					setItems((all) => all.slice(0, -1));
				},
			},
		);
	};

	const submitText = () => {
		const text = draft.trim();
		if (!text || busy) return;
		if (step === "welcome") {
			const first =
				text
					.replace(/^(i'?m|i am|call me|my name is|it'?s|this is)\s+/i, "")
					.split(/[\s,.!]/)[0]
					?.slice(0, 40) || text.slice(0, 40);
			const clean = first.charAt(0).toUpperCase() + first.slice(1);
			hear(text);
			setDraft("");
			setName(clean);
			go("situation", clean, intake, { preferredName: clean });
		} else if (step === "situation") {
			chooseSituation(text);
		} else if (step === "goal") {
			chooseGoal(text);
		} else if (step === "inventory") {
			const kinds = parseInventory(text);
			const none = /\b(nothing|none|neither|nope|not yet|starting fresh|don'?t have any)\b/i.test(text);
			if (!kinds.length && !none) {
				hear(text);
				setDraft("");
				say(
					'I didn\'t catch which of those you have. Tap the ones that fit, or say something like "a résumé and LinkedIn".',
				);
				return;
			}
			chooseInventory(kinds, text);
		} else if (step === "resume" || step === "linkedin") {
			sendPaste(step, text);
		} else if (step === "interview") {
			hear(text);
			setDraft("");
			setError(null);
			send.mutate(
				{ ...(threadId ? { threadId } : {}), message: text, mode: "interview" },
				{
					onSuccess: async (r) => {
						setThreadId(r.threadId);
						setTurns((n) => n + 1);
						say(r.reply);
						await reportFacts();
					},
					onError: (e) => {
						setError(e);
						setDraft(text); // nothing they wrote is lost
						setItems((all) => all.slice(0, -1));
					},
				},
			);
		}
	};

	const onFile = async (file: File | undefined) => {
		if (!file || busy) return;
		setError(null);
		try {
			const dataBase64 = await readAsBase64(file);
			hear(`Uploaded ${file.name}`);
			analyze.mutate(
				{ filename: file.name, mimeType: uploadMime(file), dataBase64 },
				{
					onSuccess: async (r) => {
						say(
							`${r.summary}${r.proposedFacts.length ? `\n\nI found ${r.proposedFacts.length} thing${r.proposedFacts.length > 1 ? "s" : ""} below. Keep what's accurate and remove the rest.` : ""}`,
						);
						setUploaded(true);
						await reportFacts();
					},
					onError: (e) => {
						setError(e);
						setItems((all) => all.slice(0, -1));
					},
				},
			);
		} catch (e) {
			setError(e);
		}
		if (fileRef.current) fileRef.current.value = "";
	};

	const finish = () =>
		save.mutate(
			{ complete: true, step: "done", intake },
			{ onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.scs.state.key() }) },
		);

	const aiStep = step === "resume" || step === "linkedin" || step === "interview";
	// Saving a LinkedIn link sends nothing to Google, so consent waits until something is actually read.
	const needsConsent =
		aiOn && (step === "resume" || step === "interview" || (step === "linkedin" && linkedinSaved)) && !hasConsent;
	const quotaHit = isQuotaError(error);
	// Before they've typed anything, the screen is a big hello and one box, not a transcript.
	const hero = step === "welcome" && !items.some((m) => m.role === "user");
	const showDock = !typing || items.length === 0;
	const skipDocs = () => afterDocs(step as "resume" | "linkedin");

	return (
		<div className="relative isolate flex h-svh w-full flex-col overflow-hidden bg-[#fbf9ff] text-ink">
			{/* Soft colour behind everything. */}
			<div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
				<div className="absolute -top-40 -left-32 size-[34rem] rounded-full bg-[#c9b8ff] opacity-60 blur-[110px]" />
				<div className="absolute top-1/3 -right-40 size-[32rem] rounded-full bg-[#ffc6e4] opacity-60 blur-[110px]" />
				<div className="absolute -bottom-48 left-1/4 size-[36rem] rounded-full bg-[#bfe2ff] opacity-60 blur-[120px]" />
			</div>

			<header className="flex items-center justify-between px-5 py-4 sm:px-8">
				<div className="flex items-center gap-2.5 text-[15px] font-semibold">
					<BrandWordmark variant="light" className="h-12" />
				</div>
				<Button
					variant="ghost"
					size="sm"
					disabled={skip.isPending}
					onClick={() =>
						skip.mutate(
							{ choice: "skip" },
							{ onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.scs.state.key() }) },
						)
					}
				>
					Skip for now
				</Button>
			</header>

			<main className="flex min-h-0 flex-1 flex-col" aria-label="Conversation with your career coach">
				<div className="flex-1 overflow-y-auto">
					<div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-5 pb-6 sm:px-8">
						{hero ? (
							<div className="my-auto grid gap-3 py-10 text-center">
								<h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
									Hi, I'm your career coach.
								</h1>
								<p className="mx-auto max-w-xl text-lg text-ink-2 sm:text-xl">
									I'll help you build a résumé and LinkedIn profile from what you've really done.
								</p>
								<p className="mx-auto max-w-xl text-sm text-ink-3">
									About 2 minutes. Your answers are saved as you go, so you can leave and come back.
								</p>
							</div>
						) : (
							<div
								role="log"
								aria-live="polite"
								aria-relevant="additions"
								aria-label="Messages"
								className="grid gap-5 pt-6"
							>
								{items.map((m, i) =>
									m.role === "assistant" ? (
										<div key={m.id} className={cn(ENTER_CLASS, "flex items-start gap-3")}>
											<span
												aria-hidden
												className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-linear-to-br from-[#6d4df0] to-[#a07df7] text-white"
											>
												<Icon name="sparkle" size={15} />
											</span>
											<p className="max-w-[40rem] text-[17px] leading-7 [overflow-wrap:anywhere] whitespace-pre-wrap sm:text-lg sm:leading-8">
												<span className="sr-only">Coach: </span>
												{m.text}
											</p>
										</div>
									) : (
										<div
											key={m.id}
											className={cn(ENTER_CLASS, "flex justify-end")}
											style={{ ["--stagger" as string]: `${i * 10}ms` }}
										>
											<p className="max-w-[85%] rounded-3xl rounded-br-lg bg-white px-5 py-3 text-[17px] leading-7 [overflow-wrap:anywhere] whitespace-pre-wrap shadow-[0_6px_24px_-12px_rgba(80,50,200,0.35)] ring-1 ring-black/5 sm:text-lg">
												<span className="sr-only">You: </span>
												{m.text}
											</p>
										</div>
									),
								)}
								{(typing || send.isPending || analyze.isPending) && (
									<div className="flex items-center gap-3 text-ink-3">
										<span aria-hidden className="size-8 shrink-0" />
										<span className="flex items-center gap-1.5" role="status">
											<span className="sr-only">{analyze.isPending ? "Reading your file" : "Coach is typing"}</span>
											{[0, 1, 2].map((d) => (
												<span
													key={d}
													aria-hidden
													className="size-2 animate-bounce rounded-full bg-[#8b6cf0]/70 motion-reduce:animate-none"
													style={{ animationDelay: `${d * 150}ms` }}
												/>
											))}
											{analyze.isPending && <span className="ms-2 text-sm">Reading your file…</span>}
										</span>
									</div>
								)}
								{proposed.length > 0 && aiStep && (
									<div className={cn(ENTER_CLASS, "ms-11")}>
										<h2 className="mb-2 text-sm font-semibold text-warn-text">Check these before they're saved</h2>
										<ul className="grid gap-2">
											{proposed.map((f) => (
												<FactCard key={f.id} fact={f} />
											))}
										</ul>
									</div>
								)}
							</div>
						)}
						<div ref={endRef} />
					</div>
				</div>

				{quotaHit && <LimitBanner className="mx-auto mb-3 w-full max-w-3xl" onReset={() => setError(null)} />}
				{error != null && !quotaHit && (
					<p
						role="alert"
						className="mx-auto mb-3 w-full max-w-3xl rounded-2xl bg-danger-soft px-4 py-2.5 text-sm text-danger-text"
					>
						{error instanceof Hint ? error.message : studioErrorText(error)}
					</p>
				)}

				{/* The input dock: one thing to do at a time, floating over the colour. */}
				<div className="mx-auto w-full max-w-3xl px-4 pb-5 sm:px-8 sm:pb-8">
					{showDock && (
						<div className="rounded-[1.75rem] bg-white/85 p-3 shadow-[0_20px_60px_-20px_rgba(80,50,200,0.35)] ring-1 ring-black/5 backdrop-blur-xl sm:p-4">
							{needsConsent ? (
								<div className="grid gap-3 text-sm">
									<p>
										To read files and chat, I send your messages and any file you upload to Google's AI. Files are read
										once and never stored, and nothing is saved to your profile until you approve it.{" "}
										<a href="/privacy" target="_blank" rel="noreferrer" className="text-accent-text underline">
											Privacy notice
										</a>
									</p>
									<div className="flex flex-wrap gap-2">
										<Button
											disabled={consent.isPending}
											onClick={() =>
												consent.mutate(
													{},
													{ onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.scs.state.key() }) },
												)
											}
										>
											I understand, continue
										</Button>
										<Button variant="ghost" onClick={() => (step === "interview" ? go("finish") : skipDocs())}>
											Skip this
										</Button>
									</div>
								</div>
							) : step === "welcome" ? (
								<Composer
									{...{ draft, setDraft, submitText, busy }}
									placeholder="What should I call you?"
									label="Your name"
									big
								/>
							) : step === "situation" ? (
								<div className="grid gap-3">
									<div className="flex flex-wrap gap-2">
										{SITUATIONS.map((s) => (
											<Chip key={s} disabled={busy} onClick={() => chooseSituation(s)}>
												{s}
											</Chip>
										))}
									</div>
									<Composer
										{...{ draft, setDraft, submitText, busy }}
										placeholder="Or type it in your own words…"
										label="Your situation"
									/>
								</div>
							) : step === "goal" ? (
								<div className="grid gap-3">
									<Composer
										{...{ draft, setDraft, submitText, busy }}
										placeholder="e.g. Software co-op, summer 2027"
										label="Your goal"
									/>
									<Button
										variant="ghost"
										className="justify-self-start"
										disabled={busy}
										onClick={() => go("inventory", name, intake)}
									>
										Not sure yet, skip
									</Button>
								</div>
							) : step === "inventory" ? (
								<div className="grid gap-3">
									<div className="flex flex-wrap gap-2">
										{(Object.keys(KIND_LABEL) as Kind[]).map((k) => {
											const idx = ticked.indexOf(k);
											return (
												<Chip
													key={k}
													pressed={idx >= 0}
													onClick={() => setTicked((t) => (t.includes(k) ? t.filter((x) => x !== k) : [...t, k]))}
												>
													{idx >= 0 ? `${idx + 1}. ` : ""}
													{KIND_LABEL[k]}
												</Chip>
											);
										})}
										<Button disabled={busy} onClick={() => chooseInventory(ticked)} className="rounded-full">
											{ticked.length ? "Continue" : "I have none of these yet"}
										</Button>
									</div>
									<Composer
										{...{ draft, setDraft, submitText, busy }}
										placeholder={'Or type it, like "a résumé and LinkedIn"…'}
										label="What you already have"
									/>
								</div>
							) : step === "contact" ? (
								<div className="grid gap-3 sm:grid-cols-2">
									<div className="grid gap-1 text-[13px]">
										<label htmlFor="c-email">Email</label>
										<Input
											id="c-email"
											type="email"
											autoComplete="email"
											value={contact.email}
											onChange={(e) => setContact({ ...contact, email: e.target.value })}
										/>
									</div>
									<div className="grid gap-1 text-[13px]">
										<label htmlFor="c-phone">Phone</label>
										<Input
											id="c-phone"
											type="tel"
											autoComplete="tel"
											value={contact.phone}
											onChange={(e) => setContact({ ...contact, phone: e.target.value })}
										/>
									</div>
									{intake.has?.portfolio && (
										<div className="grid gap-1 text-[13px] sm:col-span-2">
											<label htmlFor="c-site">Portfolio link</label>
											<Input
												id="c-site"
												type="url"
												placeholder="https://"
												value={contact.portfolio}
												onChange={(e) => setContact({ ...contact, portfolio: e.target.value })}
											/>
										</div>
									)}
									<div className="flex gap-2 sm:col-span-2">
										<Button disabled={busy} onClick={confirmContact}>
											Continue
										</Button>
										<Button variant="ghost" onClick={() => afterDocs("contact")}>
											Skip
										</Button>
									</div>
								</div>
							) : step === "linkedin" && !linkedinSaved ? (
								<div className="grid gap-3">
									<form
										className="flex items-end gap-2"
										onSubmit={(e) => {
											e.preventDefault();
											saveLinkedin();
										}}
									>
										<div className="min-w-0 flex-1">
											<label htmlFor="ln-url" className="sr-only">
												Your LinkedIn profile link
											</label>
											<Input
												id="ln-url"
												type="text"
												inputMode="url"
												autoCapitalize="none"
												spellCheck={false}
												autoFocus
												className="h-12 rounded-full px-5 text-base"
												placeholder="linkedin.com/in/your-name"
												value={linkedinUrl}
												onChange={(e) => setLinkedinUrl(e.target.value)}
											/>
										</div>
										<Button
											type="submit"
											size="lg"
											className="h-12 rounded-full px-6"
											disabled={busy || !linkedinUrl.trim()}
										>
											Save link
										</Button>
									</form>
									<Button variant="ghost" className="justify-self-start" disabled={busy} onClick={skipDocs}>
										Skip this for now
									</Button>
								</div>
							) : step === "resume" || step === "linkedin" ? (
								<div className="grid gap-3">
									<input
										ref={fileRef}
										type="file"
										accept={UPLOAD_ACCEPT}
										className="sr-only"
										aria-label="Choose a file to upload"
										tabIndex={-1}
										onChange={(e) => void onFile(e.target.files?.[0])}
									/>
									{uploaded ? (
										<Button className="justify-self-start rounded-full" onClick={skipDocs}>
											Continue
										</Button>
									) : (
										<>
											<div className="flex flex-wrap gap-2">
												<Button
													className="rounded-full"
													disabled={busy || !aiOn}
													onClick={() => fileRef.current?.click()}
												>
													<Icon name="file-arrow-up" size={16} />
													{step === "resume" ? "Upload my résumé" : "Upload LinkedIn PDF"}
												</Button>
												<Button variant="ghost" disabled={busy} onClick={skipDocs}>
													Skip this for now
												</Button>
											</div>
											{aiOn ? (
												<Composer
													{...{ draft, setDraft, submitText, busy }}
													placeholder={
														step === "resume"
															? "Or paste your résumé text here…"
															: "Or paste your About text and a few roles here…"
													}
													label="Paste text"
													maxLength={MAX_CHARS}
												/>
											) : (
												<p className="text-xs text-ink-3">The AI reader isn't switched on yet, so skip this for now.</p>
											)}
										</>
									)}
								</div>
							) : step === "interview" ? (
								<div className="grid gap-3">
									{aiOn ? (
										<Composer
											{...{ draft, setDraft, submitText, busy: busy || quotaHit }}
											placeholder="Type your answer…"
											label="Your answer"
											maxLength={MAX_CHARS}
										/>
									) : (
										<p className="text-sm text-ink-3">
											The AI coach isn't switched on yet. You can build your résumé from the dashboard.
										</p>
									)}
									{(turns >= 3 || quotaHit || !aiOn) && (
										<Button
											variant="secondary"
											className="justify-self-start rounded-full"
											onClick={() => go("finish")}
										>
											That's enough for now, take me to my dashboard
										</Button>
									)}
								</div>
							) : step === "finish" ? (
								<Button size="lg" className="rounded-full" disabled={save.isPending} onClick={finish}>
									Go to my dashboard
								</Button>
							) : null}
						</div>
					)}
				</div>
			</main>
		</div>
	);
}

function Chip({
	children,
	onClick,
	pressed,
	disabled,
}: {
	children: React.ReactNode;
	onClick: () => void;
	pressed?: boolean | undefined;
	disabled?: boolean | undefined;
}) {
	return (
		<button
			type="button"
			disabled={disabled}
			aria-pressed={pressed}
			onClick={onClick}
			className={cn(
				"rounded-full border px-4 py-2 text-[15px] transition-colors focus-visible:outline-2 disabled:opacity-50",
				pressed
					? "border-accent bg-accent-soft font-semibold text-accent-text"
					: "border-line bg-white hover:border-accent hover:bg-accent-soft/60",
			)}
		>
			{children}
		</button>
	);
}

function Composer({
	draft,
	setDraft,
	submitText,
	busy,
	placeholder,
	label,
	big = false,
	maxLength = 300,
}: {
	draft: string;
	setDraft: (v: string) => void;
	submitText: () => void;
	busy: boolean;
	placeholder: string;
	label: string;
	big?: boolean;
	maxLength?: number;
}) {
	return (
		<form
			className="flex items-end gap-2"
			onSubmit={(e) => {
				e.preventDefault();
				submitText();
			}}
		>
			<div className="min-w-0 flex-1">
				<label htmlFor="onb-input" className="sr-only">
					{label}
				</label>
				<Textarea
					id="onb-input"
					rows={big ? 1 : 2}
					autoFocus
					value={draft}
					maxLength={maxLength + 50}
					placeholder={placeholder}
					className={cn(
						"resize-none rounded-3xl border-0 bg-transparent shadow-none focus-visible:ring-0",
						big ? "min-h-12 px-3 py-3 text-xl" : "px-3 text-base",
					)}
					onChange={(e) => setDraft(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
							e.preventDefault();
							submitText();
						}
					}}
				/>
			</div>
			<Button
				type="submit"
				size="icon"
				aria-label="Send"
				className="size-11 shrink-0 rounded-full"
				disabled={busy || !draft.trim() || draft.length > maxLength}
			>
				<Icon name="arrow-up" size={18} />
			</Button>
		</form>
	);
}
