// A starting résumé from what the student already told the coach and approved. No AI: each approved fact becomes one
// entry in the matching section, in the student's own words, ready to edit.

export type ProfileFact = { category: string; text: string };

const website = () => ({ url: "", label: "", inlineLink: false });
const base = () => ({ id: crypto.randomUUID(), hidden: false });
const escapeHtml = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

type Operation = { op: "replace"; path: string; value: unknown };

const itemBuilders: Record<string, { section: string; item: (text: string) => Record<string, unknown> }> = {
	experience: {
		section: "experience",
		item: (text) => ({
			...base(),
			company: text,
			position: "",
			location: "",
			period: "",
			website: website(),
			description: "",
			roles: [],
		}),
	},
	education: {
		section: "education",
		item: (text) => ({
			...base(),
			school: text,
			degree: "",
			area: "",
			grade: "",
			location: "",
			period: "",
			website: website(),
			description: "",
		}),
	},
	project: {
		section: "projects",
		item: (text) => ({ ...base(), name: text, period: "", website: website(), description: "" }),
	},
	skill: {
		section: "skills",
		item: (text) => ({ ...base(), icon: "", iconColor: "", name: text, proficiency: "", level: 0, keywords: [] }),
	},
	achievement: {
		section: "awards",
		item: (text) => ({ ...base(), title: text, awarder: "", date: "", website: website(), description: "" }),
	},
	volunteering: {
		section: "volunteer",
		item: (text) => ({
			...base(),
			organization: text,
			location: "",
			period: "",
			website: website(),
			description: "",
		}),
	},
	certification: {
		section: "certifications",
		item: (text) => ({ ...base(), title: text, issuer: "", date: "", website: website(), description: "" }),
	},
	language: {
		section: "languages",
		item: (text) => ({ ...base(), language: text, fluency: "", level: 0 }),
	},
};

type Basics = { name: string; email?: string | undefined; phone?: string | undefined; linkedin?: string | undefined };

/** JSON Patch operations that fill a new blank résumé from approved facts and the contact details they gave. */
export function buildProfileOperations(facts: readonly ProfileFact[], basics: Basics): Operation[] {
	const operations: Operation[] = [];
	if (basics.name.trim()) operations.push({ op: "replace", path: "/basics/name", value: basics.name.trim() });
	if (basics.email?.trim()) operations.push({ op: "replace", path: "/basics/email", value: basics.email.trim() });
	if (basics.phone?.trim()) operations.push({ op: "replace", path: "/basics/phone", value: basics.phone.trim() });
	if (basics.linkedin?.trim()) {
		operations.push({
			op: "replace",
			path: "/basics/customFields",
			value: [
				{
					id: crypto.randomUUID(),
					icon: "linkedin-logo",
					text: basics.linkedin.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/+$/, ""),
					link: basics.linkedin,
				},
			],
		});
	}

	const grouped = new Map<string, Record<string, unknown>[]>();
	const goals: string[] = [];
	for (const fact of facts) {
		const text = fact.text.trim();
		if (!text) continue;
		if (fact.category === "goal") {
			goals.push(text);
			continue;
		}
		const builder = itemBuilders[fact.category];
		if (!builder) continue;
		grouped.set(builder.section, [...(grouped.get(builder.section) ?? []), builder.item(text)]);
	}
	for (const [section, items] of grouped)
		operations.push({ op: "replace", path: `/sections/${section}/items`, value: items });
	if (goals.length)
		operations.push({
			op: "replace",
			path: "/summary/content",
			value: goals.map((goal) => `<p>${escapeHtml(goal)}</p>`).join(""),
		});
	return operations;
}

/** How many approved facts would become entries. */
export const countProfileEntries = (facts: readonly ProfileFact[]) =>
	facts.filter((fact) => fact.text.trim() && (itemBuilders[fact.category] || fact.category === "goal")).length;
