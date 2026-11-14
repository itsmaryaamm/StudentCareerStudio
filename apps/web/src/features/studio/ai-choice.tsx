import { useQuery } from "@tanstack/react-query";
import { Badge } from "@reactive-resume/ui/components/badge";
import { Meter, useStudioState } from "./shared";
import { AiSettings } from "@/features/settings/ai/page";
import { orpc } from "@/libs/orpc/client";

/** Settings → AI: use the app's free AI (limited), or connect your own key (no limits from us). */
export function AiChoice() {
	const { data } = useStudioState();
	// Keep the provider list warm so the card flips as soon as a connection is tested and saved.
	useQuery(orpc.aiProviders.list.queryOptions());
	const own = data?.ownAi === true;

	return (
		<div className="grid gap-6">
			<section aria-labelledby="ai-choice" className="grid gap-3 rounded-xl border border-line bg-raised p-4">
				<h2 id="ai-choice" className="text-base font-semibold">
					Which AI do you want to use?
				</h2>
				<div className="grid gap-3 md:grid-cols-2">
					<div
						className={
							own ? "rounded-lg border border-line p-3" : "rounded-lg border-2 border-accent bg-accent-soft/40 p-3"
						}
					>
						<div className="flex items-center gap-2">
							<span className="text-sm font-semibold">Use mine (free, limited)</span>
							{!own && <Badge variant="accent">In use</Badge>}
						</div>
						<p className="mt-1 text-[13px] text-ink-2">
							Student Career Studio's AI. No setup, no cost to you. Your daily allowance is limited so everyone in the
							beta gets a fair share.
						</p>
						{data && (
							<div className="mt-3 grid gap-2">
								<Meter
									used={data.usage.chat.used}
									limit={data.usage.chat.limit}
									label="Coach and LinkedIn messages today"
								/>
								<Meter
									used={data.usage.improve.used}
									limit={data.usage.improve.limit}
									label="Résumé improvements today"
								/>
								<Meter
									used={data.usage.upload.used}
									limit={data.usage.upload.limit}
									label="Document analyses (whole beta)"
								/>
							</div>
						)}
					</div>
					<div
						className={
							own ? "rounded-lg border-2 border-accent bg-accent-soft/40 p-3" : "rounded-lg border border-line p-3"
						}
					>
						<div className="flex items-center gap-2">
							<span className="text-sm font-semibold">Use my own AI (unlimited)</span>
							{own && <Badge variant="accent">In use</Badge>}
						</div>
						<p className="mt-1 text-[13px] text-ink-2">
							Connect your own key from Google AI Studio, OpenAI or another provider below. We never limit it. Your
							provider bills you or gives you its own free quota, and your text goes to that provider, not to ours.
						</p>
						{own && data?.ownAiLabel && (
							<p className="mt-2 text-[13px] font-medium text-accent-text">Connected: {data.ownAiLabel}</p>
						)}
					</div>
				</div>
				<p className="text-xs text-ink-3">
					To switch back to the free AI, turn off or remove your own connection below.
				</p>
			</section>
			<AiSettings />
		</div>
	);
}
