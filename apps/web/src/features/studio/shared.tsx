import { ORPCError } from "@orpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Alert } from "@reactive-resume/ui/components/alert";
import { Button } from "@reactive-resume/ui/components/button";
import { Skeleton } from "@reactive-resume/ui/components/skeleton";
import { cn } from "@reactive-resume/utils/style";
import { orpc } from "@/libs/orpc/client";

export const useStudioState = () => useQuery(orpc.scs.state.queryOptions());

/** The server's own wording is already student-friendly (quota, consent, "nothing was used"); show it. */
export function studioErrorText(error: unknown, fallback = "Something went wrong. Please try again."): string {
	if (error instanceof ORPCError) {
		if (error.code === "INTERNAL_SERVER_ERROR") return fallback;
		return error.message || fallback;
	}
	if (error instanceof TypeError || (error instanceof Error && /network|fetch/i.test(error.message)))
		return "You seem to be offline. Check your connection and try again.";
	return fallback;
}

export const isQuotaError = (error: unknown) => error instanceof ORPCError && error.code === "TOO_MANY_REQUESTS";
export const isConsentError = (error: unknown) =>
	error instanceof ORPCError && (error.data as { code?: string } | undefined)?.code === "CONSENT_REQUIRED";

/** Writes to the clipboard, falling back to a hidden textarea for browsers (and some phones) that refuse the API. */
export async function copyText(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		try {
			const area = document.createElement("textarea");
			area.value = text;
			area.setAttribute("readonly", "");
			area.style.position = "fixed";
			area.style.opacity = "0";
			document.body.append(area);
			area.select();
			const ok = document.execCommand("copy");
			area.remove();
			return ok;
		} catch {
			return false;
		}
	}
}

export function LoadingBlock({ rows = 3, label = "Loading" }: { rows?: number; label?: string }) {
	return (
		<div role="status" aria-busy="true" aria-label={label} className="grid gap-3">
			{Array.from({ length: rows }, (_, i) => (
				<Skeleton key={i} className="h-16 w-full rounded-lg" />
			))}
			<span className="sr-only">{label}…</span>
		</div>
	);
}

export function ErrorBlock({
	error,
	onRetry,
	title = "Couldn't load this",
}: {
	error: unknown;
	onRetry?: () => void;
	title?: string;
}) {
	return (
		<Alert variant="error">
			<p className="font-medium">{title}</p>
			<p>{studioErrorText(error)}</p>
			{onRetry && (
				<Button size="sm" variant="secondary" className="mt-2 w-fit" onClick={onRetry}>
					Try again
				</Button>
			)}
		</Alert>
	);
}

export function Meter({ used, limit, label }: { used: number; limit: number; label: string }) {
	const pct = limit === 0 ? 100 : Math.min(100, Math.round((used / limit) * 100));
	const left = Math.max(0, limit - used);
	return (
		<div>
			<div className="flex items-baseline justify-between text-[13px]">
				<span className="text-ink-2">{label}</span>
				<span className={cn("font-mono text-xs", left === 0 ? "text-danger-text" : "text-ink-3")}>
					{used} / {limit}
				</span>
			</div>
			<div
				role="progressbar"
				aria-label={label}
				aria-valuemin={0}
				aria-valuemax={limit}
				aria-valuenow={used}
				aria-valuetext={`${used} of ${limit} used, ${left} left`}
				className="mt-1 h-1.5 overflow-hidden rounded-full bg-sunken"
			>
				<div
					className={cn("h-full rounded-full", left === 0 ? "bg-danger-text" : "bg-accent")}
					style={{ width: `${pct}%` }}
				/>
			</div>
		</div>
	);
}

export function UsageCard({ className }: { className?: string }) {
	const { data, isPending } = useStudioState();
	return (
		<section
			aria-label="Your founding beta allowance"
			className={cn("rounded-lg border border-line bg-raised p-3", className)}
		>
			<p className="text-[13px] font-semibold text-accent-text">Founding beta · free</p>
			{isPending || !data ? (
				<Skeleton className="mt-2 h-10 w-full" />
			) : (
				<div className="mt-2 grid gap-2">
					{data.ownKeyPreview ? (
						<p className="text-[13px]">Using your own Gemini key: no daily limit from us.</p>
					) : (
						<Meter used={data.usage.chat.used} limit={data.usage.chat.limit} label="AI messages today" />
					)}
					{!data.ownKeyPreview && (
						<>
							<Meter used={data.usage.upload.used} limit={data.usage.upload.limit} label="Document analyses" />
							<p className="text-xs text-ink-3">
								Daily messages reset at midnight UTC.{" "}
								<a href="/dashboard/settings/privacy" className="text-accent-text underline">
									Use your own Gemini key
								</a>
							</p>
						</>
					)}
				</div>
			)}
		</section>
	);
}

/** The Gemini data notice. AI calls are refused by the server until it is accepted, so this is not just a banner. */
export function ConsentGate({ children }: { children: React.ReactNode }) {
	const { data, isPending, error, refetch } = useStudioState();
	const queryClient = useQueryClient();
	const accept = useMutation({
		...orpc.scs.acceptConsent.mutationOptions(),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.scs.state.key() }),
	});
	if (isPending) return <LoadingBlock rows={2} label="Loading your account" />;
	if (error || !data) return <ErrorBlock error={error} onRetry={() => void refetch()} />;
	if (!data.aiAvailable)
		return (
			<Alert variant="warn">
				<p className="font-medium">The AI coach isn't switched on yet.</p>
				<p>Everything else works. We'll tell you when the coach opens.</p>
			</Alert>
		);
	if (data.aiConsentAt) return <>{children}</>;
	return (
		<section aria-labelledby="consent-title" className="rounded-xl border border-line bg-accent-soft p-5">
			<h2 id="consent-title" className="text-base font-semibold text-accent-text">
				Before you use the AI coach
			</h2>
			<ul className="mt-2 grid list-disc gap-1.5 ps-5 text-sm text-ink-2">
				<li>
					Your messages, approved profile facts, and any file you upload are sent to Google's Gemini API to write
					replies.
				</li>
				<li>Uploaded files are read once and discarded. We never store the file itself.</li>
				<li>Nothing is added to your profile until you approve it.</li>
				<li>Don't share anything you wouldn't want processed there (ID numbers, health details, passwords).</li>
			</ul>
			<div className="mt-4 flex flex-wrap items-center gap-3">
				<Button onClick={() => accept.mutate({})} disabled={accept.isPending} aria-busy={accept.isPending}>
					{accept.isPending ? "Saving…" : "I understand — continue"}
				</Button>
				<a href="/privacy" target="_blank" rel="noreferrer" className="text-sm text-accent-text underline">
					Read the full privacy notice
				</a>
			</div>
			{accept.error && (
				<p role="alert" className="mt-2 text-sm text-danger-text">
					{studioErrorText(accept.error)}
				</p>
			)}
		</section>
	);
}

/** Milliseconds until `iso`, ticking every second. Null when there is no reset time. */
export function useCountdown(iso: string | null | undefined) {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		if (!iso) return;
		const id = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(id);
	}, [iso]);
	return iso ? Math.max(0, new Date(iso).getTime() - now) : null;
}

export function formatCountdown(ms: number) {
	const total = Math.ceil(ms / 1000);
	const h = Math.floor(total / 3600);
	const m = Math.floor((total % 3600) / 60);
	const sec = total % 60;
	if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
	return m > 0 ? `${m}m ${String(sec).padStart(2, "0")}s` : `${sec}s`;
}

/**
 * Shown when the day's free messages are used up: a live countdown to the reset, and the way to skip the wait.
 * When the countdown ends it refreshes the student's allowance and calls `onReset`, so the box opens by itself.
 */
export function LimitBanner({ onReset, className }: { onReset?: () => void; className?: string }) {
	const { data } = useStudioState();
	const queryClient = useQueryClient();
	const resetsAt = data?.usage.chat.resetsAt;
	const left = useCountdown(resetsAt);
	useEffect(() => {
		if (left === 0) {
			void queryClient.invalidateQueries({ queryKey: orpc.scs.state.key() });
			onReset?.();
		}
		// oxlint-disable-next-line react-hooks/exhaustive-deps -- fires once when the countdown reaches zero
	}, [left === 0]);
	return (
		<div role="status" className={cn("rounded-lg bg-warn-soft p-3 text-sm text-warn-text", className)}>
			<p className="font-medium">You've used today's free messages.</p>
			{left != null && resetsAt && (
				<p className="mt-0.5">
					More in <span className="font-semibold tabular-nums">{formatCountdown(left)}</span>
					<span className="text-xs opacity-80">
						{" "}
						(at {new Date(resetsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })})
					</span>
				</p>
			)}
			<p className="mt-1 text-xs">
				Don't want to wait?{" "}
				<a href="/dashboard/settings/privacy" className="underline">
					Add your own free Gemini key
				</a>{" "}
				for no daily limit.
			</p>
		</div>
	);
}
