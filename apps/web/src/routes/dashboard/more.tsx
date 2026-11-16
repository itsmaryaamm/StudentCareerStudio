import { createFileRoute } from "@tanstack/react-router";
import { Page, PageBody, RootHeader } from "@/components/calm/page";
import { PhoneHeaderActions } from "@/components/layout/phone-header-actions";
import { MoreScreen } from "@/features/studio/more";
import { getPageTitle } from "@/libs/seo";

export const Route = createFileRoute("/dashboard/more")({
	head: () => ({ meta: [{ title: getPageTitle("More") }] }),
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<Page>
			<PageBody>
				<RootHeader title="More" actions={<PhoneHeaderActions />} />
				<MoreScreen />
			</PageBody>
		</Page>
	);
}
