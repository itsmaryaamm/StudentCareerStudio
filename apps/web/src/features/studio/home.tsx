import type { IconName } from "@reactive-resume/ui/components/icon";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@reactive-resume/ui/components/button";
import { Icon } from "@reactive-resume/ui/components/icon";
import { ProfilePanel, useFacts } from "./profile";
import { Meter, ErrorBlock, LoadingBlock, useStudioState } from "./shared";
import { useDialogStore } from "@/dialogs/store";
import { orpc } from "@/libs/orpc/client";

type Choice = "ai" | "resume" | "linkedin";

const CHOICES: { id: Choice; icon: IconName; title: string; blurb: string; to: string }[] = [
	{
		id: "ai",
		icon: "sparkle",
		title: "Start with AI",
		blurb: "Chat with a coach that helps you remember what you've done. Nothing is saved until you approve it.",
		to: "/dashboard/chat",
	},
	{
		id: "resume",
		icon: "file-arrow-up",
		title: "Import résumé",
		blurb: "Bring in a PDF, Word file or JSON résumé you already have.",
		to: "/dashboard/documents/import",
	},
	{
		id: "linkedin",
		icon: "linkedin-logo",
		title: "Import LinkedIn",
		blurb: "Use your LinkedIn data export to build your résumé and profile.",
		to: "/dashboard/documents/import",
	},
];

export function Onboarding({ onSkip }: { onSkip: () => void }) {
	const navigate = useNavigate();
	const setChoice = useMutation(orpc.scs.setOnboarding.mutationOptions());
	const openDialog = useDialogStore((s) => s.openDialog);
	const go = (c: (typeof CHOICES)[number]) =>
		setChoice.mutate({ choice: c.id }, { onSettled: () => void navigate({ to: c.to }) });

	return (
		<section aria-labelledby="onb-title" className="mt-6 grid gap-5">
			<div>
				<h2 id="onb-title" className="text-xl font-semibold">
					How would you like to start?
				</h2>
				<p className="mt-1 text-sm text-ink-3">
					Pick one. You can use the others any time, and everything you tell us feeds your résumé and LinkedIn.
				</p>
			</div>
			<ul className="grid gap-3 md:grid-cols-3">
				{CHOICES.map((c) => (
					<li key={c.id}>
						<button
							type="button"
							disabled={setChoice.isPending}
							onClick={() => go(c)}
							className="flex h-full w-full flex-col items-start gap-2 rounded-xl border border-line bg-raised p-4 text-start transition-colors hover:border-accent hover:bg-accent-soft/50 focus-visible:outline-2"
						>
							<span className="grid size-10 place-items-center rounded-lg bg-accent-soft text-accent-text">
								<Icon name={c.icon} size={20} />
							</span>
							<span className="text-base font-semibold">{c.title}</span>
							<span className="text-[13px] leading-5 text-ink-3">{c.blurb}</span>
						</button>
					</li>
				))}
			</ul>
			<div className="flex flex-wrap items-center gap-3 text-sm">
				<Button variant="secondary" onClick={() => openDialog("document.new", undefined)}>
					Create a résumé from scratch
				</Button>
				<Button variant="ghost" onClick={onSkip}>
					Skip for now
				</Button>
			</div>
		</section>
	);
}

export function HomePage() {
	const queryClient = useQueryClient();
	const { data: state, isPending, error, refetch } = useStudioState();
	const { data: facts } = useFacts();
	const openDialog = useDialogStore((s) => s.openDialog);
	const skip = useMutation({
		...orpc.scs.setOnboarding.mutationOptions(),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.scs.state.key() }),
	});

	if (isPending) return <LoadingBlock rows={3} label="Loading your dashboard" />;
	if (error || !state)
		return <ErrorBlock error={error} onRetry={() => void refetch()} title="Couldn't load your dashboard" />;

	const fresh = !state.onboardedAt && state.resumeCount === 0 && state.approvedFacts === 0;
	if (fresh) return <Onboarding onSkip={() => skip.mutate({ choice: "skip" })} />;

	const profileChecks = [
		{ done: state.approvedFacts > 0, label: "Add something you've done" },
		{ done: state.resumeCount > 0, label: "Create or import a résumé" },
		{
			done: (facts ?? []).filter((f) => f.status === "approved").length >= 5,
			label: "Verify 5 items for stronger results",
		},
	];
	const doneCount = profileChecks.filter((c) => c.done).length;

	return (
		<div className="mt-6 grid gap-6">
			<ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
				<li>
					<ActionCard
						icon="plus"
						title="Create a résumé"
						blurb="Start from a template"
						onClick={() => openDialog("document.new", undefined)}
					/>
				</li>
				<li>
					<ActionCard
						icon="file-arrow-up"
						title="Import a résumé"
						blurb="PDF, Word, JSON or LinkedIn export"
						to="/dashboard/documents/import"
					/>
				</li>
				<li>
					<ActionCard
						icon="linkedin-logo"
						title="LinkedIn Studio"
						blurb="Built from your career profile"
						to="/dashboard/linkedin"
					/>
				</li>
				<li>
					<ActionCard icon="sparkle" title="Career Coach" blurb="Uncover experiences you forgot" to="/dashboard/chat" />
				</li>
				<li>
					<ActionCard icon="chat-text" title="Career prompts" blurb="For ChatGPT or Claude" to="/dashboard/prompts" />
				</li>
				<li>
					<ActionCard
						icon="files"
						title="My résumés"
						blurb={state.resumeCount ? `${state.resumeCount} saved` : "None yet"}
						to="/dashboard/documents"
					/>
				</li>
			</ul>

			<div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
				<div className="rounded-xl border border-line bg-raised p-4">
					<ProfilePanel />
				</div>
				<div className="grid gap-4">
					<section aria-labelledby="next-title" className="rounded-xl border border-line bg-raised p-4">
						<h2 id="next-title" className="text-base font-semibold">
							Getting set up
						</h2>
						<div className="mt-2">
							<Meter used={doneCount} limit={profileChecks.length} label="Steps done" />
						</div>
						<ul className="mt-3 grid gap-1.5 text-sm">
							{profileChecks.map((c) => (
								<li key={c.label} className="flex items-center gap-2">
									<Icon
										name={c.done ? "check-circle" : "circle"}
										size={18}
										className={c.done ? "text-accent-text" : "text-ink-3"}
									/>
									<span className={c.done ? "text-ink-3 line-through" : ""}>{c.label}</span>
								</li>
							))}
						</ul>
					</section>
				</div>
			</div>
		</div>
	);
}

function ActionCard({
	icon,
	title,
	blurb,
	to,
	onClick,
}: {
	icon: IconName;
	title: string;
	blurb: string;
	to?: string;
	onClick?: () => void;
}) {
	const body = (
		<>
			<span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-text">
				<Icon name={icon} size={18} />
			</span>
			<span className="min-w-0">
				<span className="block text-sm font-semibold">{title}</span>
				<span className="block text-[13px] text-ink-3">{blurb}</span>
			</span>
		</>
	);
	const cls =
		"flex min-h-16 w-full items-center gap-3 rounded-xl border border-line bg-raised p-3 text-start transition-colors hover:border-accent hover:bg-accent-soft/40";
	return to ? (
		<Link to={to} className={cls}>
			{body}
		</Link>
	) : (
		<button type="button" onClick={onClick} className={cls}>
			{body}
		</button>
	);
}
