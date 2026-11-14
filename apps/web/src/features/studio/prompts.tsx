import type { PromptKind, PromptTarget } from "./prompt-builder";
import { useState } from "react";
import { Button } from "@reactive-resume/ui/components/button";
import { Input } from "@reactive-resume/ui/components/input";
import { Textarea } from "@reactive-resume/ui/components/textarea";
import { toast } from "@reactive-resume/ui/components/toast";
import { cn } from "@reactive-resume/utils/style";
import { useFacts } from "./profile";
import { buildPrompt, PROMPT_KINDS } from "./prompt-builder";
import { copyText, ErrorBlock, LoadingBlock } from "./shared";

/** Free and instant: builds a prompt from the student's own profile. No AI call, no quota. */
export function PromptsPage() {
	const { data, isPending, error, refetch } = useFacts();
	const [kind, setKind] = useState<PromptKind>("opportunities");
	const [target, setTarget] = useState<PromptTarget>("chatgpt");
	const [roles, setRoles] = useState("");
	const [locations, setLocations] = useState("");
	const [eligibility, setEligibility] = useState("");
	const [jobText, setJobText] = useState("");
	const [unticked, setUnticked] = useState<Set<string>>(new Set());

	if (isPending) return <LoadingBlock rows={3} label="Loading your profile" />;
	if (error || !data) return <ErrorBlock error={error} onRetry={() => void refetch()} />;

	const approved = data.filter((f) => f.status === "approved");
	const shared = approved.filter((f) => !unticked.has(f.id)).map((f) => f.text);
	const prompt = buildPrompt({ kind, target, facts: shared, roles, locations, eligibility, jobText });

	return (
		<div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
			<div className="grid gap-4">
				<fieldset className="grid gap-2">
					<legend className="mb-1 text-sm font-semibold">What do you need?</legend>
					<div className="grid gap-2 sm:grid-cols-3">
						{PROMPT_KINDS.map((k) => (
							<label
								key={k.kind}
								className={cn(
									"flex cursor-pointer flex-col gap-1 rounded-lg border p-3 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
									kind === k.kind ? "border-accent bg-accent-soft" : "border-line bg-raised",
								)}
							>
								<input
									type="radio"
									name="kind"
									className="sr-only"
									checked={kind === k.kind}
									onChange={() => setKind(k.kind)}
								/>
								<span className="text-sm font-semibold">{k.title}</span>
								<span className="text-[13px] text-ink-3">{k.blurb}</span>
							</label>
						))}
					</div>
				</fieldset>

				<section aria-labelledby="prefs" className="grid gap-3 rounded-xl border border-line bg-raised p-4">
					<h2 id="prefs" className="text-base font-semibold">
						Your preferences
					</h2>
					<label htmlFor="p-roles" className="grid gap-1 text-sm">
						Roles &amp; interests
						<Input
							id="p-roles"
							value={roles}
							maxLength={200}
							placeholder="e.g. data analyst, product, research"
							onChange={(e) => setRoles(e.target.value)}
						/>
					</label>
					<label htmlFor="p-loc" className="grid gap-1 text-sm">
						Location preferences
						<Input
							id="p-loc"
							value={locations}
							maxLength={200}
							placeholder="e.g. Riyadh, remote"
							onChange={(e) => setLocations(e.target.value)}
						/>
					</label>
					<label htmlFor="p-elig" className="grid gap-1 text-sm">
						Work eligibility (optional)
						<Input id="p-elig" value={eligibility} maxLength={200} onChange={(e) => setEligibility(e.target.value)} />
					</label>
					{kind === "apply" && (
						<label htmlFor="p-job" className="grid gap-1 text-sm">
							Paste the job post
							<Textarea
								id="p-job"
								rows={5}
								value={jobText}
								maxLength={6000}
								onChange={(e) => setJobText(e.target.value)}
							/>
						</label>
					)}
				</section>

				<fieldset className="grid gap-2 rounded-xl border border-line bg-raised p-4">
					<legend className="px-1 text-base font-semibold">Information included</legend>
					<p className="text-[13px] text-ink-3">Untick anything you don't want to share outside this app.</p>
					{approved.length === 0 ? (
						<p className="text-sm text-ink-2">
							Your profile is empty, so the prompt will ask the assistant to interview you first. Add facts in the coach
							for a better prompt.
						</p>
					) : (
						approved.map((f) => (
							<label key={f.id} className="flex min-h-10 items-start gap-2.5 text-sm">
								<input
									type="checkbox"
									className="mt-1 size-4 accent-[var(--accent)]"
									checked={!unticked.has(f.id)}
									onChange={(e) =>
										setUnticked((cur) => {
											const next = new Set(cur);
											if (e.target.checked) next.delete(f.id);
											else next.add(f.id);
											return next;
										})
									}
								/>
								<span className="[overflow-wrap:anywhere]">{f.text}</span>
							</label>
						))
					)}
				</fieldset>
			</div>

			<section
				aria-labelledby="out"
				className="grid gap-3 rounded-xl border border-line bg-raised p-4 lg:sticky lg:top-4"
			>
				<h2 id="out" className="text-base font-semibold">
					Your prompt
				</h2>
				<div role="radiogroup" aria-label="Where will you paste it?" className="flex gap-2">
					{(["chatgpt", "claude"] as const).map((t) => (
						<button
							key={t}
							type="button"
							role="radio"
							aria-checked={target === t}
							onClick={() => setTarget(t)}
							className={cn(
								"min-h-10 flex-1 rounded-md border text-sm",
								target === t ? "border-accent bg-accent text-on-accent" : "border-line bg-bg text-ink-2",
							)}
						>
							{t === "chatgpt" ? "ChatGPT" : "Claude"}
						</button>
					))}
				</div>
				<label htmlFor="prompt-out" className="sr-only">
					Generated prompt
				</label>
				<Textarea id="prompt-out" readOnly rows={14} value={prompt} className="font-mono text-xs" />
				<Button
					onClick={async () =>
						toast.add(
							(await copyText(prompt))
								? { description: `Copied. Paste it into ${target === "chatgpt" ? "ChatGPT" : "Claude"}.` }
								: { type: "error", description: "Couldn't copy. Select the text and copy it manually." },
						)
					}
				>
					Copy prompt
				</Button>
				<p className="text-xs text-ink-3">
					This is built on your device from your profile. It uses none of your AI messages, and nothing is sent anywhere
					until you paste it yourself.
				</p>
			</section>
		</div>
	);
}
