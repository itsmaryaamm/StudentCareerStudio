// Ported verbatim from the design handoff (`mis()`): copy, questions, prompt templates and rules.
// Change a mission's text here, and bump `templateVersion` in prompt.ts so saved missions know they are older.

export type QuestionType = "text" | "area" | "single" | "multi" | "time" | "file";
export type Question = {
	id: string;
	label: string;
	q: string;
	type: QuestionType;
	hint?: string;
	opts?: string[];
	/** Optional: it can be skipped. */
	opt?: boolean;
	/** Starts from the student's education facts. */
	pre?: "fields";
	/** The choices are the student's verified facts. */
	facts?: boolean;
	def?: string;
};
export type MissionId = "discover" | "linkedin" | "scout" | "intel";
export type Mission = {
	id: MissionId;
	num: string;
	key: string;
	name: string;
	icon: string;
	tint: [string, string];
	sub: string;
	output: string;
	needs: string;
	intro: string;
	perm: string;
	need: string;
	tools: string;
	opener: string;
	start: string;
	steps: string[];
	out: string[];
	follow: string[];
	qs: Question[];
};

export const MISSIONS: Mission[] = [
	{
		id: "discover",
		num: "01",
		key: "DISCOVER_ME",
		name: "Discover Me",
		icon: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M15.5 8.5l-2 5-5 2 2-5z",
		tint: ["#EDE9FE", "#6C3CF1"],
		sub: "Discover your strengths and career direction.",
		output:
			"A Career Identity Report: strengths backed by evidence, five realistic directions, skill gaps, and a 30-day plan.",
		needs: "About 5 minutes · ChatGPT or Claude · no special access",
		intro: "We’ll turn what you’ve done into a clear picture of your strengths and where they could lead.",
		perm: "This mission needs no connected accounts.",
		need: "Your studies, proud experiences and what energizes you. Most of it is filled in from your career profile.",
		tools: "ChatGPT or Claude. No tools or permissions needed.",
		opener:
			"Starting Discover Me. I’ll use your verified profile. Two quick things first: which experience made you feel most capable, and which task would you happily never do again?",
		start:
			"You are my evidence-based student career strategist.\n\nMy verified background and workbook answers are below. Begin by analyzing them and identifying the three most useful unanswered questions about my strengths, interests, and career direction.\n\nAsk those questions conversationally, no more than three at a time. Do not repeat information I have already provided. Do not merely summarize my profile. Investigate it and help me discover useful insights.",
		steps: [
			"Interview me about overlooked experiences.",
			"Review any résumé and LinkedIn information I give you.",
			"Interpret optional RIASEC results cautiously.",
			"Map my skills to actual supporting evidence.",
			"Separate demonstrated skills from interests.",
			"Identify five realistic career directions.",
			"Explain the qualification gaps for each.",
			"Suggest beginner-friendly ways to test each path.",
			"Tell me which experiences to highlight.",
			"Recommend résumé and LinkedIn improvements.",
			"Write a professional positioning statement.",
			"Create a prioritized 30-day action plan.",
		],
		out: [
			"Career Identity Report: positioning, evidence-backed strengths, directions, skill gaps",
			"LinkedIn headline suggestions and résumé priorities",
			"Recommended next steps",
			"Produce the report only after you have gathered enough information",
		],
		follow: [
			"What is one result, number or moment from your experience you haven’t mentioned yet?",
			"Is there anything here you’d rather the AI not use or mention?",
			"What would make this mission a clear win for you?",
		],
		qs: [
			{
				id: "fields",
				label: "Studying and interests:",
				q: "What are you studying, and what fields interest you?",
				type: "text",
				pre: "fields",
				hint: "e.g. Computer science; health tech, design",
			},
			{
				id: "proud",
				label: "Experiences I am proud of:",
				q: "Which experiences are you most proud of?",
				type: "multi",
				facts: true,
				hint: "Filled in from your verified career profile. Untick or add as you like.",
			},
			{
				id: "enjoy",
				label: "Activities I enjoy:",
				q: "What kinds of activities do you enjoy?",
				type: "multi",
				opts: [
					"Building things",
					"Solving problems",
					"Working with people",
					"Researching",
					"Creating or designing",
					"Organizing",
					"Analyzing data",
				],
				hint: "Pick as many as feel true.",
			},
			{
				id: "avoid",
				label: "Tasks I want to avoid:",
				q: "What kinds of tasks do you dislike or want to avoid?",
				type: "area",
				opt: true,
				hint: "e.g. Cold calling, repetitive data entry, long solo stretches.",
			},
			{
				id: "unsure",
				label: "Biggest career uncertainties:",
				q: "What are your biggest career uncertainties?",
				type: "area",
				opt: true,
				hint: "e.g. I don’t know if I prefer research or industry.",
			},
			{
				id: "riasec",
				label: "Career-interest assessment:",
				q: "Would you like to include a career-interest assessment?",
				type: "single",
				opts: ["Yes, I’ll share my RIASEC results", "No, skip it"],
				opt: true,
				hint: "Optional. Take the free O*NET Interest Profiler at onetinterestprofiler.org, then give your top three codes to the AI when it asks.",
			},
		],
	},
	{
		id: "linkedin",
		num: "02",
		key: "LINKEDIN_CREATOR",
		name: "LinkedIn Creator",
		icon: "M4 20l4-1 11-11-3-3L5 16z M14 6l3 3",
		tint: ["#DBEAFE", "#1D4ED8"],
		sub: "Turn your experiences into posts worth sharing.",
		output: "Three post angles, a polished post, a shorter version, hook options and a profile update tip.",
		needs: "About 4 minutes · ChatGPT or Claude · no special access",
		intro:
			"Pick a real experience and we’ll shape it into a credible, distinctive post, with no clichés and no invented achievements.",
		perm: "This mission needs no connected accounts.",
		need: "What happened, what you did, who you want to reach, and the tone you like.",
		tools: "ChatGPT or Claude. No tools or permissions needed.",
		opener:
			"Starting LinkedIn Creator. Which of your verified experiences do you want to post about, and what do you want readers to remember?",
		start:
			"You are my personal LinkedIn editor and professional storytelling coach.\n\nMy background, selected experience, target audience, and writing preferences are below. First, analyze the story and propose three genuinely different angles for a LinkedIn post. Do not write a generic final post immediately.\n\nGive me the three angles, explain which is strongest and why, and ask me to choose one. Once I choose, draft the post without making me repeat my experience.",
		steps: [
			"Analyze my specific experience.",
			"Identify what is genuinely interesting about it.",
			"Suggest three distinct storytelling angles.",
			"Recommend the strongest angle.",
			"Write a polished LinkedIn post.",
			"Produce a shorter alternative.",
			"Suggest three non-clickbait opening lines.",
			"Remove robotic phrasing and clichés.",
			"Check every claim against the facts I gave you.",
			"Suggest a visual only when it genuinely helps.",
			"Tell me whether to add this to a LinkedIn profile section.",
			"Revise with me until I approve.",
		],
		out: [
			"Three post angles",
			"Final polished post and a shorter alternative",
			"Hook variations",
			"Suggested visual",
			"Relevant profile update recommendation",
			"Avoid invented achievements, generic motivational posts, fake vulnerability, excessive emojis and engagement bait",
		],
		follow: [
			"What did you struggle with or get wrong along the way?",
			"Is there a person or moment you want to credit?",
			"Is there a post of yours or someone else’s whose style you like?",
		],
		qs: [
			{
				id: "kind",
				label: "Post type:",
				q: "What would you like to post about?",
				type: "single",
				opts: [
					"Achievement",
					"Competition",
					"Project",
					"Event",
					"Internship",
					"Learning experience",
					"Professional opinion",
				],
			},
			{
				id: "exp",
				label: "Experience to use:",
				q: "Which experience should we use?",
				type: "single",
				facts: true,
				hint: "From your career profile.",
			},
			{
				id: "happened",
				label: "What happened:",
				q: "What actually happened?",
				type: "area",
				hint: "Plain facts are best. e.g. We launched in September and had 300 riders by October.",
			},
			{
				id: "did",
				label: "What I personally did or learned:",
				q: "What did you personally do or learn?",
				type: "area",
				hint: "Your role, one decision you made, one lesson.",
			},
			{
				id: "tone",
				label: "Tone:",
				q: "What tone should the post have?",
				type: "single",
				opts: ["Natural", "Reflective", "Bold", "Educational", "Story-driven"],
			},
			{
				id: "aud",
				label: "Audience:",
				q: "Who do you want to reach?",
				type: "multi",
				opts: ["Recruiters", "Students", "Professionals", "Industry experts", "General network"],
			},
			{
				id: "file",
				label: "Writing sample:",
				q: "Do you have a writing sample, past post or image?",
				type: "file",
				opt: true,
				hint: "Optional. We read it once and never store it.",
			},
		],
	},
	{
		id: "scout",
		num: "03",
		key: "OPPORTUNITY_SCOUT",
		name: "Opportunity Scout",
		icon: "M12 12l6-6 M12 21a9 9 0 1 1 9-9 M12 17a5 5 0 1 1 5-5 M12 12h.01",
		tint: ["#FCE7F3", "#BE185D"],
		sub: "Find eligible opportunities and organize your search.",
		output:
			"A verified shortlist with eligibility checks, deadlines and official links, plus recurring-search and calendar setup.",
		needs: "About 6 minutes · ChatGPT or Claude with web search · Google Calendar optional",
		intro:
			"We’ll build an eligibility-first search brief so your AI only shows opportunities you can actually apply for.",
		perm: "Recurring searches and Google Calendar reminders only work if your chosen AI supports them and you authorize it.",
		need: "The kinds of opportunities, locations, eligibility limits and how often to search.",
		tools: "ChatGPT or Claude with web search. Google Calendar access is optional and set up in your AI account.",
		opener:
			"Starting Opportunity Scout. Before I search: which countries are you open to, and are there any eligibility limits like citizenship or graduation year?",
		start:
			"You are my personal eligibility-first opportunity research agent.\n\nMy verified student profile, career interests, restrictions, opportunity preferences, and preferred schedule are below. Begin by checking the current date and researching currently open opportunities using available web research tools. Verify eligibility before recommending anything.\n\nDo not start by explaining your methodology or asking me to repeat details already included. First produce a useful shortlist with official sources. After the initial research, help me configure recurring searches and calendar updates if supported.",
		steps: [
			"Research current opportunities.",
			"Search official university, lab, employer, scholarship and program websites.",
			"Verify nationality, residency and academic eligibility.",
			"Verify degree and graduation requirements.",
			"Verify application status and deadlines.",
			"Exclude confirmed ineligible opportunities from the shortlist.",
			"Rank the strongest matches.",
			"Explain why each one fits me.",
			"Include official application links.",
			"Point out relevant application improvements.",
			"Avoid duplicate recommendations.",
			"Recheck opportunities on later runs.",
			"Help me create a recurring research task when supported.",
			"Help me create Google Calendar events and deadline reminders when authorized.",
			"Report actions only after tool confirmation.",
		],
		out: [
			"Verified opportunity shortlist with eligibility explanation",
			"Deadlines and official links",
			"Personal action recommendations",
			"Recurring workflow setup status",
			"Calendar event status, if supported",
			"If scheduling or Calendar is unavailable, give setup instructions and calendar-ready event details",
			"Never report an automation as active unless it was actually created",
		],
		follow: [
			"Are there any places or organizations you want me to exclude?",
			"Roughly when do you need to start, and for how long?",
			"Is there a deadline or opportunity you already know about?",
		],
		qs: [
			{
				id: "kinds",
				label: "Opportunity types:",
				q: "What kinds of opportunities are you looking for?",
				type: "multi",
				opts: ["Internships", "Entry-level jobs", "Research programs", "Scholarships", "Fellowships", "Competitions"],
			},
			{
				id: "fields",
				label: "Fields of interest:",
				q: "Which fields are you interested in?",
				type: "text",
				pre: "fields",
				hint: "Filled in from your profile. Add your own.",
			},
			{
				id: "where",
				label: "Where:",
				q: "Where are you willing to work or study?",
				type: "multi",
				opts: ["Local", "International", "Remote", "Relocation acceptable"],
			},
			{
				id: "elig",
				label: "Eligibility restrictions:",
				q: "What are your eligibility restrictions?",
				type: "area",
				opt: true,
				hint: "Only what matters: degree level, graduation year, work authorization, funding needs. Skip anything you’d rather not share.",
			},
			{
				id: "paid",
				label: "Pay:",
				q: "Should the opportunity be paid or funded?",
				type: "single",
				opts: ["Paid or funded only", "Prefer paid", "Doesn’t matter"],
			},
			{
				id: "freq",
				label: "Search frequency:",
				q: "How often should the AI search?",
				type: "single",
				opts: ["One time", "Daily", "Weekly"],
			},
			{
				id: "time",
				label: "Run time:",
				q: "At what local time should it run?",
				type: "time",
				opt: true,
				hint: "Only used if you choose a recurring search.",
			},
		],
	},
	{
		id: "intel",
		num: "04",
		key: "COMPANY_INTELLIGENCE",
		name: "Company Intelligence",
		icon: "M5 21V4h9v17 M14 9h5v12 M8 8h3 M8 12h3 M8 16h3 M3 21h18",
		tint: ["#FEF3C7", "#92400E"],
		sub: "Discover companies, tailor your résumé, and prepare personalized outreach.",
		output:
			"Up to three researched companies, tailored résumé angles and email drafts ready for your review. Nothing is ever sent.",
		needs: "About 7 minutes · ChatGPT or Claude with web search · Gmail optional",
		intro:
			"We’ll set up a research agent that finds companies with a real, recent reason to hear from you, then drafts outreach for you to review.",
		perm: "Gmail drafts and a recurring morning run only work if your chosen AI supports them and you authorize it. Emails are never sent automatically.",
		need: "Industries, company types, locations, the contributions you can make and outreach tone.",
		tools: "ChatGPT or Claude with web search. Gmail access is optional and only used to create unsent drafts.",
		opener:
			"Starting Company Intelligence. Which industries and cities should I focus on, and which of your projects best shows what you can contribute?",
		start:
			"You are my personal company research, career positioning, and outreach preparation agent.\n\nMy verified background, résumé, target industries, geographic preferences, and outreach criteria are below. Begin by researching recent, verifiable company developments relevant to my experience. Find three organizations where I may have a credible reason to contribute or reach out.\n\nDo not invent company problems, vacancies, hiring contacts, or qualifications. For each selected organization, develop a personalized résumé angle and prepare a thoughtful outreach email for my review. After the first research run, help me configure a recurring morning workflow and Gmail draft creation if supported. Never send any emails automatically.",
		steps: [
			"Research relevant companies.",
			"Look for recent developments, ideally within 90 days.",
			"Separate verified facts from inferred business needs.",
			"Prioritize credible connections to my experience.",
			"Reject companies with weak relevance.",
			"Identify relevant teams, internships or roles.",
			"Find verified public recruiting contacts where available.",
			"Create company-specific résumé recommendations.",
			"Connect my verified achievements to each company’s needs.",
			"Write personalized, professional outreach emails.",
			"Avoid misleading claims.",
			"Check for duplicate outreach.",
			"Create Gmail drafts only when authorized and supported, and leave every draft unsent.",
			"Help me configure a recurring morning workflow where supported.",
			"Report actual completed actions and blockers.",
		],
		out: [
			"Up to three selected companies with evidence of recent developments",
			"Explanation of fit and tailored résumé recommendations",
			"Personalized email drafts and verified contact information where available",
			"Gmail draft status and scheduling status",
			"Recommended next steps",
			"If fewer than three credible matches exist, produce fewer drafts rather than inventing information",
			"If Gmail cannot be accessed, give review-ready drafts for manual use",
			"If a résumé cannot actually be attached, do not claim it was",
		],
		follow: [
			"Are there companies you already admire or want to avoid?",
			"Is there a person or alumni connection worth mentioning?",
			"How soon would you like to hear back?",
		],
		qs: [
			{
				id: "ind",
				label: "Industries:",
				q: "What industries interest you?",
				type: "text",
				pre: "fields",
				hint: "Filled in from your profile.",
			},
			{
				id: "types",
				label: "Company types:",
				q: "What types of companies do you prefer?",
				type: "multi",
				opts: ["Startup", "SME", "Large corporation", "Consulting firm", "Research lab", "No preference"],
			},
			{
				id: "loc",
				label: "Locations:",
				q: "Which locations should be included?",
				type: "text",
				hint: "e.g. Riyadh, Dubai, remote",
			},
			{
				id: "contrib",
				label: "Contributions I can make:",
				q: "What could you realistically contribute?",
				type: "multi",
				facts: true,
				hint: "Pick the verified skills and projects to lead with.",
			},
			{
				id: "goal",
				label: "Looking for:",
				q: "What are you looking for?",
				type: "single",
				opts: ["Internship", "Graduate role", "Part-time work", "Research placement", "Exploratory networking"],
			},
			{
				id: "count",
				label: "Drafts per morning:",
				q: "How many outreach drafts would you like?",
				type: "single",
				opts: ["1", "2", "3", "4", "5"],
				def: "3",
			},
			{
				id: "time",
				label: "Morning run time:",
				q: "At what time each morning should research and drafts be prepared?",
				type: "time",
				opt: true,
				hint: "Only used if your AI can run on a schedule.",
			},
			{
				id: "tone",
				label: "Outreach tone:",
				q: "What tone should the outreach have?",
				type: "single",
				opts: ["Concise", "Friendly", "Professional", "Confident"],
			},
		],
	},
];
