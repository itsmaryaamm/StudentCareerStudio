/** The hero's scripted demo and the page's small pure helpers. Nothing here touches the DOM. */

export type DemoPhase = "idle" | "thinking" | "replied" | "saved";

export type DemoState = { phase: DemoPhase; message: string };

export type DemoAction = { type: "send"; text: string } | { type: "reply" } | { type: "save" } | { type: "reset" };

export const initialDemo: DemoState = { phase: "idle", message: "" };

/** How long "Thinking…" shows before the scripted reply. */
export const THINKING_MS = 1100;

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
	switch (action.type) {
		case "send": {
			const message = action.text.trim();
			// Ignore empty sentences and sends while the coach is "thinking".
			if (!message || state.phase === "thinking") return state;
			return { phase: "thinking", message };
		}
		case "reply":
			return state.phase === "thinking" ? { ...state, phase: "replied" } : state;
		case "save":
			return state.phase === "replied" ? { ...state, phase: "saved" } : state;
		case "reset":
			return initialDemo;
	}
}

/** The sentence the visitor typed, cut to the first sentence for the "verify" card. */
export function factFromSentence(sentence: string) {
	const first = sentence.split(/[.!?\n]/)[0]?.trim() ?? "";
	return (first || sentence.trim()).slice(0, 110);
}

/** The label on the verify card, guessed from the words used. */
export function factKind(sentence: string) {
	if (/volunt/i.test(sentence)) return "Volunteering";
	if (/led|team|built|app|project/i.test(sentence)) return "Project";
	if (/co-?op|looking|seeking|want/i.test(sentence)) return "Goal";
	if (/club|treasurer|president|society/i.test(sentence)) return "Leadership";
	return "Experience";
}

export type Typewriter = { prompt: number; length: number; deleting: boolean; wait: number };

export const initialTypewriter: Typewriter = { prompt: 0, length: 0, deleting: false, wait: 0 };

/** One ~55ms tick: type a character, pause on the full sentence, delete two at a time, then move to the next one. */
export function stepTypewriter(state: Typewriter, prompts: string[]): Typewriter {
	if (state.wait > 0) return { ...state, wait: state.wait - 1 };
	const text = prompts[state.prompt] ?? "";
	if (!state.deleting) {
		const length = state.length + 1;
		return length >= text.length ? { ...state, length: text.length, deleting: true, wait: 26 } : { ...state, length };
	}
	const length = state.length - 2;
	if (length > 0) return { ...state, length };
	return { prompt: (state.prompt + 1) % prompts.length, length: 0, deleting: false, wait: 6 };
}

export function typewriterText(state: Typewriter, prompts: string[]) {
	return (prompts[state.prompt] ?? "").slice(0, state.length);
}

/** Toggles a single-open accordion: opening one closes the rest, clicking the open one closes it. */
export function toggleAccordion(open: number, index: number) {
	return open === index ? -1 : index;
}
