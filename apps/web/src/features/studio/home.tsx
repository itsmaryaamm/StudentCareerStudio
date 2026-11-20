import type { IconName } from "@reactive-resume/ui/components/icon";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@reactive-resume/ui/components/button";
import { Icon } from "@reactive-resume/ui/components/icon";
import { ProfilePanel } from "./profile";
import { ErrorBlock, LoadingBlock, useStudioState } from "./shared";
import { FACTS_FOR_FULL, nextStep, storyStrength } from "./strength";
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
	const skip = useMutation({
		...orpc.scs.setOnboarding.mutationOptions(),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.scs.state.key() }),
	});

	if (isPending) return <LoadingBlock rows={3} label="Loading your dashboard" />;
	if (error || !state)
		return <ErrorBlock error={error} onRetry={() => void refetch()} title="Couldn't load your dashboard" />;

	const fresh = !state.onboardedAt && state.resumeCount === 0 && state.approvedFacts === 0;
	if (fresh) return <Onboarding onSkip={() => skip.mutate({ choice: "skip" })} />;

	const intake = (state.intake ?? {}) as {
		situation?: string;
		goal?: string;
		contact?: { email?: string; phone?: string };
	};
	const input = {
		hasGoal: Boolean(intake.goal || intake.situation),
		hasContact: Boolean(intake.contact?.email || intake.contact?.phone),
		approvedFacts: state.approvedFacts,
		resumes: state.resumeCount,
	};
	const { percent } = storyStrength(input);
	const next = nextStep(input);
	// Some of these are done before they arrive: progress that starts above zero is progress people finish.
	const steps = [
		{ done: true, label: "Create your account" },
		{ done: input.hasGoal, label: "Tell the coach your goal" },
		{ done: input.hasContact, label: "Add your contact details" },
		{ done: state.approvedFacts >= 3, label: "Add 3 things you've done" },
		{ done: state.resumeCount > 0, label: "Make your résumé" },
		{ done: state.approvedFacts >= FACTS_FOR_FULL, label: `Complete your story (${FACTS_FOR_FULL} things)` },
	];

	return (
		<div className="mt-6 grid gap-6">
			<section
				aria-labelledby="strength-title"
				className="grid gap-5 rounded-2xl border border-line bg-raised p-5 md:grid-cols-[minmax(0,1fr)_280px]"
			>
				<div className="grid content-start gap-3">
					<h2 id="strength-title" className="text-xl font-semibold">
						Your story is {percent}% ready
					</h2>
					<div
						role="progressbar"
						aria-label="How complete your story is"
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={percent}
						className="h-2.5 overflow-hidden rounded-full bg-sunken"
					>
						<div
							className="h-full rounded-full bg-accent transition-[width] duration-300"
							style={{ width: `${percent}%` }}
						/>
					</div>
					<p className="text-sm text-ink-2">
						<strong className="text-ink">{next.label}.</strong> {next.detail}
					</p>
					<div>
						<Button render={<Link to={next.to} />}>{next.cta}</Button>
					</div>
				</div>
				<ul className="grid content-start gap-1.5 text-sm">
					{steps.map((c) => (
						<li key={c.label} className="flex items-center gap-2">
							<Icon
								name={c.done ? "check-circle" : "circle"}
								size={18}
								className={c.done ? "text-accent-text" : "text-ink-3"}
							/>
							<span className={c.done ? "text-ink-3" : ""}>{c.label}</span>
						</li>
					))}
				</ul>
			</section>

			<section aria-labelledby="powers-title" className="grid gap-3">
				<h2 id="powers-title" className="text-base font-semibold">
					Your story powers all four tools
				</h2>
				<ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
					<li>
						<ActionCard
							icon="files"
							title="Résumé"
							blurb={state.resumeCount ? `${state.resumeCount} saved` : "Make or upload yours"}
							to="/dashboard/documents"
						/>
					</li>
					<li>
						<ActionCard
							icon="linkedin-logo"
							title="LinkedIn"
							blurb="Each part, written for you"
							to="/dashboard/linkedin"
						/>
					</li>
					<li>
						<ActionCard icon="compass" title="Career Lab" blurb="Quick missions, 2 minutes" to="/dashboard/lab" />
					</li>
					<li>
						<ActionCard icon="sparkle" title="Coach" blurb="Remember what you've done" to="/dashboard/chat" />
					</li>
				</ul>
			</section>

			<div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
				<div className="rounded-xl border border-line bg-raised p-4">
					<ProfilePanel />
				</div>
				<section aria-labelledby="privacy-title" className="rounded-xl border border-line bg-raised p-4">
					<h2 id="privacy-title" className="text-base font-semibold">
						Your privacy at a glance
					</h2>
					<ul className="mt-2 grid gap-1.5 text-sm text-ink-2">
						<li>Only you can see your story, résumés and chats.</li>
						<li>Nothing is saved to your profile until you approve it.</li>
						<li>The AI is Google's Gemini. It only sees what you send it.</li>
						<li>We never post or send anything for you.</li>
						<li>Download or delete everything, any time.</li>
					</ul>
					<p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
						<Link to="/dashboard/settings/privacy" className="text-accent-text underline">
							Your data and choices
						</Link>
						<a href="/privacy" className="text-accent-text underline">
							Read the full notice
						</a>
					</p>
				</section>
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
