import { createFileRoute } from "@tanstack/react-router";
import { CookieNotice } from "@/features/studio/cookies";
import { getPageTitle } from "@/libs/seo";

export const Route = createFileRoute("/cookies")({
	head: () => ({ meta: [{ title: getPageTitle("Cookie notice") }] }),
	component: CookieNotice,
});
