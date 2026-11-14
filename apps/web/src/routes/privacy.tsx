import { createFileRoute } from "@tanstack/react-router";
import { PrivacyNotice } from "@/features/studio/privacy";
import { getPageTitle } from "@/libs/seo";

export const Route = createFileRoute("/privacy")({
	head: () => ({ meta: [{ title: getPageTitle("Privacy notice") }] }),
	component: PrivacyNotice,
});
