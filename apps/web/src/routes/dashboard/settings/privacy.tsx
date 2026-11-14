import { createFileRoute } from "@tanstack/react-router";
import { PrivacySettings } from "@/features/studio/settings-privacy";

export const Route = createFileRoute("/dashboard/settings/privacy")({
	component: PrivacySettings,
});
