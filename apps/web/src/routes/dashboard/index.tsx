import { createFileRoute, redirect } from "@tanstack/react-router";
import { legacyDocumentsSearch } from "./-documents-search";
import { Page, PageBody, RootHeader } from "@/components/calm/page";
import { PhoneHeaderActions } from "@/components/layout/phone-header-actions";
import { HomePage } from "@/features/studio/home";
import { getPageTitle } from "@/libs/seo";

export const Route = createFileRoute("/dashboard/")({
	head: () => ({ meta: [{ title: getPageTitle("Dashboard") }] }),
	// Old Documents addresses once lived on /dashboard; send them on with their search kept.
	validateSearch: (search: Record<string, unknown>) => {
		const documents = legacyDocumentsSearch(search);
		return documents ? { documents } : {};
	},
	beforeLoad: ({ search }) => {
		if (search.documents) throw redirect({ to: "/dashboard/documents", search: search.documents, replace: true });
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { session } = Route.useRouteContext();
	const firstName = session.user.name.split(" ")[0] ?? "there";
	return (
		<Page>
			<PageBody>
				<RootHeader
					title={`Welcome, ${firstName}`}
					subtitle="Tell your story once. We'll use it for your résumé and LinkedIn."
					actions={<PhoneHeaderActions />}
				/>
				<HomePage />
			</PageBody>
		</Page>
	);
}
