import type { Mission, MissionId } from "../lab/missions";
import type { DragEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Alert } from "@reactive-resume/ui/components/alert";
import { Textarea } from "@reactive-resume/ui/components/textarea";
import { cn } from "@reactive-resume/utils/style";
import { MISSIONS } from "../lab/missions";
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
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
/** What the coach reads: PDF, Word (.docx), and photos. */
export const UPLOAD_ACCEPT = `application/pdf,${DOCX_MIME},.docx,image/png,image/jpeg,image/webp`;
/** The file's type, from its name when the browser doesn't say (Word files often arrive without one). */
export const uploadMime = (file: File) =>
	file.type || (/\.docx$/i.test(file.name) ? DOCX_MIME : /\.pdf$/i.test(file.name) ? "application/pdf" : "");

export type Msg = { id: string; role: "user" | "assistant"; content: string };
/** Lines the app itself adds when a mission is started from a chip: no AI call, so no message is used. */
type Scripted = { id: string; after: number; kind: "user" | "assistant" | "link"; text: string; mission: MissionId };

export function readAsBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(new Error("Couldn't read that file."));
		reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
		reader.readAsDataURL(file);
	});
}

function MissionGlyph({ mission, size = 15 }: { mission: Mission; size?: number }) {
	return (
		<svg
			aria-hidden
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth={1.7}
			strokeLinecap="round"
			strokeLinejoin="round"
		>
			<path d={mission.icon} />
		</svg>
	);
}

function Bubble({ who, children }: { who: "user" | "assistant"; children: React.ReactNode }) {
	const mine = who === "user";
	return (
		<li className={cn("flex", mine ? "justify-end" : "justify-start")}>
			<div
				className={cn(
					"max-w-[78%] px-4 py-3 text-[14.5px] leading-6 [overflow-wrap:anywhere] whitespace-pre-wrap max-sm:max-w-[88%]",
					mine
						? "rounded-[16px_16px_4px_16px] bg-linear-to-b from-[#7c4df5] to-[#6c3cf1] text-white"
						: "rounded-[16px_16px_16px_4px] bg-[#f3efff] text-[#1a0b3b]",
				)}
			>
				<span className="sr-only">{mine ? "You: " : "Coach: "}</span>
				{children}
			</div>
		</li>
	);
}

export function ChatPage({ compact = false, mission }: { compact?: boolean; mission?: string | undefined }) {
	return (
		<ConsentGate>
			<ChatBody compact={compact} mission={mission} />
		</ConsentGate>
	);
}

function ChatBody({ compact = false, mission }: { compact?: boolean; mission?: string | undefined }) {
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
	const [attached, setAttached] = useState<MissionId | null>(() => MISSIONS.find((m) => m.id === mission)?.id ?? null);
	const [scripted, setScripted] = useState<Scripted[]>([]);
	const [dragging, setDragging] = useState(false);
	// What the next real message should say about a mission that was started with the opener.
	const preface = useRef<string>("");
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
	const attachedMission = MISSIONS.find((m) => m.id === attached);

	// Keep the newest message in view.
	useEffect(() => {
		endRef.current?.scrollIntoView({ block: "end" });
	}, [messages.length, scripted.length, pending, send.isPending]);

	const startScripted = (m: Mission) => {
		const after = messages.length;
		setScripted((all) => [
			...all,
			{ id: `s${all.length}u`, after, kind: "user", text: `Start ${m.name}`, mission: m.id },
			{ id: `s${all.length}a`, after, kind: "assistant", text: m.opener, mission: m.id },
			{ id: `s${all.length}l`, after, kind: "link", text: `Open the ${m.name} workbook`, mission: m.id },
		]);
		// The coach's opener isn't in the server's history, so the next real message carries it along.
		preface.current = `Mission: ${m.name}. You asked me: "${m.opener}" My answer: `;
		setAttached(null);
		setDraft("");
	};

	const submit = () => {
		const text = draft.trim();
		if (busy || text.length > MAX_CHARS) return;
		if (attachedMission && !text) return startScripted(attachedMission);
		if (!text) return;
		setSendError(null);
		setNotice(null);
		setPending(text);
		const lead = attachedMission ? `Mission: ${attachedMission.name}. ` : preface.current;
		preface.current = "";
		if (attachedMission) setAttached(null);
		send.mutate(
			{ ...(threadId ? { threadId } : {}), message: `${lead}${text}`.slice(0, MAX_CHARS) },
			{
				onSuccess: async (result) => {
					setThreadId(result.threadId);
					setDraft("");
					await refresh(result.threadId);
					setPending(null);
					if (result.proposedFacts.length)
						setNotice(`${result.proposedFacts.length} to verify. Save only what's accurate.`);
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
				{ filename: file.name, mimeType: uploadMime(file), dataBase64, ...(threadId ? { threadId } : {}) },
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

	const onDrop = (e: DragEvent) => {
		e.preventDefault();
		setDragging(false);
		const id = e.dataTransfer.getData("text/plain");
		const found = MISSIONS.find((m) => m.id === id);
		if (found) setAttached(found.id);
	};

	const proposed = (facts ?? []).filter((f) => f.status === "proposed");
	const quotaHit = (isQuotaError(sendError) || (state ? chatLeft <= 0 : false)) && !ownKey;
	const currentTitle = threads.data?.find((t) => t.id === threadId)?.title ?? "New conversation";

	// History with the app's own mission lines slotted in where they happened.
	const lines: React.ReactNode[] = [];
	const addScripted = (index: number) => {
		for (const s of scripted.filter((x) => x.after === index)) {
			if (s.kind === "link")
				lines.push(
					<li key={s.id} className="ps-1">
						<a
							href={`/dashboard/lab?mission=${s.mission}`}
							className="text-sm font-semibold text-[#6c3cf1] hover:underline"
						>
							{s.text}
						</a>
					</li>,
				);
			else
				lines.push(
					<Bubble key={s.id} who={s.kind}>
						{s.text}
					</Bubble>,
				);
		}
	};
	messages.forEach((m, i) => {
		addScripted(i);
		lines.push(
			<Bubble key={m.id} who={m.role}>
				{m.content}
			</Bubble>,
		);
	});
	addScripted(messages.length);

	return (
		<div className={compact ? "h-full" : "mt-4 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_280px]"}>
			<section
				aria-label="Conversation with your career coach"
				className={cn(
					"flex flex-col overflow-hidden rounded-[18px] border border-[#e8e3f5] bg-white shadow-[0_1px_2px_rgba(75,29,150,.04)]",
					compact ? "h-full min-h-0" : "min-h-[calc(100svh-210px)]",
				)}
			>
				<div className="flex flex-wrap items-center gap-2 border-b border-[#efebfa] px-4 py-3">
					<label className="sr-only" htmlFor="thread-select">
						Conversation
					</label>
					<select
						id="thread-select"
						className="h-8 max-w-[60%] min-w-0 truncate rounded-md border-0 bg-transparent text-sm font-semibold text-[#1a0b3b] focus-visible:outline-2 focus-visible:outline-[#6c3cf1]"
						value={threadId ?? ""}
						title={currentTitle}
						onChange={(e) => {
							setThreadId(e.target.value || undefined);
							setSendError(null);
							setNotice(null);
							setScripted([]);
						}}
					>
						<option value="">New conversation</option>
						{(threads.data ?? []).map((t) => (
							<option key={t.id} value={t.id}>
								{t.title}
							</option>
						))}
					</select>
					<span className="ms-auto text-[13px] text-[#6b6585]" aria-live="polite">
						{state
							? ownKey
								? "Using your own key"
								: `${Math.max(0, chatLeft)} of ${state.usage.chat.limit} messages left today`
							: ""}
					</span>
				</div>

				<div className="flex-1 overflow-y-auto p-4 sm:p-5">
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
								<Bubble who="assistant">{greeting}</Bubble>
								{lines}
								{pending && <Bubble who="user">{pending}</Bubble>}
								{(send.isPending || analyze.isPending) && (
									<li className="flex items-center gap-2 ps-1 text-sm text-[#6b6585]" role="status">
										<span aria-hidden className="flex gap-1">
											{[0, 1, 2].map((d) => (
												<span
													key={d}
													className="size-1.5 animate-bounce rounded-full bg-[#8b6cf0] motion-reduce:animate-none"
													style={{ animationDelay: `${d * 140}ms` }}
												/>
											))}
										</span>
										{analyze.isPending ? "Reading your file…" : "Thinking…"}
									</li>
								)}
							</ol>
						</div>
					)}

					{notice && (
						<p role="status" className="mt-4 text-sm font-medium text-[#4b1d96]">
							{notice}
						</p>
					)}
					{proposed.length > 0 && (
						<ul className="mt-2 grid gap-2.5">
							{proposed.map((f) => (
								<FactCard key={f.id} fact={f} />
							))}
						</ul>
					)}
					<div ref={endRef} />
				</div>

				{sendError != null && !isQuotaError(sendError) && (
					<Alert variant="error" className="mx-4 mb-2 w-auto">
						<p>{studioErrorText(sendError)}</p>
						{draft && <p className="text-xs">Your message is still in the box — press Send to retry.</p>}
					</Alert>
				)}
				{uploadsLeft <= 0 && !ownKey && state && (
					<p className="mx-4 mb-2 text-xs text-[#6b6585]">
						You've used all {state.usage.upload.limit} free document analyses.{" "}
						<a href="/dashboard/settings/privacy" className="font-semibold text-[#6c3cf1] underline">
							Add your own AI key
						</a>{" "}
						to analyse more.
					</p>
				)}

				{quotaHit ? (
					<div className="border-t border-[#efebfa] p-4">
						<LimitBanner onReset={() => setSendError(null)} />
					</div>
				) : (
					<div className="border-t border-[#efebfa]">
						{!compact && (
							<div
								className="flex items-center gap-2 px-4 pt-3 max-md:overflow-x-auto md:flex-wrap"
								role="group"
								aria-label="Missions"
							>
								<span className="text-[13px] font-medium text-[#6b6585]">Missions</span>
								{MISSIONS.map((m) => (
									<button
										key={m.id}
										type="button"
										draggable
										aria-pressed={attached === m.id}
										title="Click to attach, or drag into the message box"
										onDragStart={(e) => e.dataTransfer.setData("text/plain", m.id)}
										onClick={() => setAttached(attached === m.id ? null : m.id)}
										className={cn(
											"inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13.5px] font-medium text-[#4b1d96] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6c3cf1] md:h-9",
											attached === m.id
												? "border-[#6c3cf1] bg-[#f3efff]"
												: "border-[#ddd5f2] bg-white hover:border-[#c4b2f5] hover:bg-[#faf8ff]",
										)}
									>
										<MissionGlyph mission={m} />
										{m.name}
									</button>
								))}
							</div>
						)}
						<form
							className={cn(
								"relative m-3 flex flex-col gap-2 rounded-2xl p-1 transition-colors",
								dragging && "border-2 border-dashed border-[#6c3cf1] bg-[#f3efff]",
							)}
							onDragOver={(e) => {
								e.preventDefault();
								if (!dragging) setDragging(true);
							}}
							onDragLeave={() => setDragging(false)}
							onDrop={onDrop}
							onSubmit={(e) => {
								e.preventDefault();
								submit();
							}}
						>
							{dragging && (
								<div className="pointer-events-none absolute inset-0 z-10 grid place-items-center rounded-2xl bg-[#f3efff]/90 text-sm font-semibold text-[#4b1d96]">
									Drop to attach
								</div>
							)}
							{attachedMission && (
								<div className="flex">
									<span className="inline-flex items-center gap-1.5 rounded-full bg-[#ede9fe] py-1 ps-3 pe-1 text-[13px] font-semibold text-[#4b1d96]">
										<MissionGlyph mission={attachedMission} />
										{attachedMission.name}
										<button
											type="button"
											aria-label={`Remove ${attachedMission.name}`}
											onClick={() => setAttached(null)}
											className="grid size-6 place-items-center rounded-full hover:bg-[#ddd5f2]"
										>
											×
										</button>
									</span>
								</div>
							)}
							<div className="flex items-end gap-2">
								<input
									ref={fileRef}
									type="file"
									accept={UPLOAD_ACCEPT}
									className="sr-only"
									id="chat-file"
									aria-label="Choose a document or image to analyze"
									tabIndex={-1}
									onChange={(e) => void onFile(e.target.files?.[0])}
								/>
								<button
									type="button"
									aria-label={`Upload a document or image (${Math.max(0, uploadsLeft)} left)`}
									title={
										uploadsLeft > 0
											? `Upload a PDF, Word file or photo — ${uploadsLeft} left in the beta`
											: "You've used all your uploads"
									}
									disabled={busy || uploadsLeft <= 0}
									onClick={() => fileRef.current?.click()}
									className="grid size-11 shrink-0 place-items-center rounded-xl border border-[#ddd5f2] bg-white text-lg text-[#4b1d96] transition hover:border-[#c4b2f5] focus-visible:outline-2 focus-visible:outline-[#6c3cf1] disabled:opacity-50"
								>
									+
								</button>
								<div className="min-w-0 flex-1">
									<label htmlFor="chat-input" className="sr-only">
										Message to your career coach
									</label>
									<Textarea
										id="chat-input"
										rows={1}
										value={draft}
										maxLength={MAX_CHARS + 50}
										placeholder={
											attachedMission
												? "Add details, or just send to start the mission"
												: "Tell me about something you've done…"
										}
										className="min-h-11 resize-none rounded-xl border-[#ddd5f2] px-3.5 py-2.5 text-[15px]"
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
								<button
									type="submit"
									disabled={busy || (!draft.trim() && !attachedMission) || draft.length > MAX_CHARS}
									aria-busy={send.isPending}
									className="inline-flex h-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-b from-[#7c4df5] to-[#6c3cf1] px-6 text-[15px] font-semibold text-white shadow-[0_1px_0_rgba(255,255,255,.25)_inset,0_8px_20px_-8px_rgba(108,60,241,.7)] transition hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6c3cf1] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50"
								>
									{send.isPending ? "Sending…" : "Send"}
								</button>
							</div>
						</form>
					</div>
				)}
			</section>

			{!compact && (
				<aside
					aria-label="Your career profile"
					className="rounded-[18px] border border-[#e8e3f5] bg-white p-4 shadow-[0_1px_2px_rgba(75,29,150,.04)]"
				>
					<ProfilePanel hideProposed />
				</aside>
			)}
		</div>
	);
}
