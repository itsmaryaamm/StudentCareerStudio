import type { Mission, MissionId, Question } from "./missions";
import type { Answers } from "./prompt";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@reactive-resume/ui/components/input";
import { Textarea } from "@reactive-resume/ui/components/textarea";
import { toast } from "@reactive-resume/ui/components/toast";
import { cn } from "@reactive-resume/utils/style";
import { MISSIONS } from "./missions";
import { buildPrompt, isPrefilled, resolveAnswer, TEMPLATE_VERSION } from "./prompt";
import { useMobileChrome } from "@/features/studio/mobile-chrome";
import { useFacts } from "@/features/studio/profile";
import { copyText, studioErrorText } from "@/features/studio/shared";
import { orpc } from "@/libs/orpc/client";

type View = "home" | "intro" | "work" | "refine" | "result" | "launch";
const STEPS: Record<Exclude<View, "home">, [number, string]> = {
	intro: [1, "Mission introduction"],
	work: [2, "Personalize your mission"],
	refine: [3, "Coach refinement"],
	result: [4, "Review your mission"],
	launch: [5, "Launch"],
};

const timeZone = () => {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
	} catch {
		return "UTC";
	}
};

const draftKey = (id: MissionId) => `scs.lab.draft.${id}`;
const readDraft = (id: MissionId): { answers: Answers; excluded: string[] } => {
	try {
		const raw = localStorage.getItem(draftKey(id));
		if (raw) {
			const parsed = JSON.parse(raw) as { answers?: Answers; excluded?: string[] };
			return { answers: parsed.answers ?? {}, excluded: parsed.excluded ?? [] };
		}
	} catch {
		// A draft is a convenience.
	}
	return { answers: {}, excluded: [] };
};

const card = "rounded-[18px] border border-[#e8e3f5] bg-white shadow-[0_1px_2px_rgba(75,29,150,.04)]";
const primary =
	"inline-flex h-11 items-center justify-center rounded-xl bg-linear-to-b from-[#7c4df5] to-[#6c3cf1] px-5 text-[15px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,.25)_inset,0_8px_20px_-8px_rgba(108,60,241,.7)] transition hover:brightness-105 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6c3cf1]";
const secondary =
	"inline-flex h-11 items-center justify-center rounded-xl border border-[#ddd5f2] bg-white px-5 text-[15px] font-medium text-[#1a0b3b] transition hover:border-[#c4b2f5] active:scale-[.98] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6c3cf1]";
const soft =
	"inline-flex h-10 items-center justify-center rounded-xl bg-[#ede9fe] px-4 text-sm font-semibold text-[#4b1d96] transition hover:bg-[#e2dbfd] focus-visible:outline-2 focus-visible:outline-[#6c3cf1]";

function MissionIcon({ mission, size = 22 }: { mission: Mission; size?: number }) {
	return (
		<span
			aria-hidden
			className="grid size-11 shrink-0 place-items-center rounded-xl"
			style={{ background: mission.tint[0], color: mission.tint[1] }}
		>
			<svg
				width={size}
				height={size}
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth={1.7}
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<path d={mission.icon} />
			</svg>
		</span>
	);
}

export function LabPage({ initialMission }: { initialMission?: MissionId | undefined }) {
	const queryClient = useQueryClient();
	const { data: allFacts } = useFacts();
	const facts = useMemo(
		() =>
			(allFacts ?? [])
				.filter((f) => f.status === "approved")
				.map((f) => ({ id: f.id, text: f.text, category: f.category })),
		[allFacts],
	);
	const saved = useQuery(orpc.scs.missions.list.queryOptions());
	const saveMission = useMutation(orpc.scs.missions.save.mutationOptions());
	const duplicate = useMutation(orpc.scs.missions.duplicate.mutationOptions());
	const remove = useMutation(orpc.scs.missions.delete.mutationOptions());

	const [view, setView] = useState<View>(initialMission ? "intro" : "home");
	const [missionId, setMissionId] = useState<MissionId>(initialMission ?? "discover");
	const [qi, setQi] = useState(0);
	const [answers, setAnswers] = useState<Answers>(() => (initialMission ? readDraft(initialMission).answers : {}));
	const [excluded, setExcluded] = useState<Set<string>>(
		() => new Set(initialMission ? readDraft(initialMission).excluded : []),
	);
	const [prompt, setPrompt] = useState("");
	const [stale, setStale] = useState(false);
	const [savedId, setSavedId] = useState<string | undefined>();
	const [custom, setCustom] = useState("");

	const mission: Mission = MISSIONS.find((m) => m.id === missionId) ?? (MISSIONS[0] as Mission);
	const q = mission.qs[Math.min(qi, mission.qs.length - 1)] as Question;

	// On a phone the workbook takes the whole screen: the tab bar steps aside while a mission is open.
	const setHideTabs = useMobileChrome((state) => state.setHideTabs);
	useEffect(() => {
		setHideTabs(view !== "home");
		return () => setHideTabs(false);
	}, [view, setHideTabs]);

	// The draft survives a reload, per mission.
	useEffect(() => {
		if (view === "home") return;
		try {
			localStorage.setItem(draftKey(missionId), JSON.stringify({ answers, excluded: [...excluded] }));
		} catch {
			// Not saving a draft is fine.
		}
	}, [answers, excluded, missionId, view]);

	const assemble = () => buildPrompt({ mission, answers, facts, excluded, timeZone: timeZone() });
	const refreshSaved = () => queryClient.invalidateQueries({ queryKey: orpc.scs.missions.key() });
	const tell = (description: string) => toast.add({ description });
	const fail = (e: unknown) => toast.add({ type: "error", description: studioErrorText(e) });

	const open = (id: MissionId) => {
		const draft = readDraft(id);
		setMissionId(id);
		setAnswers(draft.answers);
		setExcluded(new Set(draft.excluded));
		setQi(0);
		setPrompt("");
		setStale(false);
		setSavedId(undefined);
		setView("intro");
	};

	const answerOf = (question: Question) => resolveAnswer(question, answers, facts, excluded);
	const setAnswer = (id: string, value: string | string[]) => setAnswers((a) => ({ ...a, [id]: value }));
	const current = answerOf(q);
	const filled = Array.isArray(current) ? current.length > 0 : current.trim().length > 0;

	const next = () => {
		setCustom("");
		if (qi < mission.qs.length - 1) setQi(qi + 1);
		else setView("refine");
	};
	const back = () => {
		setCustom("");
		if (view === "refine") {
			setView("work");
			setQi(mission.qs.length - 1);
		} else if (qi > 0) setQi(qi - 1);
		else setView("intro");
	};

	const generate = () => {
		setPrompt(assemble());
		setStale(false);
		setView("result");
	};

	const copyPrompt = async (text: string, done = "Prompt copied") => {
		tell((await copyText(text)) ? done : "Couldn't copy. Select the text and copy it by hand.");
	};
	const launch = async (url: string, where: string) => {
		await copyPrompt(prompt, `Prompt copied. Paste it into ${where}`);
		window.open(url, "_blank", "noopener,noreferrer");
	};

	const save = () =>
		saveMission.mutate(
			{
				...(savedId ? { id: savedId } : {}),
				missionId,
				name: mission.name,
				answers,
				prompt: prompt || assemble(),
				templateVersion: TEMPLATE_VERSION,
				selectedFactIds: facts.filter((f) => !excluded.has(f.id)).map((f) => f.id),
			},
			{
				onSuccess: async (row) => {
					setSavedId(row.id);
					await refreshSaved();
					tell("Mission saved to My missions");
				},
				onError: fail,
			},
		);

	const openSaved = (m: NonNullable<typeof saved.data>[number]) => {
		const id = m.missionId as MissionId;
		const keep = new Set(m.selectedFactIds);
		setMissionId(id);
		setAnswers(m.answers);
		setExcluded(new Set(facts.filter((f) => !keep.has(f.id)).map((f) => f.id)));
		setPrompt(m.prompt);
		setStale(false);
		setSavedId(m.id);
		setQi(0);
		setView("result");
	};

	const toggleFact = (id: string) => {
		setExcluded((prev) => {
			const nextSet = new Set(prev);
			if (nextSet.has(id)) nextSet.delete(id);
			else nextSet.add(id);
			return nextSet;
		});
		if (prompt) setStale(true);
	};

	// ---------- Home ----------
	if (view === "home")
		return (
			<div className="mt-6 grid gap-8">
				<ul className="grid gap-4 xl:grid-cols-2">
					{MISSIONS.map((m) => (
						<li key={m.id} className={cn(card, "flex flex-col gap-4 p-6")}>
							<div className="flex items-center gap-3">
								<MissionIcon mission={m} />
								<div>
									<p className="text-[11px] font-bold tracking-[.08em] text-[#6b6585]">MISSION {m.num}</p>
									<h2 className="text-xl font-bold tracking-tight text-[#1a0b3b]">{m.name}</h2>
								</div>
							</div>
							<p className="text-[15px] text-[#4a4466]">{m.sub}</p>
							<div className="rounded-xl bg-[#f8f6ff] p-4 text-[14px] leading-6 text-[#4a4466]">
								<p>
									<strong className="text-[#1a0b3b]">You get:</strong> {m.output}
								</p>
								<p className="mt-1 text-[13px] text-[#6b6585]">{m.needs}</p>
							</div>
							<div className="mt-auto flex flex-wrap gap-2">
								<button type="button" className={primary} onClick={() => open(m.id)}>
									Start mission
								</button>
								<a className={secondary} href={`/dashboard/chat?mission=${m.id}`}>
									Use in chat
								</a>
							</div>
						</li>
					))}
				</ul>

				<section aria-labelledby="my-missions">
					<h2 id="my-missions" className="text-xl font-bold tracking-tight text-[#1a0b3b]">
						My missions
					</h2>
					{saved.isPending ? (
						<p className="mt-3 text-sm text-[#6b6585]">Loading…</p>
					) : !saved.data?.length ? (
						<p className="mt-3 rounded-2xl border border-dashed border-[#ddd5f2] p-8 text-center text-[15px] text-[#6b6585]">
							Missions you save will show up here, ready to edit and run again.
						</p>
					) : (
						<ul className="mt-3 grid gap-2">
							{saved.data.map((m) => {
								const def = MISSIONS.find((x) => x.id === m.missionId);
								return (
									<li key={m.id} className={cn(card, "flex flex-wrap items-center gap-3 p-4")}>
										<div className="min-w-0 flex-1">
											<p className="truncate font-semibold text-[#1a0b3b]">{m.name}</p>
											<p className="text-[13px] text-[#6b6585]">
												{def ? `Mission ${def.num}` : "Mission"} · updated {new Date(m.updatedAt).toLocaleDateString()}
												{m.templateVersion < TEMPLATE_VERSION ? " · made from an older template" : ""}
											</p>
										</div>
										<div className="flex flex-wrap gap-2">
											<button type="button" className={soft} onClick={() => openSaved(m)}>
												Open
											</button>
											<button type="button" className={soft} onClick={() => void copyPrompt(m.prompt)}>
												Copy
											</button>
											<button
												type="button"
												className={soft}
												disabled={duplicate.isPending}
												onClick={() =>
													duplicate.mutate({ id: m.id }, { onSuccess: () => void refreshSaved(), onError: fail })
												}
											>
												Duplicate
											</button>
											<button
												type="button"
												className="inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold text-[#b42318] hover:bg-[#fef3f2]"
												onClick={() =>
													remove.mutate({ id: m.id }, { onSuccess: () => void refreshSaved(), onError: fail })
												}
											>
												Delete
											</button>
										</div>
									</li>
								);
							})}
						</ul>
					)}
				</section>
			</div>
		);

	// ---------- The five steps ----------
	const [stepNo, stepName] = STEPS[view];
	const options = q.facts ? facts.map((f) => f.text) : (q.opts ?? []);
	const chosen = Array.isArray(current) ? current : [];
	const extra = q.type === "multi" ? chosen.filter((c) => !options.includes(c)) : [];

	return (
		<div className={cn("mt-6 max-w-[780px]", (view === "work" || view === "refine") && "max-md:pb-24")}>
			<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
				<button type="button" className="font-semibold text-[#6c3cf1] hover:underline" onClick={() => setView("home")}>
					← Career Lab
				</button>
				<span className="text-[#6b6585]">
					Step {stepNo} of 5 — {stepName}
				</span>
			</div>
			<div
				className="mt-3 h-1 overflow-hidden rounded-full bg-[#e8e3f5]"
				role="progressbar"
				aria-valuemin={1}
				aria-valuemax={5}
				aria-valuenow={stepNo}
				aria-label="Mission progress"
			>
				<div
					className="h-full rounded-full bg-[#6c3cf1] transition-[width] duration-300"
					style={{ width: `${(stepNo / 5) * 100}%` }}
				/>
			</div>

			{view === "intro" && (
				<section className={cn(card, "mt-5 p-8")} aria-labelledby="intro-title">
					<div className="flex items-center gap-3">
						<MissionIcon mission={mission} />
						<h2 id="intro-title" className="text-[28px] font-bold tracking-tight text-[#1a0b3b]">
							{mission.name}
						</h2>
					</div>
					<p className="mt-3 text-[17px] text-[#1a0b3b]">{mission.intro}</p>
					<dl className="mt-5 divide-y divide-[#efebfa] rounded-xl border border-[#efebfa] text-[15px]">
						{[
							["Expected output", mission.output],
							["What we need", mission.need],
							["Where you run it", mission.tools],
							["Permissions", mission.perm],
						].map(([term, text]) => (
							<div key={term} className="grid gap-1 p-4 sm:grid-cols-[160px_1fr] sm:gap-4">
								<dt className="font-semibold text-[#1a0b3b]">{term}</dt>
								<dd className="text-[#4a4466]">{text}</dd>
							</div>
						))}
					</dl>
					<button type="button" className={cn(primary, "mt-6")} onClick={() => setView("work")}>
						Let's build my mission
					</button>
				</section>
			)}

			{view === "work" && (
				<section className={cn(card, "mt-5 p-8")} aria-labelledby="q-title">
					<p className="flex flex-wrap items-center gap-2 text-[13px] text-[#6b6585]">
						Question {Math.min(qi, mission.qs.length - 1) + 1} of {mission.qs.length}
						{isPrefilled(q, answers) && (
							<span className="rounded-full bg-[#ede9fe] px-2.5 py-0.5 text-xs font-semibold text-[#4b1d96]">
								From your career profile
							</span>
						)}
						{q.opt && <span className="rounded-full bg-[#f3efff] px-2.5 py-0.5 text-xs text-[#6b6585]">Optional</span>}
					</p>
					<h2 id="q-title" className="mt-2 text-[22px] leading-tight font-bold tracking-tight text-[#1a0b3b]">
						{q.q}
					</h2>
					{q.hint && <p className="mt-1.5 text-[14px] text-[#6b6585]">{q.hint}</p>}

					<div className="mt-4">
						{q.type === "text" && (
							<Input
								aria-labelledby="q-title"
								className="h-12 rounded-xl border-[#ddd5f2] text-base"
								value={typeof current === "string" ? current : ""}
								onChange={(e) => setAnswer(q.id, e.target.value)}
							/>
						)}
						{(q.type === "area" || q.type === "file") && (
							<Textarea
								aria-labelledby="q-title"
								rows={q.type === "file" ? 6 : 4}
								maxLength={q.type === "file" ? 1500 : 800}
								placeholder={q.type === "file" ? "Paste a writing sample here (optional)" : ""}
								className="rounded-xl border-[#ddd5f2] text-base"
								value={typeof current === "string" ? current : ""}
								onChange={(e) => setAnswer(q.id, e.target.value)}
							/>
						)}
						{q.type === "time" && (
							<div className="flex flex-wrap items-center gap-3">
								<Input
									aria-labelledby="q-title"
									type="time"
									className="h-12 w-40 rounded-xl border-[#ddd5f2] text-base"
									value={typeof current === "string" ? current : ""}
									onChange={(e) => setAnswer(q.id, e.target.value)}
								/>
								<span className="text-sm text-[#6b6585]">{timeZone()}</span>
							</div>
						)}
						{(q.type === "single" || q.type === "multi") && (
							<div
								role={q.type === "single" ? "radiogroup" : "group"}
								aria-labelledby="q-title"
								className="flex flex-wrap gap-2.5"
							>
								{[...options, ...extra].map((o) => {
									const on = q.type === "multi" ? chosen.includes(o) : current === o;
									return (
										<button
											key={o}
											type="button"
											role={q.type === "single" ? "radio" : undefined}
											aria-checked={q.type === "single" ? on : undefined}
											aria-pressed={q.type === "multi" ? on : undefined}
											className={cn(
												"rounded-full border-[1.5px] px-[18px] py-[11px] text-[15px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6c3cf1]",
												on
													? "border-[#6c3cf1] bg-[#f3efff] text-[#4b1d96]"
													: "border-[#ddd5f2] bg-white text-[#1a0b3b] hover:border-[#c4b2f5]",
											)}
											onClick={() =>
												setAnswer(q.id, q.type === "multi" ? (on ? chosen.filter((x) => x !== o) : [...chosen, o]) : o)
											}
										>
											{o}
										</button>
									);
								})}
								{q.facts && facts.length === 0 && (
									<p className="text-sm text-[#6b6585]">
										No verified facts yet. Chat with your career coach to add some, or add your own below.
									</p>
								)}
							</div>
						)}
						{q.type === "multi" && (
							<form
								className="mt-3 flex gap-2"
								onSubmit={(e) => {
									e.preventDefault();
									const value = custom.trim();
									if (value && !chosen.includes(value)) setAnswer(q.id, [...chosen, value]);
									setCustom("");
								}}
							>
								<Input
									aria-label="Add your own"
									className="h-10 max-w-sm rounded-xl border-[#ddd5f2]"
									placeholder="Add your own…"
									maxLength={200}
									value={custom}
									onChange={(e) => setCustom(e.target.value)}
								/>
								<button type="submit" className={soft} disabled={!custom.trim()}>
									Add
								</button>
							</form>
						)}
					</div>

					<div className="mt-6 flex flex-wrap gap-2 max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-40 max-md:border-t max-md:border-[#e8e3f5] max-md:bg-white max-md:p-3 max-md:pb-[calc(12px+env(safe-area-inset-bottom))] max-md:[&>*]:flex-1">
						<button type="button" className={secondary} onClick={back}>
							Back
						</button>
						{q.opt && !filled ? (
							<button type="button" className={primary} onClick={next}>
								Skip
							</button>
						) : (
							<button type="button" className={primary} disabled={!q.opt && !filled} onClick={next}>
								{qi === mission.qs.length - 1 ? "Continue" : "Next"}
							</button>
						)}
					</div>
				</section>
			)}

			{view === "refine" && (
				<section className={cn(card, "mt-5 p-8")} aria-labelledby="refine-title">
					<div className="flex items-start gap-3">
						<span
							aria-hidden
							className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-linear-to-b from-[#7c4df5] to-[#6c3cf1] text-white"
						>
							<svg
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth={1.7}
								strokeLinecap="round"
								strokeLinejoin="round"
							>
								<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
							</svg>
						</span>
						<div>
							<h2 id="refine-title" className="text-lg font-bold text-[#1a0b3b]">
								A few quick things from your career coach
							</h2>
							<p className="text-sm text-[#6b6585]">
								I've used your verified profile and answers. Three details would make this sharper. Skip any you like.
							</p>
						</div>
					</div>
					<div className="mt-5 grid gap-4">
						{mission.follow.map((text, i) => (
							<div key={text} className="grid gap-1.5">
								<label htmlFor={`f${i}`} className="text-[15px] font-semibold text-[#1a0b3b]">
									{text}
								</label>
								<Input
									id={`f${i}`}
									maxLength={400}
									className="h-12 rounded-xl border-[#ddd5f2] text-base"
									value={String(answers[`f${i}`] ?? "")}
									onChange={(e) => setAnswer(`f${i}`, e.target.value)}
								/>
							</div>
						))}
					</div>
					<div className="mt-6 flex flex-wrap gap-2 max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-40 max-md:border-t max-md:border-[#e8e3f5] max-md:bg-white max-md:p-3 max-md:pb-[calc(12px+env(safe-area-inset-bottom))] max-md:[&>*]:flex-1">
						<button type="button" className={secondary} onClick={back}>
							Back
						</button>
						<button type="button" className={primary} onClick={generate}>
							Generate my mission
						</button>
					</div>
				</section>
			)}

			{view === "result" && (
				<section className={cn(card, "mt-5 p-8")} aria-labelledby="result-title">
					<h2 id="result-title" className="text-[28px] font-bold tracking-tight text-[#1a0b3b]">
						Your mission is ready
					</h2>
					<p className="mt-1 text-[15px] text-[#6b6585]">
						Review and edit anything. Nothing leaves this app until you paste it into ChatGPT or Claude yourself.
					</p>
					{stale && (
						<p
							role="status"
							className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#f5e3b5] bg-[#fff8e8] p-3 text-sm text-[#7a4f00]"
						>
							You changed what's included. The prompt below is out of date.
							<button type="button" className="font-semibold underline" onClick={generate}>
								Regenerate it
							</button>
						</p>
					)}
					<label htmlFor="prompt-text" className="sr-only">
						Your mission prompt
					</label>
					<Textarea
						id="prompt-text"
						rows={14}
						className="mt-4 rounded-xl border-[#e8e3f5] bg-[#fbfaff] font-mono text-xs leading-[1.7]"
						value={prompt}
						maxLength={14000}
						onChange={(e) => setPrompt(e.target.value)}
					/>
					<fieldset className="mt-4">
						<legend className="text-sm">
							<strong className="text-[#1a0b3b]">Private details included</strong>
							<span className="text-[#6b6585]"> · untick anything you'd rather leave out</span>
						</legend>
						{facts.length === 0 ? (
							<p className="mt-2 text-sm text-[#6b6585]">
								No verified facts are included. Chat with your career coach to add some.
							</p>
						) : (
							<ul className="mt-2 grid gap-2">
								{facts.map((f) => (
									<li key={f.id}>
										<label className="flex items-center gap-2.5 text-[15px]">
											<input
												type="checkbox"
												className="size-[18px] accent-[#6c3cf1]"
												checked={!excluded.has(f.id)}
												onChange={() => toggleFact(f.id)}
											/>
											{f.text}
										</label>
									</li>
								))}
							</ul>
						)}
					</fieldset>
					<div className="mt-6 flex flex-wrap gap-2">
						<button
							type="button"
							className={primary}
							onClick={() => {
								void copyPrompt(prompt);
								setView("launch");
							}}
						>
							Copy prompt
						</button>
						<button type="button" className={secondary} disabled={saveMission.isPending} onClick={save}>
							{saveMission.isPending ? "Saving…" : savedId ? "Update saved mission" : "Save mission"}
						</button>
						<button
							type="button"
							className={secondary}
							onClick={() => {
								setPrompt(assemble());
								setStale(false);
								tell("Prompt regenerated from your answers");
							}}
						>
							Regenerate
						</button>
						<button
							type="button"
							className={secondary}
							onClick={() => {
								setQi(0);
								setView("work");
							}}
						>
							Edit answers
						</button>
					</div>
					<div className="mt-3 flex flex-wrap gap-2">
						<button type="button" className={soft} onClick={() => void launch("https://chatgpt.com/", "ChatGPT")}>
							Open ChatGPT
						</button>
						<button type="button" className={soft} onClick={() => void launch("https://claude.ai/", "Claude")}>
							Open Claude
						</button>
					</div>
				</section>
			)}

			{view === "launch" && (
				<section className={cn(card, "mt-5 p-8")} aria-labelledby="launch-title">
					<h2 id="launch-title" className="text-[28px] font-bold tracking-tight text-[#1a0b3b]">
						Prompt copied
					</h2>
					<p className="mt-2 text-[17px] text-[#1a0b3b]">
						Open ChatGPT or Claude, paste your mission, and send. Your AI takes it from there.
					</p>
					<p className="mt-3 rounded-xl bg-[#f8f6ff] p-4 text-[14px] leading-6 text-[#4a4466]">
						Nothing is pasted or controlled automatically. We can't see your AI account, run searches for you or send
						anything. {mission.perm}
					</p>
					<div className="mt-6 flex flex-wrap gap-2">
						<button type="button" className={primary} onClick={() => void launch("https://chatgpt.com/", "ChatGPT")}>
							Open ChatGPT
						</button>
						<button type="button" className={primary} onClick={() => void launch("https://claude.ai/", "Claude")}>
							Open Claude
						</button>
						<button type="button" className={secondary} onClick={() => setView("result")}>
							Back to my mission
						</button>
						<button type="button" className={secondary} disabled={saveMission.isPending} onClick={save}>
							{savedId ? "Update saved mission" : "Save mission"}
						</button>
					</div>
				</section>
			)}
		</div>
	);
}
