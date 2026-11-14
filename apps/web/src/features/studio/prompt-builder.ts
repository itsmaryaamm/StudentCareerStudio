export type PromptKind = "opportunities" | "apply" | "interview";
export type PromptTarget = "chatgpt" | "claude";

export type PromptInput = {
	kind: PromptKind;
	target: PromptTarget;
	/** Profile facts the student chose to share. Nothing else is included. */
	facts: string[];
	roles?: string;
	locations?: string;
	eligibility?: string;
	/** For "apply": the job post or description the student pasted. */
	jobText?: string;
};

export const PROMPT_KINDS: { kind: PromptKind; title: string; blurb: string }[] = [
	{
		kind: "opportunities",
		title: "Find opportunities",
		blurb: "Research current internships, jobs and programs that fit you.",
	},
	{ kind: "apply", title: "Help me apply", blurb: "Match your experience to a job and draft honest materials." },
	{
		kind: "interview",
		title: "Prepare for interviews",
		blurb: "Practice with a mock interview using your real examples.",
	},
];

const HONESTY = [
	"Use ONLY the facts in my profile below. Do not invent employers, dates, numbers, skills or results.",
	"If you need a detail that isn't there, ask me instead of guessing.",
	"Never make anything sound fancier than it was.",
].join("\n- ");

const browse = (target: PromptTarget) =>
	target === "chatgpt"
		? "Use web search to find CURRENT information, and give a link for every opportunity so I can check it myself."
		: "If web search is available, use it to find CURRENT information and give a link for every opportunity. If it is not available, say so and give me a precise search plan instead of guessing.";

const line = (label: string, value: string | undefined) => (value?.trim() ? `${label}: ${value.trim()}` : null);

/** Builds a prompt to paste into the student's own ChatGPT or Claude. Pure: no network, no AI quota. */
export function buildPrompt(input: PromptInput): string {
	const profile = input.facts.length
		? input.facts.map((f) => `- ${f}`).join("\n")
		: "- (I haven't shared any profile details)";
	const prefs = [
		line("Roles and interests", input.roles),
		line("Location preferences", input.locations),
		line("Work eligibility", input.eligibility),
	]
		.filter(Boolean)
		.join("\n");

	const task = {
		opportunities: `TASK: Help me find real opportunities that fit me: internships, graduate roles, programs and competitions.\n- ${browse(input.target)}\n- Give me 8 options ranked by fit. For each: organization, role, location, deadline if known, why it fits me (tied to my profile), and what I'm missing.\n- Finish with 3 things I could do this month to become a stronger candidate.`,
		apply: `TASK: Help me apply to the job below.\n- First, list which parts of my profile match the role and which requirements I do not meet yet. Be candid.\n- Then draft: (1) 4 résumé bullets using only my real experience, (2) a short cover letter, (3) 3 questions I should ask the employer.\n- Mark anything you are unsure about with [CHECK WITH ME].\n\nJOB POST:\n"""\n${input.jobText?.trim() || "(I will paste the job post in my next message.)"}\n"""`,
		interview: `TASK: Run a realistic mock interview for me, one question at a time.\n- Start by asking which role and company I'm preparing for if I haven't said.\n- Mix behavioral and role-specific questions. Wait for my answer before the next question.\n- After each answer, give brief feedback and a stronger version that uses my real examples from the profile below.\n- After 6 questions, summarize my strengths and the 3 things to improve.`,
	}[input.kind];

	return [
		"You are a practical, honest career coach for a university student.",
		`RULES:\n- ${HONESTY}`,
		task,
		prefs ? `MY PREFERENCES:\n${prefs}` : null,
		`MY PROFILE (shared by me; treat as the only facts you know):\n${profile}`,
	]
		.filter(Boolean)
		.join("\n\n");
}
