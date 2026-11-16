import { createFileRoute } from "@tanstack/react-router";
import { Page, PageBody, RootHeader } from "@/components/calm/page";
import { PhoneHeaderActions } from "@/components/layout/phone-header-actions";
import { ChatPage } from "@/features/studio/chat";
import { getPageTitle } from "@/libs/seo";

export const Route = createFileRoute("/dashboard/chat")({
	// /dashboard/chat?mission=scout starts a Career Lab mission in the chat.
	validateSearch: (search: Record<string, unknown>): { mission?: string } =>
		typeof search.mission === "string" ? { mission: search.mission } : {},
	head: () => ({ meta: [{ title: getPageTitle("Career Coach") }] }),
	component: RouteComponent,
});

function RouteComponent() {
	const { mission } = Route.useSearch();
	return (
		<Page>
			<PageBody>
				<RootHeader
					title="Career Coach"
					subtitle="Your career coach. It only saves what you confirm."
					actions={<PhoneHeaderActions />}
				/>
				<ChatPage mission={mission} />
			</PageBody>
		</Page>
	);
}
