import { createFileRoute, redirect } from "@tanstack/react-router";

// Career Prompts became the Career Lab; old links and bookmarks land there.
export const Route = createFileRoute("/dashboard/prompts")({
	beforeLoad: () => {
		throw redirect({ to: "/dashboard/lab", replace: true });
	},
});
