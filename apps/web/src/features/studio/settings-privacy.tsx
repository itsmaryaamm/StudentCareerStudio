import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@reactive-resume/ui/components/button";
import { toast } from "@reactive-resume/ui/components/toast";
import { FeedbackButton } from "./feedback";
import { OwnKeyCard } from "./own-key";
import { ReferralCard } from "./referral";
import { ErrorBlock, LoadingBlock, studioErrorText, UsageCard, useStudioState } from "./shared";
import { client, orpc } from "@/libs/orpc/client";

export function PrivacySettings() {
	const { data, isPending, error, refetch } = useStudioState();
	const queryClient = useQueryClient();
	const [exporting, setExporting] = useState(false);
	const revoke = useMutation({
		...orpc.scs.revokeConsent.mutationOptions(),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: orpc.scs.state.key() });
			toast.add({ description: "AI features are off until you accept the notice again." });
		},
	});
	const accept = useMutation({
		...orpc.scs.acceptConsent.mutationOptions(),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.scs.state.key() }),
	});

	if (isPending) return <LoadingBlock rows={2} />;
	if (error || !data) return <ErrorBlock error={error} onRetry={() => void refetch()} />;

	const download = async () => {
		setExporting(true);
		try {
			const payload = await client.scs.exportData();
			const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = "student-career-studio-data.json";
			a.click();
			URL.revokeObjectURL(url);
		} catch (e) {
			toast.add({ type: "error", description: studioErrorText(e, "Couldn't prepare your download.") });
		} finally {
			setExporting(false);
		}
	};

	return (
		<div className="grid max-w-2xl gap-5">
			<section aria-labelledby="ai-priv" className="rounded-xl border border-line bg-raised p-4">
				<h2 id="ai-priv" className="text-base font-semibold">
					AI &amp; privacy
				</h2>
				<p className="mt-1 text-sm text-ink-2">
					The AI coach, LinkedIn suggestions and document analysis send your text and approved profile items to Google
					Google's AI. Uploaded files are read once and never stored.
				</p>
				<div className="mt-3 flex flex-wrap items-center gap-3">
					{data.aiConsentAt ? (
						<Button variant="secondary" disabled={revoke.isPending} onClick={() => revoke.mutate({})}>
							Turn off AI features
						</Button>
					) : (
						<Button disabled={accept.isPending} onClick={() => accept.mutate({})}>
							Turn on AI features
						</Button>
					)}
					<span className="text-[13px] text-ink-3" role="status">
						{data.aiConsentAt ? `Accepted ${new Date(data.aiConsentAt).toLocaleDateString()}` : "Currently off"}
					</span>
				</div>
				<p className="mt-3 text-sm">
					<Link to="/privacy" target="_blank" className="text-accent-text underline">
						Read the privacy notice
					</Link>
				</p>
			</section>
			<ReferralCard />
			<OwnKeyCard />
			<section aria-labelledby="my-data" className="rounded-xl border border-line bg-raised p-4">
				<h2 id="my-data" className="text-base font-semibold">
					Your data
				</h2>
				<p className="mt-1 text-sm text-ink-2">
					Download everything we hold: résumés, profile, chats and drafts. To erase it all and free your beta seat,
					delete your account in{" "}
					<Link to="/dashboard/settings/account" className="text-accent-text underline">
						Account settings
					</Link>
					.
				</p>
				<Button
					className="mt-3"
					variant="secondary"
					disabled={exporting}
					aria-busy={exporting}
					onClick={() => void download()}
				>
					{exporting ? "Preparing…" : "Download my data"}
				</Button>
			</section>
			<UsageCard />
			<section className="rounded-xl border border-line bg-raised p-4">
				<h2 className="text-base font-semibold">Feedback</h2>
				<p className="mt-1 text-sm text-ink-2">Something confusing or broken? Tell us.</p>
				<FeedbackButton variant="secondary" className="mt-3" />
			</section>
		</div>
	);
}
