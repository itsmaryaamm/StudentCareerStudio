// The per-section tips of LinkedIn Studio, ported from the design handoff. They are plain rules on the text, not an
// AI call: each says whether the text already does something that helps, and if not, how to improve it.

export const LINKEDIN_SECTIONS = [
	{ id: "headline", label: "Headline", limit: 220, rows: 3 },
	{ id: "about", label: "About", limit: 2600, rows: 7 },
	{ id: "education", label: "Education", limit: 500, rows: 4 },
	{ id: "experience", label: "Experience", limit: 2000, rows: 6 },
	{ id: "projects", label: "Projects", limit: 2000, rows: 6 },
	{ id: "skills", label: "Skills", limit: 500, rows: 4 },
] as const;
export type LinkedinSectionId = (typeof LINKEDIN_SECTIONS)[number]["id"];

type Rule = { test: (text: string) => boolean; title: string; tip: string };

export const CHECKS: Record<LinkedinSectionId, Rule[]> = {
	headline: [
		{
			test: (v) => /co-?op|intern|seeking|looking/i.test(v),
			title: "Say what you want next",
			tip: "Name the role or co-op you're after so recruiters can match you.",
		},
		{
			test: (v) => /\d/.test(v),
			title: "Add a proof point",
			tip: 'A number or project (like "300 users") makes you memorable.',
		},
		{
			test: (v) => /developer|software|engineer|computer|cs\b|data/i.test(v),
			title: "Use searchable keywords",
			tip: "Recruiters search by role and field. Include both.",
		},
		{
			test: (v) => v.length >= 60 && v.length <= 220,
			title: "Use the space",
			tip: "Aim for 60–150 characters. This line shows in search results and comments.",
		},
	],
	about: [
		{
			test: (v) => /\d/.test(v),
			title: "Show a result",
			tip: "Add one number or outcome that proves what you can do.",
		},
		{
			test: (v) => /looking|seeking|hope|goal/i.test(v),
			title: "End with what you want",
			tip: "Say the kind of role or team you're looking for.",
		},
		{
			test: (v) => v.length >= 300,
			title: "Give it room",
			tip: "About sections under 300 characters feel thin. Aim for 3–4 short sentences.",
		},
		{
			test: (v) => /\bI\b|I’m|I'm/.test(v),
			title: "Write in first person",
			tip: "It reads as you, not a template.",
		},
	],
	education: [
		{ test: (v) => /20\d\d/.test(v), title: "Include dates", tip: "Show the start and expected end year." },
		{
			test: (v) => /relevant|course/i.test(v),
			title: "List relevant courses",
			tip: "Three courses tied to your target role is enough.",
		},
		{
			test: (v) => /club|treasurer|society|award|honou?r/i.test(v),
			title: "Add activities or honours",
			tip: "Clubs and awards show what you do outside class.",
		},
	],
	experience: [
		{
			test: (v) => /•|\n-\s/.test(v),
			title: "Use bullet points",
			tip: "One achievement per bullet is easier to skim.",
		},
		{
			test: (v) => /\d/.test(v),
			title: "Quantify the impact",
			tip: "Budget size, members, hours saved: pick one number.",
		},
		{ test: (v) => /20\d\d/.test(v), title: "Include dates", tip: "Start and end month or year." },
		{
			test: (v) => /manage|led|built|report|organi[sz]ed/i.test(v),
			title: "Start with action verbs",
			tip: "Led, built, managed: say what you did, not what you were part of.",
		},
	],
	projects: [
		{
			test: (v) => v.trim().length > 0,
			title: "Add your first project",
			tip: "Projects are the strongest proof for students. Start with your best one.",
		},
		{
			test: (v) => /\d/.test(v),
			title: "Show the result",
			tip: "How many users, how much faster, how much saved?",
		},
		{
			test: (v) => /led|built|designed|launched/i.test(v),
			title: "Say your role",
			tip: "Make clear what you personally did.",
		},
	],
	skills: [
		{
			test: (v) => v.split(/[,·|]/).filter((x) => x.trim()).length >= 5,
			title: "List at least 5 skills",
			tip: "Recruiters filter by skill. More relevant ones means more matches.",
		},
		{
			test: (v) => /lead|team|plan|commun|budget/i.test(v),
			title: "Mix in people skills",
			tip: "Add one or two like leadership or planning.",
		},
		{
			test: (v) => /python|javascript|sql|java|excel|react/i.test(v),
			title: "Include tools recruiters filter by",
			tip: "Name the languages and tools you actually use.",
		},
	],
};

export type CheckResult = { title: string; tip: string; ok: boolean };

export function runChecks(section: LinkedinSectionId, text: string): CheckResult[] {
	return CHECKS[section].map((rule) => ({ title: rule.title, tip: rule.tip, ok: rule.test(text) }));
}

/** A section counts as improved when it has text and every tip is done. */
export const isImproved = (section: LinkedinSectionId, text: string) =>
	text.trim().length > 0 && runChecks(section, text).every((c) => c.ok);

const PROFILE_URL = /linkedin\.com\/in\/([\w%-]+)/i;

/** Accepts "linkedin.com/in/name" with or without https://www., and returns the clean https link, or null. */
export function normalizeLinkedinUrl(input: string): string | null {
	const slug = PROFILE_URL.exec(input.trim())?.[1];
	return slug ? `https://www.linkedin.com/in/${slug.toLowerCase()}` : null;
}
