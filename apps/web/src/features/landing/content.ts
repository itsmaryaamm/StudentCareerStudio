import { templateSchema } from "@reactive-resume/schema/templates";

/** The number of résumé templates the app really ships, read from the schema so the page cannot drift. */
export const TEMPLATE_COUNT = templateSchema.options.length;

/** Where the typed sentence waits for the sign-up page. */
export const SENTENCE_KEY = "scs.landing.sentence";

export const PROMPTS = [
	"I led a team of 4 to build a campus bike-sharing app and we reached 300 users.",
	"I'm a first-year with no work experience, but I run the film club's social media.",
	"I volunteer every Saturday at a food bank and organise the schedule.",
	"I'm a second-year computer science student looking for a co-op.",
	"Here's my LinkedIn, help me make it stronger: linkedin.com/in/maya-chen",
];

const SHIELD = "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z";
const DOC = "M6 3h8l4 4v14H6z M14 3v4h4";
const LINKEDIN = "M4 4h16v16H4z M8 10v6 M12 16v-6 M12 12.5c0-1.5 1-2.5 2.5-2.5S17 11 17 12.5V16";
const SPARK = "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z";
const COMPASS = "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M15.5 8.5l-2 5-5 2 2-5z";
export const CHECK_PATH = "M5 12l5 5 10-10";

export type ServiceId = "services" | "svc-resume" | "svc-linkedin" | "svc-coach" | "svc-lab";

export const MENU_ITEMS: { target: ServiceId; title: string; blurb: string; path: string }[] = [
	{ target: "services", title: "Shared profile", blurb: "Check each fact once", path: SHIELD },
	{ target: "svc-resume", title: "Résumé Studio", blurb: `${TEMPLATE_COUNT} templates, PDF and Word`, path: DOC },
	{ target: "svc-linkedin", title: "LinkedIn Studio", blurb: "Headline, About and skills", path: LINKEDIN },
	{ target: "svc-coach", title: "Career Coach", blurb: "Finds what you forgot", path: SPARK },
	{ target: "svc-lab", title: "Career Lab", blurb: "Four AI missions", path: COMPASS },
];

export const TILES: ({ label: string; path: string } | null)[] = [
	{ label: "Education", path: "M3 9l9-5 9 5-9 5z M7 11v5c0 1 2 3 5 3s5-2 5-3v-5" },
	{ label: "Experience", path: "M4 8h16v11H4z M9 8V5h6v3" },
	{ label: "Projects", path: "M4 5h16v14H4z M4 9h16" },
	{
		label: "Clubs",
		path: "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M2 19c0-3 3-5 6-5s6 2 6 5 M14 14c3 0 8 1 8 5",
	},
	{ label: "Volunteering", path: "M12 20s-7-4.5-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.5-7 10-7 10z" },
	{ label: "Skills", path: "M13 3L5 14h6l-1 7 8-11h-6z" },
	{ label: "Goals", path: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M12 12h.01" },
	null,
	{ label: "Eligibility", path: SHIELD },
	{ label: "Awards", path: "M8 4h8v5a4 4 0 0 1-8 0z M12 13v4 M8 20h8" },
	{ label: "Résumé", path: DOC },
	{ label: "LinkedIn", path: LINKEDIN },
	{ label: "Coach", path: SPARK },
	{ label: "Career Lab", path: COMPASS },
	{ label: "Checks", path: CHECK_PATH },
];

/** Which tiles light up at each step of the cycle: profile, résumé, LinkedIn, coach, lab, then everything. */
export const TILE_HIGHLIGHTS: number[][] = [
	[0, 1, 2, 3, 5, 10, 14],
	[1, 2, 5, 11],
	[3, 4, 6, 12],
	[2, 6, 8, 13],
	[0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13, 14],
];

export const MISSIONS = [
	{
		name: "Discover Me",
		from: "#2A1566",
		to: "#6C3CF1",
		icon: COMPASS,
	},
	{
		name: "LinkedIn Creator",
		from: "#0F2A66",
		to: "#2F6BE0",
		icon: "M4 20l4-1 11-11-3-3L5 16z M14 6l3 3",
	},
	{
		name: "Opportunity Scout",
		from: "#5C0F3F",
		to: "#E0388A",
		icon: "M12 12l6-6 M12 21a9 9 0 1 1 9-9 M12 17a5 5 0 1 1 5-5 M12 12h.01",
	},
	{
		name: "Company Intelligence",
		from: "#5A2E05",
		to: "#D9861A",
		icon: "M5 21V4h9v17 M14 9h5v12 M8 8h3 M8 12h3 M8 16h3 M3 21h18",
	},
];

export const TRUST = [
	{
		title: "Private by default",
		body: "Your résumé, profile and chats belong to your account only. Download or delete everything from Settings.",
		path: SHIELD,
	},
	{
		title: "You approve every fact",
		body: "Nothing is saved to your profile until you verify it. The AI cannot quietly add an achievement.",
		path: CHECK_PATH,
	},
	{
		title: "Clear about what AI does",
		body: "Career Lab writes a prompt. It never claims to run ChatGPT, Claude, Calendar or Gmail for you.",
		path: SPARK,
	},
	{
		title: "No posting, no sending",
		body: "We never post to LinkedIn and never send an email on your behalf. You review and copy.",
		path: "M4 4h16v16H4z M8 12h8",
	},
];

export const FAQ: { question: string; answer: string }[] = [
	{
		question: "Is it really free?",
		answer:
			"Yes, during the beta. Every feature is free, with a daily allowance of coach messages and uploads. Paid features may be introduced later, and we will be clear about what changes.",
	},
	{
		question: "Can I start from a résumé I already have?",
		answer:
			"Yes. You can start with the AI coach, import a résumé or LinkedIn information, or build either from scratch. Everything feeds one shared profile.",
	},
	{
		question: "Does the AI make things up about me?",
		answer:
			"It is built not to. Everything the coach learns is a proposal you verify first, and résumés, posts and missions use only facts you approved. Anything the AI assumes is labelled as an assumption.",
	},
	{
		question: "Who can see my résumé?",
		answer:
			"Only you. Your profile and résumés are private to your account, and you can download or delete your data from Settings.",
	},
	{
		question: "Will you post on LinkedIn for me?",
		answer:
			"Never. Studio reads your public profile when you paste a link, suggests improvements, and you copy them over yourself.",
	},
	{
		question: "What do I need for Career Lab?",
		answer:
			"A free ChatGPT or Claude account. Studio writes the full prompt, you paste it in. Web research, scheduling and email drafts only work if your AI account supports them and you allow it.",
	},
	{
		question: "What happens when I reach my daily allowance?",
		answer: "The coach pauses until the next day. Your profile, résumés and saved missions stay available.",
	},
];
