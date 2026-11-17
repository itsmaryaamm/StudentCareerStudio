import { createFileRoute } from "@tanstack/react-router";
import { TermsOfUse } from "@/features/studio/terms";
import { getPageTitle } from "@/libs/seo";

export const Route = createFileRoute("/terms")({
	head: () => ({ meta: [{ title: getPageTitle("Terms of use") }] }),
	component: TermsOfUse,
});
