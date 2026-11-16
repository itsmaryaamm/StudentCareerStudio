import { createFileRoute, redirect } from "@tanstack/react-router";
import { LandingPage } from "@/features/landing/page";
import { getLandingMeta } from "@/libs/seo";

// Signed-in students go straight to their dashboard; signed-out visitors get the marketing page.
export const Route = createFileRoute("/_home/")({
	beforeLoad: ({ context }) => {
		if (context.session) throw redirect({ to: "/dashboard", replace: true });
	},
	head: () => {
		const { title, description } = getLandingMeta();
		return { meta: [{ title }, { name: "description", content: description }] };
	},
	component: LandingPage,
});
