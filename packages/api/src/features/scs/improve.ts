import { improveSystemPrompt } from "@reactive-resume/ai/prompts";

/** Extra rules for students: a stronger line must not claim more than the student said. */
const STUDENT_RULES = `

## Extra rules for a student's résumé

- Pick the mildest verb that is still true to the original. "Worked on" becomes "Contributed to" or "Helped build"; it never becomes "Engineered", "Architected", "Led", "Managed", "Spearheaded" or "Owned" unless the line already says so.
- Do not add scope the line does not state: no "maintained", "optimized", "scaled", "end-to-end" or "cross-functional" unless present.
- If your verb implies more responsibility, ownership or skill than the original, set addsFacts to true and say so in "why".`;
import { buildUserPrompt, improveOutputSchema } from "../ai/improve";
import { runAi } from "./ai-run";
import { requireConsent } from "./chat";

const FILLER = new Set([
	"with",
	"from",
	"into",
	"that",
	"this",
	"using",
	"over",
	"also",
	"through",
	"across",
	"within",
	"while",
	"their",
	"them",
	"have",
	"were",
	"been",
]);
const tokens = (text: string) => text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

/**
 * True when the rewrite contains words the student never wrote (other than its opening verb). The model's own
 * `addsFacts` is optimistic, so this check is ours: a flagged line makes the student confirm it is true.
 */
export function addsNewWords(original: string, context: string, rewrite: string): boolean {
	const known = tokens(`${original} ${context}`).map((w) => w.slice(0, 5));
	return tokens(rewrite)
		.slice(1)
		.filter((w) => w.length > 3 && !FILLER.has(w))
		.some((w) => !known.includes(w.slice(0, 5)));
}

export type ImproveAction = "verb" | "result" | "shorter" | "warmer" | "custom";

export const improveService = {
	/**
	 * One suggested rewrite of one résumé line, using the platform Gemini key and the student's daily improve
	 * allowance. Same prompts and honesty rules as the editor's own Improve; nothing is written.
	 */
	async run(
		userId: string,
		input: { line: string; action: ImproveAction; request?: string | undefined; where: string; context: string },
	) {
		await requireConsent(userId);
		const result = await runAi(userId, "improve", {
			system: improveSystemPrompt + STUDENT_RULES,
			schema: improveOutputSchema,
			messages: [{ role: "user", content: buildUserPrompt({ ...input }) }],
		});
		// Trust the stricter of the model's answer and ours.
		return {
			...result.data,
			addsFacts: result.data.addsFacts || addsNewWords(input.line, input.context, result.data.text),
		};
	},
};
