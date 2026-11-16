import type { ReactNode } from "react";
import { createMemoryHistory, createRootRoute, createRouter, RouterContextProvider } from "@tanstack/react-router";

/** Links only need a router to build their hrefs, as in the prerender. */
export function withRouter(children: ReactNode) {
	const router = createRouter({
		routeTree: createRootRoute(),
		history: createMemoryHistory({ initialEntries: ["/"] }),
	});
	return <RouterContextProvider router={router}>{children}</RouterContextProvider>;
}
