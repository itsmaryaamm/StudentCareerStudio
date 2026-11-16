import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Alert } from "@reactive-resume/ui/components/alert";
import { Button } from "@reactive-resume/ui/components/button";
import { Spinner } from "@reactive-resume/ui/components/spinner";
import { Textarea } from "@reactive-resume/ui/components/textarea";
import { toast } from "@reactive-resume/ui/components/toast";
import { cn } from "@reactive-resume/utils/style";
import { ProfilePanel, useFacts } from "./profile";
import {
	ConsentGate,
	copyText,
	ErrorBlock,
	isQuotaError,
	LoadingBlock,
	studioErrorText,
	useStudioState,
} from "./shared";
import { orpc } from "@/libs/orpc/client";

export const SECTIONS = [
	{ id: "headline", label: "Headline", limit: 220 },
	{ id: "about", label: "About", limit: 2600 },
	{ id: "education", label: "Education", limit: 1000 },
	{ id: "experience", label: "Experience", limit: 1500 },
	{ id: "projects", label: "Projects", limit: 1200 },
	{ id: "volunteering", label: "Volunteering", limit: 1000 },
	{ id: "certifications", label: "Certifications", limit: 600 },
	{ id: "skills", label: "Skills", limit: 600 },
	{ id: "featured", label: "Featured", limit: 600 },
	{ id: "contact", label: "Contact & networking", limit: 500 },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

const TONES = ["Make it less corporate", "More concise", "More personal"];
type SaveState =
	| { kind: "idle" }
	| { kind: "saving" }
	| { kind: "saved"; at: string }
	| { kind: "error"; message: string };

export function LinkedInPage() {
	const [section, setSection] = useState<SectionId>("headline");
	const { data: facts } = useFacts();
	const approved = (facts ?? []).filter((f) => f.status === "approved").length;
	const drafts = useQuery(orpc.scs.linkedin.drafts.queryOptions());

	return (
		<div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
			<div className="grid gap-4">
				<div className="flex flex-wrap items-center gap-2 text-sm">
					<span className="text-ink-3">Start from:</span>
					<Button size="sm" variant="secondary" nativeButton={false} render={<Link to="/dashboard/documents" />}>
						My résumé
					</Button>
					<Button size="sm" variant="secondary" nativeButton={false} render={<Link to="/dashboard/documents/import" />}>
						Import LinkedIn data
					</Button>
					<Button size="sm" variant="secondary" nativeButton={false} render={<Link to="/dashboard/chat" />}>
						Chat with the coach
					</Button>
				</div>

				<nav aria-label="LinkedIn sections">
					<ul className="flex flex-wrap gap-2">
						{SECTIONS.map((s) => (
							<li key={s.id}>
								<button
									type="button"
									aria-current={section === s.id ? "true" : undefined}
									onClick={() => setSection(s.id)}
									className={cn(
										"min-h-10 rounded-full border px-3.5 text-sm transition-colors",
										section === s.id
											? "border-accent bg-accent text-on-accent"
											: "border-line bg-raised text-ink-2 hover:bg-hover",
									)}
								>
									{s.label}
								</button>
							</li>
						))}
					</ul>
				</nav>

				{drafts.isPending ? (
					<LoadingBlock rows={2} label="Loading your drafts" />
				) : drafts.error ? (
					<ErrorBlock error={drafts.error} onRetry={() => void drafts.refetch()} title="Couldn't load your drafts" />
				) : (
					<SectionEditor
						key={section}
						section={section}
						initial={drafts.data?.[section]?.content ?? ""}
						hasFacts={approved > 0}
					/>
				)}
			</div>
			<aside aria-label="Your career profile" className="rounded-xl border border-line bg-raised p-3">
				<ProfilePanel />
			</aside>
		</div>
	);
}

function SectionEditor({ section, initial, hasFacts }: { section: SectionId; initial: string; hasFacts: boolean }) {
	const meta = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0];
	const queryClient = useQueryClient();
	const { data: state } = useStudioState();
	const [text, setText] = useState(initial);
	const [save, setSave] = useState<SaveState>({ kind: "idle" });
	const [suggestions, setSuggestions] = useState<{ text: string; basedOn: string[] }[]>([]);
	const dirty = useRef(false);
	const saveDraft = useMutation(orpc.scs.linkedin.saveDraft.mutationOptions());
	const generate = useMutation(orpc.scs.linkedin.generate.mutationOptions());

	// Autosave 900 ms after the student stops typing; the status line says exactly what happened.
	useEffect(() => {
		if (!dirty.current) return;
		setSave({ kind: "saving" });
		const timer = setTimeout(() => {
			saveDraft.mutate(
				{ section, content: text },
				{
					onSuccess: (r) => {
						setSave({
							kind: "saved",
							at: new Date(r.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
						});
						void queryClient.invalidateQueries({ queryKey: orpc.scs.linkedin.drafts.key() });
					},
					onError: (error) =>
						setSave({
							kind: "error",
							message: studioErrorText(error, "Couldn't save. Your text is still here — we'll retry when you type."),
						}),
				},
			);
		}, 900);
		return () => clearTimeout(timer);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- mutation object identity changes every render
	}, [text, section]);

	const edit = (value: string) => {
		dirty.current = true;
		setText(value);
	};
	const chatLeft = state ? state.usage.chat.limit - state.usage.chat.used : 0;

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

	const copy = async (value: string) => {
		const ok = await copyText(value);
		toast.add(
			ok
				? { description: "Copied. Paste it into LinkedIn." }
				: { type: "error", description: "Couldn't copy. Select the text and copy it manually." },
		);
	};

	return (
		<ConsentGate>
			<section aria-labelledby="editor-title" className="grid gap-3 rounded-xl border border-line bg-raised p-4">
				<h2 id="editor-title" className="text-lg font-semibold">
					{meta.label}
				</h2>
				<label htmlFor="li-text" className="sr-only">
					{meta.label} text
				</label>
				<Textarea
					id="li-text"
					rows={section === "headline" || section === "contact" ? 3 : 8}
					value={text}
					maxLength={meta.limit}
					placeholder={`Write your ${meta.label.toLowerCase()}, or generate suggestions below.`}
					onChange={(e) => edit(e.target.value)}
				/>
				<div className="flex flex-wrap items-center gap-2">
					<Button variant="secondary" disabled={!text.trim()} onClick={() => void copy(text)}>
						Copy to clipboard
					</Button>
					<span className="text-xs text-ink-3">
						{text.length} / {meta.limit}
					</span>
					<span
						role="status"
						aria-live="polite"
						className={cn("ms-auto text-xs", save.kind === "error" ? "text-danger-text" : "text-ink-3")}
					>
						{save.kind === "saving" && "Saving…"}
						{save.kind === "saved" && `Saved at ${save.at}`}
						{save.kind === "error" && save.message}
					</span>
				</div>
				<p className="text-xs text-ink-3">
					We never post to LinkedIn for you. Copy this and paste it into your profile.
				</p>
			</section>

			<section aria-labelledby="sugg-title" className="grid gap-3 rounded-xl border border-line bg-accent-soft/50 p-4">
				<div className="flex flex-wrap items-center gap-2">
					<h2 id="sugg-title" className="text-base font-semibold text-accent-text">
						Coach suggestions
					</h2>
					<span className="ms-auto text-xs text-ink-3">
						{state ? `${Math.max(0, chatLeft)} AI messages left today` : ""}
					</span>
				</div>
				{!hasFacts ? (
					<Alert variant="info">
						<p>Suggestions are written only from facts you've approved. Add some first.</p>
						<div className="mt-2 flex gap-2">
							<Button size="sm" nativeButton={false} render={<Link to="/dashboard/chat" />}>
								Chat with the coach
							</Button>
						</div>
					</Alert>
				) : (
					<div className="flex flex-wrap gap-2">
						<Button disabled={generate.isPending || chatLeft <= 0} aria-busy={generate.isPending} onClick={() => run()}>
							{generate.isPending ? (
								<>
									<Spinner decorative /> Writing…
								</>
							) : suggestions.length ? (
								"Generate new options"
							) : (
								`Suggest a ${meta.label.toLowerCase()}`
							)}
						</Button>
						{suggestions.length > 0 &&
							TONES.map((tone) => (
								<Button
									key={tone}
									size="sm"
									variant="secondary"
									disabled={generate.isPending || chatLeft <= 0}
									onClick={() => run(tone)}
								>
									{tone}
								</Button>
							))}
					</div>
				)}
				{generate.error != null && (
					<Alert variant={isQuotaError(generate.error) ? "warn" : "error"}>{studioErrorText(generate.error)}</Alert>
				)}
				<ul className="grid gap-2" aria-live="polite">
					{suggestions.map((s, i) => (
						<li key={`${i}-${s.text.slice(0, 20)}`} className="rounded-lg border border-line bg-raised p-3">
							<p className="text-sm [overflow-wrap:anywhere] whitespace-pre-wrap">{s.text}</p>
							{s.basedOn.length > 0 && <p className="mt-1.5 text-xs text-ink-3">Based on: {s.basedOn.join(" · ")}</p>}
							<div className="mt-2 flex flex-wrap gap-2">
								<Button
									size="sm"
									onClick={() => {
										edit(s.text);
										setSuggestions((cur) => cur.filter((_, j) => j !== i));
									}}
								>
									Accept
								</Button>
								<Button
									size="sm"
									variant="secondary"
									onClick={() => setSuggestions((cur) => cur.filter((_, j) => j !== i))}
								>
									Reject
								</Button>
								<Button size="sm" variant="ghost" onClick={() => void copy(s.text)}>
									Copy
								</Button>
							</div>
						</li>
					))}
				</ul>
			</section>
		</ConsentGate>
	);
}
