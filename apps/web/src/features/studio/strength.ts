// How complete a student's story is, and the one next step worth taking. Everyone starts above zero: the account, the
// goal they gave and their contact details already count (the endowed-progress effect), and each approved fact moves the
// bar closer to a full résumé (the goal-gradient effect).

export type StrengthInput = {
	/** They told the coach where they are or what they are aiming for. */
	hasGoal: boolean;
	/** They gave an email or phone for their résumé. */
	hasContact: boolean;
	/** Facts they approved. */
	approvedFacts: number;
	/** Résumés they have. */
	resumes: number;
};

export type NextStep = { label: string; detail: string; to: string; cta: string };

/** Facts that make a résumé feel full, and the points each earns. */
export const FACTS_FOR_FULL = 8;
const POINTS = { account: 10, goal: 15, contact: 10, facts: 45, resume: 20 } as const;

export function storyStrength(input: StrengthInput) {
	const fromFacts = Math.round((Math.min(input.approvedFacts, FACTS_FOR_FULL) / FACTS_FOR_FULL) * POINTS.facts);
	const percent = Math.min(
		100,
		POINTS.account +
			(input.hasGoal ? POINTS.goal : 0) +
			(input.hasContact ? POINTS.contact : 0) +
			fromFacts +
			(input.resumes > 0 ? POINTS.resume : 0),
	);
	return { percent, factsToFull: Math.max(0, FACTS_FOR_FULL - input.approvedFacts) };
}

/** One clear next action, never a menu. */
export function nextStep(input: StrengthInput): NextStep {
	const { factsToFull } = storyStrength(input);
	if (input.approvedFacts < 3) {
		const need = 3 - input.approvedFacts;
		return {
			label: "Tell the coach about something you've done",
			detail: `Just ${need} more ${need === 1 ? "thing" : "things"} and your résumé has real content. About 2 minutes.`,
			to: "/dashboard/chat",
			cta: "Talk to the coach",
		};
	}
	if (input.resumes === 0) {
		return {
			label: "Make your first résumé",
			detail: "You have enough to start. It takes about a minute, and you can change everything.",
			to: "/dashboard/documents",
			cta: "Make my résumé",
		};
	}
	if (factsToFull > 0) {
		return {
			label: "Add a few more things you've done",
			detail: `${factsToFull} more ${factsToFull === 1 ? "thing" : "things"} and your story is complete.`,
			to: "/dashboard/chat",
			cta: "Add more",
		};
	}
	return {
		label: "Polish your LinkedIn",
		detail: "Your story is complete. Use it to write each part of your LinkedIn profile.",
		to: "/dashboard/linkedin",
		cta: "Open LinkedIn Studio",
	};
}
