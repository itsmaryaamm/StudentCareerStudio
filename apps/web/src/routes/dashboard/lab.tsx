import type { MissionId } from "@/features/lab/missions";
import { createFileRoute } from "@tanstack/react-router";
import { Page, PageBody, RootHeader } from "@/components/calm/page";
import { PhoneHeaderActions } from "@/components/layout/phone-header-actions";
import { LabPage } from "@/features/lab/lab-page";
import { getPageTitle } from "@/libs/seo";

const MISSIONS: MissionId[] = ["discover", "linkedin", "scout", "intel"];

export const Route = createFileRoute("/dashboard/lab")({
	head: () => ({ meta: [{ title: getPageTitle("Career Lab") }] }),
	// /dashboard/lab?mission=scout opens that mission's introduction.
	validateSearch: (search: Record<string, unknown>): { mission?: MissionId } => {
		const mission = MISSIONS.find((m) => m === search.mission);
		return mission ? { mission } : {};
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { mission } = Route.useSearch();
	return (
		<Page>
			<PageBody>
				<RootHeader
					title="Career Lab"
					subtitle="Answer a few questions. Get an AI career mission built specifically for you."
					actions={<PhoneHeaderActions />}
				/>
				<LabPage key={mission ?? "home"} initialMission={mission} />
			</PageBody>
		</Page>
	);
}
