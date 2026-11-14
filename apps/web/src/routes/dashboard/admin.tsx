import { createFileRoute } from "@tanstack/react-router";
import { Page, PageBody, RootHeader } from "@/components/calm/page";
import { PhoneHeaderActions } from "@/components/layout/phone-header-actions";
import { AdminPage } from "@/features/studio/admin";
import { getPageTitle } from "@/libs/seo";

export const Route = createFileRoute("/dashboard/admin")({
	head: () => ({ meta: [{ title: getPageTitle("Beta dashboard") }] }),
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<Page>
			<PageBody>
				<RootHeader
					title="Beta dashboard"
					subtitle="Founding beta health at a glance."
					actions={<PhoneHeaderActions />}
				/>
				<AdminPage />
			</PageBody>
		</Page>
	);
}
