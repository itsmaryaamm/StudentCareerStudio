import { createFileRoute } from "@tanstack/react-router";
import { Page, PageBody, RootHeader } from "@/components/calm/page";
import { PhoneHeaderActions } from "@/components/layout/phone-header-actions";
import { LinkedInPage } from "@/features/linkedin/linkedin-page";
import { getPageTitle } from "@/libs/seo";

export const Route = createFileRoute("/dashboard/linkedin")({
	head: () => ({ meta: [{ title: getPageTitle("LinkedIn Studio") }] }),
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<Page>
			<PageBody>
				<RootHeader
					title="LinkedIn Studio"
					subtitle="Improve each section with your career coach, then copy it into LinkedIn. We never post for you."
					actions={<PhoneHeaderActions />}
				/>
				<LinkedInPage />
			</PageBody>
		</Page>
	);
}
