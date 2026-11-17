import { createFileRoute } from "@tanstack/react-router";
import { ThankYou } from "@/features/studio/thanks";
import { getPageTitle } from "@/libs/seo";

export const Route = createFileRoute("/thanks")({
	head: () => ({ meta: [{ title: getPageTitle("Thank you") }, { name: "robots", content: "noindex" }] }),
	component: ThankYou,
});
