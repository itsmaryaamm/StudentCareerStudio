import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Badge } from "@reactive-resume/ui/components/badge";
import { Button } from "@reactive-resume/ui/components/button";
import { EmptyState } from "@reactive-resume/ui/components/empty-state";
import { Input } from "@reactive-resume/ui/components/input";
import { toast } from "@reactive-resume/ui/components/toast";
import { ErrorBlock, LoadingBlock, studioErrorText } from "./shared";
import { orpc } from "@/libs/orpc/client";

type Fact = {
	id: string;
	category: string;
	text: string;
	status: "proposed" | "approved" | "rejected";
	source: string;
};

const CATEGORY_LABEL: Record<string, string> = {
	education: "Education",
	experience: "Experience",
	project: "Project",
	skill: "Skills",
	achievement: "Achievement",
	volunteering: "Volunteering",
	certification: "Certification",
	language: "Languages",
	goal: "Goal",
	other: "Other",
};

export function useFacts() {
	return useQuery(orpc.scs.facts.list.queryOptions());
}

function useFactMutations() {
	const queryClient = useQueryClient();
	const refresh = () =>
		Promise.all([
			queryClient.invalidateQueries({ queryKey: orpc.scs.facts.key() }),
			queryClient.invalidateQueries({ queryKey: orpc.scs.state.key() }),
		]);
	const onError = (error: unknown) =>
		toast.add({ type: "error", description: studioErrorText(error, "Couldn't update your profile.") });
	return {
		approve: useMutation({ ...orpc.scs.facts.approve.mutationOptions(), onSuccess: refresh, onError }),
		reject: useMutation({ ...orpc.scs.facts.reject.mutationOptions(), onSuccess: refresh, onError }),
		edit: useMutation({ ...orpc.scs.facts.edit.mutationOptions(), onSuccess: refresh, onError }),
		remove: useMutation({ ...orpc.scs.facts.delete.mutationOptions(), onSuccess: refresh, onError }),
		add: useMutation({ ...orpc.scs.facts.add.mutationOptions(), onSuccess: refresh, onError }),
		importResumes: useMutation({
			...orpc.scs.facts.importFromResumes.mutationOptions(),
			onSuccess: async (result) => {
				await refresh();
				toast.add({
					description:
						result.resumesRead === 0
							? "You have no résumés yet. Create or import one first."
							: result.proposed.length
								? `Found ${result.proposed.length} ${result.proposed.length === 1 ? "item" : "items"} in your résumés to review.`
								: "Nothing new to add from your résumés.",
				});
			},
			onError,
		}),
	};
}

export function FactCard({ fact }: { fact: Fact }) {
	const m = useFactMutations();
	const [editing, setEditing] = useState(false);
	const [text, setText] = useState(fact.text);
	const busy = m.approve.isPending || m.reject.isPending || m.edit.isPending || m.remove.isPending;
	const proposed = fact.status === "proposed";

	return (
		<li
			className={
				proposed
					? "rounded-lg border border-warn-soft bg-warn-soft/40 p-3"
					: "rounded-lg border border-line bg-raised p-3"
			}
		>
			<div className="flex items-center gap-2">
				<Badge variant={proposed ? "warn" : "accent"}>{proposed ? "Verify before saving" : "Verified"}</Badge>
				<span className="text-xs text-ink-3">{CATEGORY_LABEL[fact.category] ?? "Other"}</span>
			</div>
			{editing ? (
				<form
					className="mt-2 flex flex-col gap-2 sm:flex-row"
					onSubmit={(event) => {
						event.preventDefault();
						m.edit.mutate({ id: fact.id, text }, { onSuccess: () => setEditing(false) });
					}}
				>
					<Input
						aria-label="Edit this profile item"
						value={text}
						maxLength={300}
						onChange={(e) => setText(e.target.value)}
					/>
					<div className="flex gap-2">
						<Button type="submit" size="sm" disabled={busy || text.trim().length < 3}>
							Save
						</Button>
						<Button
							type="button"
							size="sm"
							variant="secondary"
							onClick={() => {
								setText(fact.text);
								setEditing(false);
							}}
						>
							Cancel
						</Button>
					</div>
				</form>
			) : (
				<p className="mt-1.5 text-sm [overflow-wrap:anywhere] text-ink">{fact.text}</p>
			)}
			{!editing && (
				<div className="mt-2 flex flex-wrap gap-2">
					{proposed ? (
						<>
							<Button size="sm" disabled={busy} onClick={() => m.approve.mutate({ id: fact.id })}>
								Save to profile
							</Button>
							<Button size="sm" variant="secondary" disabled={busy} onClick={() => m.reject.mutate({ id: fact.id })}>
								Discard
							</Button>
						</>
					) : (
						<Button size="sm" variant="ghost" disabled={busy} onClick={() => m.remove.mutate({ id: fact.id })}>
							Remove
						</Button>
					)}
					<Button size="sm" variant="ghost" disabled={busy} onClick={() => setEditing(true)}>
						Edit
					</Button>
				</div>
			)}
		</li>
	);
}

/** The student's shared career profile: what the coach, LinkedIn Studio and the prompt builder all read from. */
export function ProfilePanel({
	showImport = true,
	hideProposed = false,
}: {
	showImport?: boolean;
	hideProposed?: boolean;
}) {
	const { data, isPending, error, refetch } = useFacts();
	const m = useFactMutations();
	const [draft, setDraft] = useState("");

	if (isPending) return <LoadingBlock rows={3} label="Loading your profile" />;
	if (error || !data)
		return <ErrorBlock error={error} onRetry={() => void refetch()} title="Couldn't load your profile" />;

	const proposed = hideProposed ? [] : data.filter((f) => f.status === "proposed");
	const approved = data.filter((f) => f.status === "approved");

	return (
		<section aria-labelledby="profile-title" className="grid gap-3">
			<div className="flex items-center justify-between gap-2">
				<h2 id="profile-title" className="text-base font-semibold">
					Your career profile
				</h2>
				<span className="text-xs text-ink-3">{approved.length} verified</span>
			</div>
			{showImport && (
				<Button
					variant="secondary"
					size="sm"
					className="w-fit"
					disabled={m.importResumes.isPending}
					aria-busy={m.importResumes.isPending}
					onClick={() => m.importResumes.mutate({})}
				>
					{m.importResumes.isPending ? "Reading your résumés…" : "Add from my résumés"}
				</Button>
			)}
			{proposed.length > 0 && (
				<div>
					<h3 className="mb-1.5 text-[13px] font-semibold text-warn-text">To review ({proposed.length})</h3>
					<ul className="grid gap-2">
						{proposed.map((f) => (
							<FactCard key={f.id} fact={f} />
						))}
					</ul>
				</div>
			)}
			{approved.length > 0 ? (
				<ul className="grid gap-2">
					{approved.map((f) => (
						<FactCard key={f.id} fact={f} />
					))}
				</ul>
			) : (
				proposed.length === 0 &&
				!data.some((f) => f.status === "proposed") && (
					<EmptyState
						title="Your profile is empty"
						description="Chat with the coach, upload a résumé, or add something you've done. Only what you approve is used."
					/>
				)
			)}
			<form
				className="flex gap-2"
				onSubmit={(event) => {
					event.preventDefault();
					m.add.mutate({ category: "other", text: draft }, { onSuccess: () => setDraft("") });
				}}
			>
				<Input
					aria-label="Add something you've done"
					placeholder="Add something you've done…"
					value={draft}
					maxLength={300}
					onChange={(e) => setDraft(e.target.value)}
				/>
				<Button type="submit" variant="secondary" disabled={draft.trim().length < 3 || m.add.isPending}>
					Add
				</Button>
			</form>
		</section>
	);
}
