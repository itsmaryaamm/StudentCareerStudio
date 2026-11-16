import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "./-components/app-shell";
import { OnboardingChat } from "@/features/studio/coach/onboarding-chat";
import { SideCoach } from "@/features/studio/coach/side-coach";
import { LoadingBlock, useStudioState } from "@/features/studio/shared";
import { createNoindexFollowMeta } from "@/libs/seo";

export const Route = createFileRoute("/dashboard")({
	component: RouteComponent,
	beforeLoad: ({ context, location }) => {
		if (!context.session) throw redirect({ to: "/auth/login", search: { callbackURL: location.href }, replace: true });
		return { session: context.session };
	},
	head: () => ({
		meta: [createNoindexFollowMeta()],
	}),
});

function RouteComponent() {
	const { session } = Route.useRouteContext();
	const { data: state, isPending } = useStudioState();
	// First sign-in: nothing but the coach conversation until it has walked them through getting started.
	if (isPending)
		return (
			<div className="mx-auto max-w-2xl p-6">
				<LoadingBlock rows={3} label="Loading" />
			</div>
		);
	if (state && !state.onboardedAt) return <OnboardingChat key={session.user.id} />;
	return (
		<AppShell key={session.user.id}>
			<SideCoach>
				<Outlet />
			</SideCoach>
		</AppShell>
	);
}
