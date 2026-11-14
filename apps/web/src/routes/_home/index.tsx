import { createFileRoute, redirect } from "@tanstack/react-router";

// Founding beta: there is no marketing site. Signed-in students go to their dashboard, everyone else to sign in.
export const Route = createFileRoute("/_home/")({
	beforeLoad: ({ context }) => {
		throw redirect({ to: context.session ? "/dashboard" : "/auth/login", replace: true });
	},
});
