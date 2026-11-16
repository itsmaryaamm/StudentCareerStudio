import { Link } from "@tanstack/react-router";
import { useEffect, useId, useReducer, useRef, useState, type KeyboardEvent } from "react";
import { PROMPTS } from "./content";
import { demoReducer, factFromSentence, factKind, initialDemo, THINKING_MS, typewriterText } from "./demo";
import { stashSentence, usePrefersReducedMotion, useTypewriter } from "./hooks";
import { HeroNav } from "./nav";

const arrow = (
	<svg
		width="18"
		height="18"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2.2"
		strokeLinecap="round"
		strokeLinejoin="round"
		aria-hidden="true"
	>
		<path d="M5 12h14 M13 6l6 6-6 6" />
	</svg>
);

const STATIC_PLACEHOLDER = "Tell career coach about something you've done";

/**
 * The hero's chat box. The placeholder types example sentences; sending one plays a scripted demo (a preview, not the
 * real coach): the sentence, "Thinking…", a canned reply, a card to verify, then a saved state that leads to sign-up.
 */
export function ChatBox() {
	const reduced = usePrefersReducedMotion();
	const [draft, setDraft] = useState("");
	const [demo, dispatch] = useReducer(demoReducer, initialDemo);
	const typewriter = useTypewriter(PROMPTS, !reduced && demo.phase === "idle");
	const field = useRef<HTMLTextAreaElement>(null);
	const hintId = useId();

	const suggestion = PROMPTS[typewriter.prompt] ?? "";
	const placeholder = reduced ? STATIC_PLACEHOLDER : `Tell career coach ${typewriterText(typewriter, PROMPTS)}|`;

	useEffect(() => {
		if (demo.phase !== "thinking") return;
		const id = setTimeout(() => dispatch({ type: "reply" }), THINKING_MS);
		return () => clearTimeout(id);
	}, [demo.phase]);

	const send = () => {
		// An empty box plays the example that is currently typing.
		const sentence = draft.trim() || (reduced ? "" : suggestion);
		if (!sentence) return;
		stashSentence(sentence);
		dispatch({ type: "send", text: sentence });
		setDraft("");
	};

	const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			send();
		} else if (event.key === "Tab" && !event.shiftKey && !draft && !reduced) {
			event.preventDefault();
			setDraft(suggestion);
		}
	};

	const saved = demo.phase === "saved";
	const replied = demo.phase === "replied" || saved;

	return (
		<div className="mx-auto mt-10 max-w-[912px] overflow-hidden rounded-[34px] border border-[#E3DCF5] bg-white text-left shadow-[0_30px_80px_-28px_rgba(108,60,241,0.5)] max-[759px]:mt-[26px] max-[759px]:rounded-[26px]">
			{demo.phase === "idle" ? (
				<>
					<div className="scs-field m-3 rounded-3xl px-2 pt-2">
						<textarea
							ref={field}
							value={draft}
							onChange={(event) => setDraft(event.target.value)}
							onKeyDown={onKeyDown}
							placeholder={placeholder}
							aria-label="Tell the career coach about something you've done"
							aria-describedby={reduced ? undefined : hintId}
							rows={2}
							className="block h-14 w-full resize-none border-0 bg-transparent p-2 text-xl leading-normal text-[#1A0B3B] outline-none max-[759px]:h-[84px] max-[759px]:text-[17px] max-[759px]:leading-[1.45]"
						/>
						<span id={hintId} className="sr-only">
							Press Tab to use the example sentence. Press Enter to try it.
						</span>
					</div>
					<div className="flex flex-wrap items-center gap-2 pr-3.5 pb-3.5 pl-4 max-[759px]:pr-2.5 max-[759px]:pb-2.5 max-[759px]:pl-3">
						<button
							type="button"
							aria-label="Import a résumé or LinkedIn link"
							onClick={() => {
								setDraft("I have a résumé to import. ");
								field.current?.focus();
							}}
							className="flex size-[46px] cursor-pointer items-center justify-center rounded-full border border-[#E3DCF5] bg-white text-[#6B6585] hover:border-[#6C3CF1] hover:text-[#6C3CF1] max-[759px]:size-12"
						>
							<svg
								width="20"
								height="20"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.6"
								strokeLinecap="round"
								aria-hidden="true"
							>
								<path d="M12 5v14 M5 12h14" />
							</svg>
						</button>
						<span className="flex-1" />
						<button
							type="button"
							onClick={send}
							className="scs-grad inline-flex h-[50px] cursor-pointer items-center gap-2 rounded-full border-0 pr-[22px] pl-[26px] text-base font-semibold whitespace-nowrap max-[759px]:h-12 max-[759px]:pr-5 max-[759px]:pl-6"
						>
							Start free
							{arrow}
						</button>
					</div>
				</>
			) : (
				<div aria-live="polite" className="flex flex-col gap-3 bg-[#FBFAFF] p-5 max-[759px]:gap-2.5 max-[759px]:p-4">
					<div className="max-w-[85%] self-end rounded-[18px_18px_4px_18px] bg-[linear-gradient(180deg,#7C4DF5_0%,#5B2FD1_55%,#3B1A9E_100%)] px-4 py-3 text-base leading-normal break-words text-white">
						{demo.message}
					</div>
					{demo.phase === "thinking" && (
						<div className="self-start rounded-[18px_18px_18px_4px] bg-[#F3EFFF] px-4 py-3 text-[15px] text-[#6C3CF1]">
							Thinking…
						</div>
					)}
					{replied && (
						<>
							<div className="max-w-[85%] self-start rounded-[18px_18px_18px_4px] bg-[#F3EFFF] px-4 py-3 text-base leading-normal">
								That's a strong start. I'd like to save it to your career profile. Can you check it's accurate?
							</div>
							<div
								className={`box-border w-[85%] self-start rounded-2xl border p-4 max-[759px]:w-full ${saved ? "border-[#C4B2F5] bg-white" : "border-[#F5E3B5] bg-[#FFF8E8]"}`}
							>
								<div
									className={`mb-1.5 text-[11.5px] font-bold tracking-[0.03em] ${saved ? "text-[#4B1D96]" : "text-[#7A4F00]"}`}
								>
									{saved ? "Verified" : "Verify before saving"} · {factKind(demo.message)}
								</div>
								<div className="text-[15.5px] leading-[1.45] break-words">{factFromSentence(demo.message)}</div>
								{!saved && (
									<div className="mt-3 flex gap-2">
										<button
											type="button"
											onClick={() => dispatch({ type: "save" })}
											className="h-10 cursor-pointer rounded-[10px] border-0 bg-[#6C3CF1] px-4 text-sm font-semibold text-white hover:bg-[#5B2FD8] max-[759px]:h-[46px] max-[759px]:rounded-xl max-[759px]:text-[15px]"
										>
											Save to profile
										</button>
										<button
											type="button"
											onClick={() => dispatch({ type: "reset" })}
											className="h-10 cursor-pointer rounded-[10px] border border-[#DDD5F2] bg-white px-4 text-sm max-[759px]:h-[46px] max-[759px]:rounded-xl max-[759px]:text-[15px]"
										>
											Discard
										</button>
									</div>
								)}
							</div>
							{saved && (
								<div className="flex flex-wrap items-center gap-3.5 rounded-2xl border border-[#E3DCF5] bg-white p-4">
									<div className="min-w-[200px] flex-1 text-[15px] leading-[1.45]">
										<b>Saved.</b> Keep going to turn it into a résumé and LinkedIn profile.
									</div>
									<Link
										to="/auth/register"
										className="scs-grad inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold max-[759px]:h-[50px] max-[759px]:w-full max-[759px]:text-base"
									>
										Keep going
									</Link>
								</div>
							)}
							<div className="flex flex-wrap items-center gap-x-4">
								<button
									type="button"
									onClick={() => dispatch({ type: "reset" })}
									className="min-h-11 cursor-pointer border-0 bg-transparent p-0 text-[13.5px] text-[#6B6585] max-[759px]:text-sm"
								>
									Start over
								</button>
								<span className="text-[13.5px] text-[#6B6585]">
									A preview of how it works. Create a free account to talk to the real coach.
								</span>
							</div>
						</>
					)}
				</div>
			)}
		</div>
	);
}

/** The hero: the nav, the headline, the chat box, and the soft glows with the drifting wash along the bottom. */
export function Hero() {
	return (
		<header className="relative overflow-hidden">
			<div
				aria-hidden="true"
				className="absolute -top-[220px] -left-[160px] size-[720px] rounded-full max-[759px]:-top-[120px] max-[759px]:-left-20 max-[759px]:size-[360px]"
				style={{ background: "radial-gradient(circle,rgba(167,139,250,.55),rgba(167,139,250,0) 68%)" }}
			/>
			<div
				aria-hidden="true"
				className="absolute -top-[120px] -right-[200px] h-[700px] w-[760px] rounded-full max-[759px]:hidden"
				style={{ background: "radial-gradient(circle,rgba(147,197,253,.55),rgba(147,197,253,0) 68%)" }}
			/>
			<div
				aria-hidden="true"
				className="absolute top-[260px] left-[30%] h-[520px] w-[700px] rounded-full max-[759px]:hidden"
				style={{ background: "radial-gradient(circle,rgba(249,168,212,.42),rgba(249,168,212,0) 68%)" }}
			/>
			<div
				aria-hidden="true"
				className="scs-drift absolute right-[-6%] bottom-0 left-[-6%] h-[560px] max-[759px]:right-[-10%] max-[759px]:left-[-10%] max-[759px]:h-[330px]"
				style={{
					background:
						"radial-gradient(55% 75% at 12% 100%,#5B8CFF 0%,rgba(91,140,255,0) 72%),radial-gradient(60% 95% at 52% 112%,#FF4FA3 0%,rgba(255,79,163,0) 70%),radial-gradient(50% 80% at 92% 100%,#B07BFF 0%,rgba(176,123,255,0) 72%)",
				}}
			/>
			<HeroNav />
			<div
				id="top"
				className="relative mx-auto max-w-[1040px] px-6 pt-[clamp(72px,8vw,120px)] pb-[220px] text-center max-[759px]:px-[18px] max-[759px]:pt-11 max-[759px]:pb-[150px]"
			>
				<h1 className="m-0 text-[clamp(40px,5.2vw,84px)] leading-[1.06] font-medium tracking-[-0.04em] max-[759px]:text-[clamp(38px,11vw,48px)]">
					Tell your story once.
				</h1>
				<p className="mx-auto mt-2.5 max-w-[760px] text-[clamp(17px,2vw,24px)] leading-[1.35] text-[#6B6585] max-[759px]:mt-3 max-[759px]:max-w-[340px] max-[759px]:text-lg max-[759px]:leading-[1.4]">
					Make it count everywhere. Résumé, LinkedIn and AI career missions from one conversation.
				</p>
				<ChatBox />
				<p className="mt-3.5 mb-0 text-[15px] text-[#6B6585] min-[760px]:hidden">Free during the beta</p>
			</div>
		</header>
	);
}
