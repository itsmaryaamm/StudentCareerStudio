import { createFileRoute } from "@tanstack/react-router";
import { Page, PageBody, RootHeader } from "@/components/calm/page";
import { PhoneHeaderActions } from "@/components/layout/phone-header-actions";
import { PromptsPage } from "@/features/studio/prompts";
import { getPageTitle } from "@/libs/seo";

export const Route = createFileRoute("/dashboard/prompts")({
	head: () => ({ meta: [{ title: getPageTitle("Career Prompts") }] }),
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<Page>
			<PageBody>
				<RootHeader
					title="Career Prompts"
					subtitle="Personalized prompts to paste into your own ChatGPT or Claude account."
					actions={<PhoneHeaderActions />}
				/>
				<PromptsPage />
			</PageBody>
		</Page>
	);
}
