import type { ComponentProps, ReactNode } from "react";

type SetUpAiLineProps = ComponentProps<"div"> & {
	/** What needs AI, as a sentence ("A fit check needs AI."). */
	lead: ReactNode;
	/** Opens the one Set up AI dialog over the page. */
	onSetUp: () => void;
};

/**
 * Student Career Studio shows no "Set up AI" nags. Reactive Resume drew this line on every screen that needed AI
 * when no key was saved; the choice between the app's free AI and a student's own key lives in Settings → AI.
 */
export function SetUpAiLine(_props: SetUpAiLineProps) {
	return null;
}
