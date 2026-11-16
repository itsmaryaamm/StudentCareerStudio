import type { Msg } from "../chat";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouteContext } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@reactive-resume/ui/components/button";
import { Input } from "@reactive-resume/ui/components/input";
import { Spinner } from "@reactive-resume/ui/components/spinner";
import { Textarea } from "@reactive-resume/ui/components/textarea";
import { Bubble, readAsBase64 } from "../chat";
import { FactCard, useFacts } from "../profile";
import { AccessCard, isQuotaError, LimitBanner, studioErrorText, useStudioState } from "../shared";
import { orpc } from "@/libs/orpc/client";

type Step = "welcome" | "situation" | "inventory" | "contact" | "resume" | "linkedin" | "interview" | "finish";
type Kind = "resume" | "linkedin" | "portfolio";
type Intake = {
	situation?: string | undefined;
	first?: Kind | undefined;
	has?: Partial<Record<Kind, boolean | undefined>> | undefined;
	contact?: { email?: string | undefined; phone?: string | undefined; portfolio?: string | undefined } | undefined;
};

const SITUATIONS = [
	"A student looking for a co-op",
	"A student looking for an internship",
	"Graduating soon, looking for a job",
	"Just exploring for now",
];
const KIND_LABEL: Record<Kind, string> = {
	resume: "A résumé",
	linkedin: "A LinkedIn profile",
	portfolio: "A portfolio",
};
const ACCEPT = "application/pdf,image/png,image/jpeg,image/webp";
const MAX_CHARS = 2000;

/** The documents to walk through, the one they named first leading. Portfolio has no guided step of its own. */
const queueFor = (intake: Intake): ("resume" | "linkedin")[] =>
	(intake.first === "linkedin" ? (["linkedin", "resume"] as const) : (["resume", "linkedin"] as const)).filter(
		(k) => intake.has?.[k],
	);

let counter = 0;
const item = (role: Msg["role"], content: string): Msg => ({ id: `l${++counter}`, role, content });

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
	const [items, setItems] = useState<Msg[]>([]);
	const [draft, setDraft] = useState("");
	const [ticked, setTicked] = useState<Kind[]>([]);
	const [contact, setContact] = useState({
		email: session.user.email,
		phone: intake.contact?.phone ?? "",
		portfolio: intake.contact?.portfolio ?? "",
	});
	const [threadId, setThreadId] = useState<string | undefined>();
	const [turns, setTurns] = useState(0);
	const [error, setError] = useState<unknown>(null);
	const [uploaded, setUploaded] = useState(false);
	const endRef = useRef<HTMLDivElement>(null);
	const fileRef = useRef<HTMLInputElement>(null);
	const started = useRef(false);

	const aiOn = state?.aiAvailable ?? false;
	const hasConsent = Boolean(state?.aiConsentAt);
	const busy = send.isPending || analyze.isPending || save.isPending;
	const proposed = (facts ?? []).filter((f) => f.status === "proposed");
	const say = (text: string) => setItems((all) => [...all, item("assistant", text)]);
	const hear = (text: string) => setItems((all) => [...all, item("user", text)]);

	const prompts = (to: Step, n: string, i: Intake): string => {
		switch (to) {
			case "welcome":
				return "Hi! I'm your career coach. I'll help you build a résumé and LinkedIn profile from what you've really done. What should I call you?";
			case "situation":
				return `Nice to meet you, ${n}! Which stage are you at right now?`;
			case "inventory":
				return "Do you already have any of these? Tick everything you have, in the order you'd like to start with. Tick none if you're starting fresh.";
			case "contact":
				return "Good. For your résumé I'll need a few contact details. Check these and add what's missing.";
			case "resume":
				return i.first === "resume" || queueFor(i)[0] === "resume"
					? "Let's start with your résumé. Upload it (PDF or a photo) and I'll pull out what's in it. Nothing is saved until you approve it."
					: "Now your résumé. Upload it (PDF or a photo) and I'll add anything new to your profile.";
			case "linkedin":
				return queueFor(i)[0] === "linkedin"
					? "Let's start with LinkedIn. Take a screenshot of your profile (headline, About and experience) and upload it. I'll read it and we'll improve it together."
					: "Now LinkedIn. Upload a screenshot of your profile (headline, About, experience) and I'll compare it with what we have.";
			case "interview":
				return `No problem, ${n}. We'll build it by talking, like friends catching up. Who are you, and what do you study (or want to study)?`;
			case "finish":
				return `All set, ${n}! Your dashboard has your résumé, LinkedIn Studio and prompts. I'll be on the side if you need me.`;
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
		// Picks up an earlier get-to-know-you conversation if there was one.
		// oxlint-disable-next-line react-hooks/exhaustive-deps -- runs once when the account state first loads
	}, [state]);

	useEffect(() => {
		if (step !== "interview" || threadId || !threads.data?.length) return;
		const latest = threads.data[0];
		if (latest) setThreadId(latest.id);
	}, [step, threads.data, threadId]);

	useEffect(() => {
		endRef.current?.scrollIntoView({ block: "end" });
	}, [items.length, step, send.isPending, analyze.isPending]);

	const go = (to: Step, nextName = name, nextIntake = intake, extra?: { preferredName?: string }) => {
		setStep(to);
		setError(null);
		setUploaded(false);
		save.mutate({
			step: to === "finish" ? "interview" : to,
			...(extra?.preferredName ? { preferredName: extra.preferredName } : {}),
			intake: nextIntake,
		});
		say(prompts(to, nextName, nextIntake));
	};

	const afterDocs = (done: "resume" | "linkedin" | "contact", i: Intake = intake) => {
		const queue = queueFor(i);
		const nextIndex = done === "contact" ? 0 : queue.indexOf(done) + 1;
		const next = queue[nextIndex];
		if (next) return go(next, name, i);
		// Everything they had has been walked through. Someone with documents but little detail can still chat.
		go(queue.length ? "finish" : "interview", name, i);
	};

	const submitText = () => {
		const text = draft.trim();
		if (!text || busy) return;
		if (step === "welcome") {
			const n =
				text
					.replace(/^(i'?m|i am|call me|my name is|it'?s)\s+/i, "")
					.split(/[\s,.!]/)[0]
					?.slice(0, 40) || text.slice(0, 40);
			const clean = n.charAt(0).toUpperCase() + n.slice(1);
			hear(text);
			setDraft("");
			setName(clean);
			go("situation", clean, intake, { preferredName: clean });
		} else if (step === "situation") {
			chooseSituation(text.slice(0, 300));
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
						await Promise.all([
							queryClient.invalidateQueries({ queryKey: orpc.scs.state.key() }),
							queryClient.invalidateQueries({ queryKey: orpc.scs.facts.key() }),
						]);
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

	const chooseSituation = (text: string) => {
		hear(text);
		setDraft("");
		const next = { ...intake, situation: text };
		setIntake(next);
		go("inventory", name, next);
	};

	const confirmInventory = () => {
		const has = {
			resume: ticked.includes("resume"),
			linkedin: ticked.includes("linkedin"),
			portfolio: ticked.includes("portfolio"),
		};
		const next: Intake = { ...intake, has, first: ticked[0] };
		setIntake(next);
		hear(ticked.length ? ticked.map((k) => KIND_LABEL[k]).join(", ") : "None yet, I'm starting fresh");
		if (!ticked.length) return go("interview", name, next);
		go("contact", name, next);
	};

	const confirmContact = () => {
		const next: Intake = {
			...intake,
			contact: { email: contact.email.trim(), phone: contact.phone.trim(), portfolio: contact.portfolio.trim() },
		};
		setIntake(next);
		hear(
			["Email", contact.phone.trim() && "phone", intake.has?.portfolio && contact.portfolio.trim() && "portfolio link"]
				.filter(Boolean)
				.join(", ") + " saved",
		);
		afterDocs("contact", next);
	};

	const onFile = async (file: File | undefined, kind: "resume" | "linkedin") => {
		if (!file || busy) return;
		setError(null);
		try {
			const dataBase64 = await readAsBase64(file);
			hear(`Uploaded ${file.name}`);
			analyze.mutate(
				{ filename: file.name, mimeType: file.type, dataBase64 },
				{
					onSuccess: async (r) => {
						say(
							`${r.summary}${r.proposedFacts.length ? `\n\nI found ${r.proposedFacts.length} thing${r.proposedFacts.length > 1 ? "s" : ""} below. Keep what's accurate and remove the rest.` : ""}`,
						);
						setUploaded(true);
						await Promise.all([
							queryClient.invalidateQueries({ queryKey: orpc.scs.state.key() }),
							queryClient.invalidateQueries({ queryKey: orpc.scs.facts.key() }),
						]);
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
		void kind;
	};

	const finish = () => {
		save.mutate(
			{ complete: true, step: "done", intake },
			{ onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.scs.state.key() }) },
		);
	};

	const aiStep = step === "resume" || step === "linkedin" || step === "interview";
	const hasAccess = Boolean(state?.freeAccess || state?.ownKeyPreview);
	const needsAccess = aiOn && aiStep && !hasAccess;
	const needsConsent = aiOn && aiStep && hasAccess && !hasConsent;
	const quotaHit = isQuotaError(error);

	return (
		<div className="mx-auto flex h-svh w-full max-w-2xl flex-col px-3 py-3 sm:py-6">
			<header className="flex items-center justify-between pb-3">
				<h1 className="text-lg font-semibold">Student Career Studio</h1>
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

			<section
				aria-label="Conversation with your career coach"
				className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-raised"
			>
				<div className="flex-1 overflow-y-auto p-3 sm:p-4">
					<div role="log" aria-live="polite" aria-relevant="additions" aria-label="Messages">
						<ol className="grid gap-3">
							{items.map((m) => (
								<Bubble key={m.id} msg={m} />
							))}
							{(send.isPending || analyze.isPending) && (
								<li className="flex items-center gap-2 ps-1 text-sm text-ink-3">
									<Spinner decorative /> {analyze.isPending ? "Reading your file…" : "Coach is typing…"}
								</li>
							)}
						</ol>
					</div>

					{proposed.length > 0 && aiStep && (
						<div className="mt-3">
							<h3 className="mb-1.5 text-[13px] font-semibold text-warn-text">Verify before saving</h3>
							<ul className="grid gap-2">
								{proposed.map((f) => (
									<FactCard key={f.id} fact={f} />
								))}
							</ul>
						</div>
					)}
					<div ref={endRef} />
				</div>

				{quotaHit && <LimitBanner className="mx-3 mb-2" onReset={() => setError(null)} />}
				{error != null && !quotaHit && (
					<p role="alert" className="mx-3 mb-2 rounded-lg bg-danger-soft p-2.5 text-sm text-danger-text">
						{studioErrorText(error)}
					</p>
				)}

				<div className="border-t border-line p-3">
					{needsAccess ? (
						<div className="grid gap-2">
							<AccessCard />
							<Button
								variant="ghost"
								className="justify-self-start"
								onClick={() => (step === "interview" ? go("finish") : afterDocs(step as "resume" | "linkedin"))}
							>
								Skip this for now
							</Button>
						</div>
					) : needsConsent ? (
						<div className="grid gap-2 text-sm">
							<p>
								To read files and chat, I send your messages and any file you upload to Google's Gemini. Files are read
								once and never stored, and nothing is saved to your profile until you approve it.{" "}
								<a href="/privacy" target="_blank" rel="noreferrer" className="text-accent-text underline">
									Privacy notice
								</a>
							</p>
							<div className="flex gap-2">
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
								<Button
									variant="ghost"
									onClick={() => (step === "interview" ? go("finish") : afterDocs(step as "resume" | "linkedin"))}
								>
									Skip this
								</Button>
							</div>
						</div>
					) : step === "situation" ? (
						<div className="grid gap-2">
							<div className="flex flex-wrap gap-2">
								{SITUATIONS.map((s) => (
									<Button key={s} variant="secondary" size="sm" disabled={busy} onClick={() => chooseSituation(s)}>
										{s}
									</Button>
								))}
							</div>
							<Composer
								{...{ draft, setDraft, submitText, busy }}
								placeholder="Or type it in your own words…"
								label="Your situation"
							/>
						</div>
					) : step === "inventory" ? (
						<div className="grid gap-3">
							<div className="flex flex-wrap gap-2">
								{(Object.keys(KIND_LABEL) as Kind[]).map((k) => {
									const idx = ticked.indexOf(k);
									return (
										<Button
											key={k}
											variant="secondary"
											className={idx >= 0 ? "border-accent bg-accent-soft font-semibold text-accent-text" : ""}
											aria-pressed={idx >= 0}
											onClick={() => setTicked((t) => (t.includes(k) ? t.filter((x) => x !== k) : [...t, k]))}
										>
											{idx >= 0 ? `${idx + 1}. ` : ""}
											{KIND_LABEL[k]}
										</Button>
									);
								})}
							</div>
							<Button className="justify-self-start" disabled={busy} onClick={confirmInventory}>
								{ticked.length ? "Continue" : "I have none of these yet"}
							</Button>
						</div>
					) : step === "contact" ? (
						<div className="grid gap-2 sm:grid-cols-2">
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
					) : step === "resume" || step === "linkedin" ? (
						<div className="grid gap-2">
							<input
								ref={fileRef}
								type="file"
								accept={ACCEPT}
								className="sr-only"
								aria-label="Choose a file to upload"
								tabIndex={-1}
								onChange={(e) => void onFile(e.target.files?.[0], step as "resume" | "linkedin")}
							/>
							<div className="flex flex-wrap gap-2">
								{!uploaded && (
									<Button disabled={busy || !aiOn} onClick={() => fileRef.current?.click()}>
										{step === "resume" ? "Upload my résumé" : "Upload a screenshot"}
									</Button>
								)}
								{uploaded && <Button onClick={() => afterDocs(step as "resume" | "linkedin")}>Continue</Button>}
								{!uploaded && (
									<Button variant="ghost" disabled={busy} onClick={() => afterDocs(step as "resume" | "linkedin")}>
										Skip this for now
									</Button>
								)}
							</div>
							{!aiOn && (
								<p className="text-xs text-ink-3">The AI reader isn't switched on yet, so skip this for now.</p>
							)}
						</div>
					) : step === "interview" ? (
						<div className="grid gap-2">
							{aiOn ? (
								<Composer
									{...{ draft, setDraft, submitText, busy: busy || quotaHit }}
									placeholder="Type your answer…"
									label="Your answer"
								/>
							) : (
								<p className="text-sm text-ink-3">
									The AI coach isn't switched on yet. You can build your résumé from the dashboard.
								</p>
							)}
							{(turns >= 3 || quotaHit || !aiOn) && (
								<Button variant="secondary" className="justify-self-start" onClick={() => go("finish")}>
									That's enough for now, take me to my dashboard
								</Button>
							)}
						</div>
					) : step === "finish" ? (
						<Button disabled={save.isPending} onClick={finish}>
							Go to my dashboard
						</Button>
					) : (
						<Composer {...{ draft, setDraft, submitText, busy }} placeholder="Type your name…" label="Your name" />
					)}
				</div>
			</section>
		</div>
	);
}

function Composer({
	draft,
	setDraft,
	submitText,
	busy,
	placeholder,
	label,
}: {
	draft: string;
	setDraft: (v: string) => void;
	submitText: () => void;
	busy: boolean;
	placeholder: string;
	label: string;
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
					rows={2}
					autoFocus
					value={draft}
					maxLength={MAX_CHARS + 50}
					placeholder={placeholder}
					onChange={(e) => setDraft(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
							e.preventDefault();
							submitText();
						}
					}}
				/>
			</div>
			<Button type="submit" disabled={busy || !draft.trim() || draft.length > MAX_CHARS}>
				Send
			</Button>
		</form>
	);
}
