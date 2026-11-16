import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Alert } from "@reactive-resume/ui/components/alert";
import { Button } from "@reactive-resume/ui/components/button";
import { Spinner } from "@reactive-resume/ui/components/spinner";
import { Textarea } from "@reactive-resume/ui/components/textarea";
import { cn } from "@reactive-resume/utils/style";
import { FactCard, ProfilePanel, useFacts } from "./profile";
import {
	ConsentGate,
	ErrorBlock,
	isQuotaError,
	LimitBanner,
	LoadingBlock,
	studioErrorText,
	useStudioState,
} from "./shared";
import { orpc } from "@/libs/orpc/client";

const MAX_CHARS = 2000;
const GREETING =
	"Hi! I'm your career coach. Tell me about something you've done at university: a project, an event, a club. We'll turn it into strong material, and I won't make anything sound fancier than it was.";
const ACCEPT = "application/pdf,image/png,image/jpeg,image/webp";

export type Msg = { id: string; role: "user" | "assistant"; content: string };

export function readAsBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(new Error("Couldn't read that file."));
		reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
		reader.readAsDataURL(file);
	});
}

export function Bubble({ msg }: { msg: Msg }) {
	const mine = msg.role === "user";
	return (
		<li className={cn("flex", mine ? "justify-end" : "justify-start")}>
			<div
				className={cn(
					"max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap sm:max-w-[75%]",
					mine ? "bg-accent text-on-accent" : "bg-accent-soft text-ink",
				)}
			>
				<span className="sr-only">{mine ? "You: " : "Coach: "}</span>
				{msg.content}
			</div>
		</li>
	);
}

export function ChatPage({ compact = false }: { compact?: boolean }) {
	return (
		<ConsentGate>
			<ChatBody compact={compact} />
		</ConsentGate>
	);
}

function ChatBody({ compact = false }: { compact?: boolean }) {
	const queryClient = useQueryClient();
	const { data: state } = useStudioState();
	const { data: facts } = useFacts();
	const greeting = state?.preferredName
		? `Hi ${state.preferredName}! What have you been up to? A project, a class, a club, a job: tell me and we'll turn it into strong material.`
		: GREETING;
	const [threadId, setThreadId] = useState<string | undefined>();
	const [draft, setDraft] = useState("");
	const [pending, setPending] = useState<string | null>(null);
	const [sendError, setSendError] = useState<unknown>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const endRef = useRef<HTMLDivElement>(null);
	const fileRef = useRef<HTMLInputElement>(null);

	const threads = useQuery(orpc.scs.chat.threads.queryOptions());
	const history = useQuery({
		...orpc.scs.chat.messages.queryOptions({ input: { id: threadId ?? "x" } }),
		enabled: Boolean(threadId),
	});
	const send = useMutation(orpc.scs.chat.send.mutationOptions());
	const analyze = useMutation(orpc.scs.chat.analyze.mutationOptions());

	const refresh = (id?: string) =>
		Promise.all([
			queryClient.invalidateQueries({ queryKey: orpc.scs.state.key() }),
			queryClient.invalidateQueries({ queryKey: orpc.scs.facts.key() }),
			queryClient.invalidateQueries({ queryKey: orpc.scs.chat.threads.key() }),
			id ? queryClient.invalidateQueries({ queryKey: orpc.scs.chat.messages.key({ input: { id } }) }) : undefined,
		]);

	const ownKey = Boolean(state?.ownKeyPreview);
	const chatLeft = state ? (ownKey ? 999 : state.usage.chat.limit - state.usage.chat.used) : 0;
	const uploadsLeft = state ? (ownKey ? 999 : state.usage.upload.limit - state.usage.upload.used) : 0;
	const busy = send.isPending || analyze.isPending;
	const messages: Msg[] = (history.data ?? []).map((m) => ({ id: m.id, role: m.role, content: m.content }));

	// Keep the newest message in view.
	useEffect(() => {
		endRef.current?.scrollIntoView({ block: "end" });
	}, [messages.length, pending, send.isPending]);

	const submit = () => {
		const message = draft.trim();
		if (!message || busy || message.length > MAX_CHARS) return;
		setSendError(null);
		setNotice(null);
		setPending(message);
		send.mutate(
			{ ...(threadId ? { threadId } : {}), message },
			{
				onSuccess: async (result) => {
					setThreadId(result.threadId);
					setDraft("");
					await refresh(result.threadId);
					setPending(null);
					if (result.proposedFacts.length)
						setNotice(
							`I found ${result.proposedFacts.length} thing${result.proposedFacts.length > 1 ? "s" : ""} to verify. Save only what's accurate.`,
						);
				},
				onError: (error) => {
					setSendError(error);
					setPending(null); // the draft is kept, so nothing the student wrote is lost
					void refresh();
				},
			},
		);
	};

	const onFile = async (file: File | undefined) => {
		if (!file || busy) return;
		setSendError(null);
		setNotice(null);
		try {
			const dataBase64 = await readAsBase64(file);
			analyze.mutate(
				{ filename: file.name, mimeType: file.type, dataBase64, ...(threadId ? { threadId } : {}) },
				{
					onSuccess: async (result) => {
						await refresh(threadId);
						setNotice(
							`${result.summary} ${result.proposedFacts.length ? `Review the ${result.proposedFacts.length} item(s) below before saving.` : ""}`,
						);
					},
					onError: setSendError,
				},
			);
		} catch (error) {
			setSendError(error);
		}
		if (fileRef.current) fileRef.current.value = "";
	};

	const proposed = (facts ?? []).filter((f) => f.status === "proposed");
	const quotaHit = isQuotaError(sendError) || (state ? chatLeft <= 0 : false);

	return (
		<div className={compact ? "h-full" : "grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]"}>
			<section
				aria-label="Conversation with your career coach"
				className={cn(
					"flex flex-col overflow-hidden rounded-xl border border-line bg-raised",
					compact ? "h-full min-h-0" : "min-h-[60svh]",
				)}
			>
				<div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
					<label className="sr-only" htmlFor="thread-select">
						Conversation
					</label>
					<select
						id="thread-select"
						className="h-9 max-w-full rounded-md border border-line bg-bg px-2 text-sm"
						value={threadId ?? ""}
						onChange={(e) => {
							setThreadId(e.target.value || undefined);
							setSendError(null);
							setNotice(null);
						}}
					>
						<option value="">New conversation</option>
						{(threads.data ?? []).map((t) => (
							<option key={t.id} value={t.id}>
								{t.title}
							</option>
						))}
					</select>
					<span className="ms-auto text-xs text-ink-3" aria-live="polite">
						{state
							? ownKey
								? "Using your own key"
								: `${Math.max(0, chatLeft)} of ${state.usage.chat.limit} messages left today`
							: ""}
					</span>
				</div>

				<div className="flex-1 overflow-y-auto p-3 sm:p-4">
					{threadId && history.isPending ? (
						<LoadingBlock rows={3} label="Loading conversation" />
					) : threadId && history.error ? (
						<ErrorBlock
							error={history.error}
							onRetry={() => void history.refetch()}
							title="Couldn't load this conversation"
						/>
					) : (
						<div role="log" aria-live="polite" aria-relevant="additions" aria-label="Messages">
							<ol className="grid gap-3">
								<Bubble msg={{ id: "hello", role: "assistant", content: greeting }} />
								{messages.map((m) => (
									<Bubble key={m.id} msg={m} />
								))}
								{pending && <Bubble msg={{ id: "pending", role: "user", content: pending }} />}
								{send.isPending && (
									<li className="flex items-center gap-2 ps-1 text-sm text-ink-3">
										<Spinner decorative /> Coach is thinking…
									</li>
								)}
								{analyze.isPending && (
									<li className="flex items-center gap-2 ps-1 text-sm text-ink-3">
										<Spinner decorative /> Reading your file…
									</li>
								)}
							</ol>
						</div>
					)}

					{notice && (
						<p role="status" className="mt-3 rounded-lg bg-info-soft p-3 text-sm text-info-text">
							{notice}
						</p>
					)}
					{proposed.length > 0 && (
						<div className="mt-3">
							<h3 className="mb-1.5 text-[13px] font-semibold text-warn-text">Verify before saving</h3>
							<ul className="grid gap-2">
								{proposed.map((f) => (
									<FactCard key={f.id} fact={f} />
								))}
							</ul>
						</div>
					)}
					<div ref={endRef} />
				</div>

				{quotaHit && !ownKey && <LimitBanner className="mx-3 mb-2" onReset={() => setSendError(null)} />}
				{sendError != null && !isQuotaError(sendError) && (
					<Alert variant="error" className="mx-3 mb-2 w-auto">
						<p>{studioErrorText(sendError)}</p>
						{draft && <p className="text-xs">Your message is still in the box — press Send to retry.</p>}
					</Alert>
				)}
				{uploadsLeft <= 0 && !ownKey && state && (
					<p className="mx-3 mb-2 text-xs text-ink-3">
						You've used all {state.usage.upload.limit} free document analyses.{" "}
						<a href="/dashboard/settings/privacy" className="text-accent-text underline">
							Add your own Gemini key
						</a>{" "}
						to analyse more.
					</p>
				)}

				<form
					className="flex items-end gap-2 border-t border-line p-3"
					onSubmit={(e) => {
						e.preventDefault();
						submit();
					}}
				>
					<input
						ref={fileRef}
						type="file"
						accept={ACCEPT}
						className="sr-only"
						id="chat-file"
						aria-label="Choose a document or image to analyze"
						tabIndex={-1}
						onChange={(e) => void onFile(e.target.files?.[0])}
					/>
					<Button
						type="button"
						variant="secondary"
						size="icon"
						aria-label={`Upload a document or image (${Math.max(0, uploadsLeft)} left)`}
						title={
							uploadsLeft > 0
								? `Upload a PDF or image — ${uploadsLeft} left in the beta`
								: "You've used all your uploads"
						}
						disabled={busy || uploadsLeft <= 0}
						onClick={() => fileRef.current?.click()}
					>
						+
					</Button>
					<div className="min-w-0 flex-1">
						<label htmlFor="chat-input" className="sr-only">
							Message to your career coach
						</label>
						<Textarea
							id="chat-input"
							rows={2}
							value={draft}
							maxLength={MAX_CHARS + 50}
							disabled={quotaHit}
							placeholder={
								quotaHit
									? "Out of free messages for now. See the countdown above."
									: "Tell me about something you've done…"
							}
							onChange={(e) => setDraft(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
									e.preventDefault();
									submit();
								}
							}}
						/>
						{draft.length > MAX_CHARS - 200 && (
							<p className={cn("mt-0.5 text-xs", draft.length > MAX_CHARS ? "text-danger-text" : "text-ink-3")}>
								{draft.length} / {MAX_CHARS}
							</p>
						)}
					</div>
					<Button
						type="submit"
						disabled={busy || quotaHit || !draft.trim() || draft.length > MAX_CHARS}
						aria-busy={send.isPending}
					>
						{send.isPending ? "Sending…" : "Send"}
					</Button>
				</form>
			</section>

			{!compact && (
				<details className="rounded-xl border border-line bg-raised p-3 lg:open:block" open>
					<summary className="cursor-pointer text-sm font-semibold lg:hidden">Your career profile</summary>
					<div className="mt-3 lg:mt-0">
						<ProfilePanel hideProposed />
					</div>
				</details>
			)}
		</div>
	);
}
