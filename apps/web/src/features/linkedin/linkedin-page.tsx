import type { LinkedinSectionId } from "./checks";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useRouteContext } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Textarea } from "@reactive-resume/ui/components/textarea";
import { toast } from "@reactive-resume/ui/components/toast";
import { cn } from "@reactive-resume/utils/style";
import { isImproved, LINKEDIN_SECTIONS, normalizeLinkedinUrl, runChecks } from "./checks";
import { useFacts } from "@/features/studio/profile";
import {
	ConsentGate,
	copyText,
	ErrorBlock,
	isQuotaError,
	LimitBanner,
	LoadingBlock,
	studioErrorText,
	useStudioState,
} from "@/features/studio/shared";
import { orpc } from "@/libs/orpc/client";

const MODIFIERS = [
	{ label: "More concise", instruction: "More concise" },
	{ label: "More personal", instruction: "More personal" },
	{ label: "Less corporate", instruction: "Make it less corporate" },
];

const card = "rounded-2xl border border-[#e8e3f5] bg-white shadow-[0_1px_2px_rgba(75,29,150,.04)]";
const primary =
	"inline-flex h-10 items-center justify-center rounded-xl bg-linear-to-b from-[#7c4df5] to-[#6c3cf1] px-5 text-sm font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,.25)_inset,0_8px_20px_-8px_rgba(108,60,241,.7)] transition hover:brightness-105 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6c3cf1]";
const outline =
	"inline-flex h-10 items-center justify-center rounded-xl border border-[#ddd5f2] bg-white px-4 text-sm font-medium text-[#1a0b3b] transition hover:border-[#c4b2f5] active:scale-[.98] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6c3cf1]";

type Suggestion = { text: string; basedOn: string[] };
type SaveState = "idle" | "saving" | "saved" | "error";

function initials(name: string) {
	return (
		name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((w) => w[0]?.toUpperCase())
			.join("") || "?"
	);
}

export function LinkedInPage() {
	const { session } = useRouteContext({ from: "/dashboard" });
	const queryClient = useQueryClient();
	const { data: state, isPending, error, refetch } = useStudioState();
	const saveIntake = useMutation(orpc.scs.saveIntake.mutationOptions());
	const [changing, setChanging] = useState(false);

	const link = state?.intake?.contact?.linkedin ?? "";

	if (isPending) return <LoadingBlock rows={3} label="Loading LinkedIn Studio" />;
	if (error || !state) return <ErrorBlock error={error} onRetry={() => void refetch()} />;

	const saveLink = async (url: string) => {
		await saveIntake.mutateAsync({ intake: { contact: { linkedin: url } } });
		await queryClient.invalidateQueries({ queryKey: orpc.scs.state.key() });
		setChanging(false);
	};

	if (!link || changing)
		return (
			<LinkStart
				initial={link}
				saving={saveIntake.isPending}
				onSave={saveLink}
				onCancel={link ? () => setChanging(false) : undefined}
			/>
		);

	return <Studio name={session.user.name} link={link} onChange={() => setChanging(true)} />;
}

/** Step one: the LinkedIn link. It is saved with the profile; LinkedIn can't be read from outside, so we say so. */
function LinkStart({
	initial,
	saving,
	onSave,
	onCancel,
}: {
	initial: string;
	saving: boolean;
	onSave: (url: string) => Promise<void>;
	onCancel: (() => void) | undefined;
}) {
	const [value, setValue] = useState(initial);
	const [problem, setProblem] = useState<string | null>(null);

	return (
		<section aria-labelledby="li-start" className={cn(card, "mx-auto mt-8 max-w-[560px] p-8 text-center")}>
			<span aria-hidden className="mx-auto grid size-12 place-items-center rounded-xl bg-[#dbeafe] text-[#1d4ed8]">
				<svg
					width="22"
					height="22"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth={1.7}
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="M4 4h16v16H4z M8 10v6 M8 7.5v.01 M12 16v-6 M12 12.5c0-1.5 1-2.5 2.5-2.5S17 11 17 12.5V16" />
				</svg>
			</span>
			<h2 id="li-start" className="mt-4 text-2xl font-bold tracking-tight text-[#1a0b3b]">
				Start from your LinkedIn link
			</h2>
			<p className="mt-1.5 text-[15px] text-[#6b6585]">
				Paste the link to your profile. Then improve each section with your career coach.
			</p>
			<form
				className="mt-5 flex flex-wrap gap-2"
				onSubmit={(e) => {
					e.preventDefault();
					const url = normalizeLinkedinUrl(value);
					if (!url) {
						setProblem(
							"That doesn't look like a LinkedIn profile link. It should look like linkedin.com/in/your-name.",
						);
						return;
					}
					setProblem(null);
					void onSave(url);
				}}
			>
				<label htmlFor="li-url" className="sr-only">
					Your LinkedIn profile link
				</label>
				<input
					id="li-url"
					type="text"
					inputMode="url"
					autoCapitalize="none"
					spellCheck={false}
					placeholder="linkedin.com/in/your-name"
					aria-invalid={problem ? true : undefined}
					aria-describedby={problem ? "li-problem" : undefined}
					value={value}
					onChange={(e) => setValue(e.target.value)}
					className="h-11 min-w-0 flex-1 rounded-xl border border-[#ddd5f2] px-3.5 text-base outline-none focus:border-[#6c3cf1] focus:shadow-[0_0_0_4px_#ede9fe]"
				/>
				<button type="submit" className={primary} disabled={saving || !value.trim()}>
					{saving ? "Saving…" : "Import"}
				</button>
			</form>
			{problem && (
				<p id="li-problem" role="alert" className="mt-2 text-start text-sm text-[#b42318]">
					{problem}
				</p>
			)}
			<p className="mt-4 text-sm text-[#6b6585]">
				{onCancel && (
					<>
						<button type="button" className="font-semibold text-[#6c3cf1] hover:underline" onClick={onCancel}>
							Keep my current link
						</button>
						{" · "}
					</>
				)}
				or{" "}
				<Link to="/dashboard/chat" className="font-semibold text-[#6c3cf1] hover:underline">
					chat with the coach instead
				</Link>
			</p>
			<p className="mt-5 text-xs text-[#6b6585]">
				Public information only. We never post to LinkedIn for you. LinkedIn doesn't let other apps read a profile, so
				you'll paste each section's text in the next step.
			</p>
		</section>
	);
}

function Studio({ name, link, onChange }: { name: string; link: string; onChange: () => void }) {
	const queryClient = useQueryClient();
	const { data: state } = useStudioState();
	const { data: facts } = useFacts();
	const hasFacts = (facts ?? []).some((f) => f.status === "approved");
	const drafts = useQuery(orpc.scs.linkedin.drafts.queryOptions());
	const saveDraft = useMutation(orpc.scs.linkedin.saveDraft.mutationOptions());
	const generate = useMutation(orpc.scs.linkedin.generate.mutationOptions());

	const [section, setSection] = useState<LinkedinSectionId>("headline");
	const [texts, setTexts] = useState<Partial<Record<LinkedinSectionId, string>>>({});
	const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
	const [save, setSave] = useState<SaveState>("idle");
	const dirty = useRef<Set<LinkedinSectionId>>(new Set());
	const loaded = useRef(false);

	// The saved drafts seed the editors once.
	useEffect(() => {
		if (!drafts.data || loaded.current) return;
		loaded.current = true;
		const next: Partial<Record<LinkedinSectionId, string>> = {};
		for (const s of LINKEDIN_SECTIONS) next[s.id] = drafts.data[s.id]?.content ?? "";
		setTexts(next);
	}, [drafts.data]);

	const meta = LINKEDIN_SECTIONS.find((s) => s.id === section) ?? LINKEDIN_SECTIONS[0];
	const text = texts[section] ?? "";

	// Autosave 900 ms after the student stops typing.
	useEffect(() => {
		if (!dirty.current.has(section)) return;
		setSave("saving");
		const timer = setTimeout(() => {
			saveDraft.mutate(
				{ section, content: text },
				{
					onSuccess: () => {
						dirty.current.delete(section);
						setSave("saved");
						void queryClient.invalidateQueries({ queryKey: orpc.scs.linkedin.drafts.key() });
					},
					onError: () => setSave("error"),
				},
			);
		}, 900);
		return () => clearTimeout(timer);
		// oxlint-disable-next-line react-hooks/exhaustive-deps -- the mutation object changes identity every render
	}, [text, section]);

	const edit = (value: string) => {
		dirty.current.add(section);
		setTexts((all) => ({ ...all, [section]: value }));
	};

	const improved = useMemo(() => LINKEDIN_SECTIONS.filter((s) => isImproved(s.id, texts[s.id] ?? "")).length, [texts]);
	const checks = runChecks(section, text);
	const passed = checks.filter((c) => c.ok).length;

	const own = Boolean(state?.ownKeyPreview);
	const chatLeft = state ? state.usage.chat.limit - state.usage.chat.used : 0;
	const out = !own && chatLeft <= 0;

	const run = (instruction?: string) =>
		generate.mutate(
			{ section, ...(instruction ? { instruction } : {}) },
			{
				onSuccess: (r) => {
					setSuggestions(r.suggestions);
					void queryClient.invalidateQueries({ queryKey: orpc.scs.state.key() });
				},
				onError: () => void queryClient.invalidateQueries({ queryKey: orpc.scs.state.key() }),
			},
		);

	const copy = async (value: string) =>
		toast.add(
			(await copyText(value))
				? { description: "Copied. Paste it into LinkedIn." }
				: { type: "error", description: "Couldn't copy. Select the text and copy it manually." },
		);

	if (drafts.isPending) return <LoadingBlock rows={3} label="Loading your drafts" />;
	if (drafts.error) return <ErrorBlock error={drafts.error} onRetry={() => void drafts.refetch()} />;

	return (
		<div className="mt-4 grid gap-4">
			<div className={cn(card, "flex flex-wrap items-center gap-4 px-5 py-4")}>
				<span
					aria-hidden
					className="grid size-[52px] shrink-0 place-items-center rounded-full bg-[#6c3cf1] font-semibold text-white"
				>
					{initials(name)}
				</span>
				<div className="min-w-0 flex-1 max-sm:basis-[calc(100%-72px)]">
					<p className="text-base font-semibold tracking-tight text-[#1a0b3b]">{name}</p>
					<p className="truncate text-[13px] text-[#6b6585]">{link.replace(/^https?:\/\//, "")}</p>
				</div>
				<div className="max-sm:w-full sm:text-end">
					<p className="mb-1.5 text-xs text-[#6b6585]" aria-live="polite">
						{improved} of {LINKEDIN_SECTIONS.length} sections improved
					</p>
					<div
						className="h-1.5 w-full rounded-full bg-[#ede9fe] sm:w-40"
						role="progressbar"
						aria-label="Sections improved"
						aria-valuemin={0}
						aria-valuemax={LINKEDIN_SECTIONS.length}
						aria-valuenow={improved}
					>
						<div
							className="h-full rounded-full bg-[#6c3cf1] transition-[width] duration-300"
							style={{ width: `${(improved / LINKEDIN_SECTIONS.length) * 100}%` }}
						/>
					</div>
				</div>
				<button type="button" className={outline} onClick={onChange}>
					Change link
				</button>
			</div>

			<nav aria-label="LinkedIn sections">
				<ul className="flex gap-2 overflow-x-auto pb-1 max-md:-mx-4 max-md:px-4 md:flex-wrap">
					{LINKEDIN_SECTIONS.map((s) => {
						const on = section === s.id;
						return (
							<li key={s.id} className="shrink-0">
								<button
									type="button"
									aria-current={on ? "true" : undefined}
									onClick={() => {
										setSection(s.id);
										setSuggestions([]);
										setSave("idle");
									}}
									className={cn(
										"inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6c3cf1]",
										on
											? "border-[#6c3cf1] bg-[#6c3cf1] text-white"
											: "border-[#ddd5f2] bg-white text-[#1a0b3b] hover:border-[#c4b2f5]",
									)}
								>
									{s.label}
								</button>
							</li>
						);
					})}
				</ul>
			</nav>

			<section aria-labelledby="li-editor" className={cn(card, "p-5")}>
				<div className="flex items-baseline justify-between gap-3">
					<h2 id="li-editor" className="text-base font-bold text-[#1a0b3b]">
						{meta.label}
					</h2>
					<span className="text-xs text-[#6b6585]">Your current text · editable</span>
				</div>
				<label htmlFor="li-text" className="sr-only">
					{meta.label} text
				</label>
				<Textarea
					id="li-text"
					rows={meta.rows}
					value={text}
					maxLength={meta.limit}
					placeholder={`Paste what your LinkedIn ${meta.label.toLowerCase()} says now, or write a new one.`}
					className="mt-3 rounded-xl border-[#ddd5f2] text-[15px] leading-6"
					onChange={(e) => edit(e.target.value)}
				/>
				<div className="mt-1 flex flex-wrap items-center gap-3 text-[13px] text-[#6b6585]">
					<button type="button" className={outline} disabled={!text.trim()} onClick={() => void copy(text)}>
						Copy to clipboard
					</button>
					<span>
						{text.length} / {meta.limit}
					</span>
					<span role="status" aria-live="polite" className={save === "error" ? "text-[#b42318]" : undefined}>
						{save === "saving" && "Saving…"}
						{save === "saved" && "Saved"}
						{save === "error" && "Couldn't save. Your text is still here."}
					</span>
					<span className="ms-auto">We never post to LinkedIn for you.</span>
				</div>
			</section>

			<ConsentGate>
				<section
					aria-labelledby="li-coach"
					className="rounded-2xl border border-[#ddd1fa] bg-linear-to-b from-[#f3efff] to-[#ede9fe] p-5"
				>
					<div className="flex flex-wrap items-center gap-3">
						<span
							aria-hidden
							className="grid size-9 shrink-0 place-items-center rounded-full bg-linear-to-br from-[#8b5cf6] to-[#6c3cf1] text-white"
						>
							<svg
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth={1.8}
								strokeLinejoin="round"
							>
								<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
							</svg>
						</span>
						<div className="min-w-0 flex-1">
							<h2 id="li-coach" className="text-base font-bold text-[#2a0f5e]">
								Career coach · {meta.label}
							</h2>
							<p className="text-[13px] text-[#4b3f73]" aria-live="polite">
								{passed === checks.length
									? "This section is in great shape."
									: `${passed} of ${checks.length} checks passed. Here's how I'd improve it.`}
							</p>
						</div>
						<span className="text-xs text-[#4b3f73]">
							{own ? "Using your own key" : `${Math.max(0, chatLeft)} messages left today`}
						</span>
					</div>

					<ul className="mt-4 rounded-xl bg-white px-4 py-1">
						{checks.map((c, i) => (
							<li key={c.title} className={cn("flex items-start gap-3 py-3", i > 0 && "border-t border-[#efebfa]")}>
								<span
									aria-hidden
									className={cn(
										"mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
										c.ok ? "bg-[#6c3cf1]" : "border-[1.5px] border-[#e0a526] bg-[#fff8e8]",
									)}
								>
									{c.ok && (
										<svg
											width="12"
											height="12"
											viewBox="0 0 24 24"
											fill="none"
											stroke="#fff"
											strokeWidth={3.5}
											strokeLinecap="round"
											strokeLinejoin="round"
										>
											<path d="M5 12l5 5 10-10" />
										</svg>
									)}
								</span>
								<div>
									<p className="text-sm font-semibold text-[#1a0b3b]">
										<span className="sr-only">{c.ok ? "Done: " : "To do: "}</span>
										{c.title}
									</p>
									<p className="mt-0.5 text-[13px] leading-[1.45] text-[#5e5878]">
										{c.ok ? "Done. This is already working for you." : c.tip}
									</p>
								</div>
							</li>
						))}
					</ul>

					<div className="mt-4">
						{!hasFacts ? (
							<p className="rounded-xl bg-white p-4 text-sm text-[#4b3f73]">
								Rewrites use only facts you've approved. Add some first.{" "}
								<Link to="/dashboard/chat" className="font-semibold text-[#6c3cf1] hover:underline">
									Chat with the coach
								</Link>
							</p>
						) : out ? (
							<LimitBanner />
						) : (
							<div className="flex flex-wrap gap-2">
								<button
									type="button"
									className={primary}
									disabled={generate.isPending}
									aria-busy={generate.isPending}
									onClick={() => run()}
								>
									{generate.isPending
										? "Writing…"
										: suggestions.length
											? "Rewrite again"
											: `Rewrite my ${meta.label.toLowerCase()}`}
								</button>
								{suggestions.length > 0 &&
									MODIFIERS.map((m) => (
										<button
											key={m.label}
											type="button"
											className={outline}
											disabled={generate.isPending}
											onClick={() => run(m.instruction)}
										>
											{m.label}
										</button>
									))}
							</div>
						)}
						{generate.error != null &&
							(isQuotaError(generate.error) ? (
								<LimitBanner className="mt-3" />
							) : (
								<p role="alert" className="mt-3 rounded-xl bg-white p-3 text-sm text-[#b42318]">
									{studioErrorText(generate.error)}
								</p>
							))}
						{generate.isPending && (
							<p role="status" className="mt-3 text-[13px] text-[#4b1d96]">
								Writing options from your verified facts…
							</p>
						)}
					</div>

					<ul className="mt-3 grid gap-2.5" aria-live="polite">
						{suggestions.map((s, i) => (
							<li
								key={`${i}-${s.text.slice(0, 20)}`}
								className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-white px-4 py-3.5"
							>
								<div className="min-w-0 flex-1">
									<p className="text-[14.5px] leading-[1.45] font-medium [overflow-wrap:anywhere] whitespace-pre-wrap text-[#1a0b3b]">
										{s.text}
									</p>
									{s.basedOn.length > 0 && (
										<p className="mt-1 text-xs text-[#6b6585]">Based on: {s.basedOn.join(" · ")}</p>
									)}
								</div>
								<div className="flex shrink-0 gap-2">
									<button
										type="button"
										className="inline-flex h-9 items-center rounded-lg bg-[#6c3cf1] px-4 text-[13px] font-medium text-white hover:bg-[#5b2fd8]"
										onClick={() => {
											edit(s.text);
											setSuggestions((cur) => cur.filter((_, j) => j !== i));
											toast.add({ description: `Applied to ${meta.label.toLowerCase()}` });
										}}
									>
										Use
									</button>
									<button
										type="button"
										className="inline-flex h-9 items-center rounded-lg border border-[#ddd5f2] bg-white px-4 text-[13px] hover:border-[#c4b2f5]"
										onClick={() => void copy(s.text)}
									>
										Copy
									</button>
								</div>
							</li>
						))}
					</ul>
				</section>
			</ConsentGate>
		</div>
	);
}
