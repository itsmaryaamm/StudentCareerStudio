import type { Fact } from "./schemas";
import type { ScsFactCategory } from "@reactive-resume/db/schema";
import { ORPCError } from "@orpc/client";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@reactive-resume/db/client";
import { resume, scsCareerFact } from "@reactive-resume/db/schema";

const MAX_FACTS_PER_USER = 200;
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const words = (s: string) =>
	new Set(
		norm(s)
			.replace(/[^\p{L}\p{N} ]/gu, "")
			.split(" ")
			.filter((w) => w.length > 2),
	);
/** Near-duplicate: most of the shorter fact's words already appear in an existing one (a reworded restatement). */
export function isNearDuplicate(a: string, b: string): boolean {
	const x = words(a);
	const y = words(b);
	if (x.size === 0 || y.size === 0) return false;
	let shared = 0;
	for (const w of x) if (y.has(w)) shared += 1;
	return shared / Math.min(x.size, y.size) >= 0.8;
}
export const stripHtml = (html: string) =>
	html
		.replace(/<\/(p|li|div|br)>/gi, " ")
		.replace(/<[^>]+>/g, "")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/\s+/g, " ")
		.trim();

const toFact = (row: typeof scsCareerFact.$inferSelect): Fact => ({
	id: row.id,
	category: row.category,
	text: row.text,
	status: row.status,
	source: row.source,
	createdAt: row.createdAt.toISOString(),
});

export const factsService = {
	/** Proposed + approved facts. Rejected ones are kept only so they aren't proposed again. */
	async list(userId: string): Promise<Fact[]> {
		const rows = await db
			.select()
			.from(scsCareerFact)
			.where(and(eq(scsCareerFact.userId, userId), ne(scsCareerFact.status, "rejected")))
			.orderBy(desc(scsCareerFact.createdAt));
		return rows.map(toFact);
	},

	async approved(userId: string, limit = 40): Promise<Fact[]> {
		const rows = await db
			.select()
			.from(scsCareerFact)
			.where(and(eq(scsCareerFact.userId, userId), eq(scsCareerFact.status, "approved")))
			.orderBy(desc(scsCareerFact.createdAt))
			.limit(limit);
		return rows.map(toFact);
	},

	/** Insert as `proposed`, skipping duplicates and anything the student already rejected. */
	async propose(
		userId: string,
		facts: { category: ScsFactCategory; text: string }[],
		source: "chat" | "upload" | "resume",
	): Promise<Fact[]> {
		if (facts.length === 0) return [];
		const existing = await db
			.select({ text: scsCareerFact.text })
			.from(scsCareerFact)
			.where(eq(scsCareerFact.userId, userId));
		if (existing.length >= MAX_FACTS_PER_USER) return [];
		const seen = new Set(existing.map((e) => norm(e.text)));
		const fresh = facts
			.map((f) => ({ ...f, text: f.text.trim() }))
			.filter((f) => {
				if (!f.text || seen.has(norm(f.text)) || existing.some((e) => isNearDuplicate(e.text, f.text))) return false;
				existing.push({ text: f.text });
				seen.add(norm(f.text));
				return true;
			})
			.slice(0, MAX_FACTS_PER_USER - existing.length);
		if (fresh.length === 0) return [];
		const rows = await db
			.insert(scsCareerFact)
			.values(fresh.map((f) => ({ userId, category: f.category, text: f.text, source, status: "proposed" as const })))
			.returning();
		return rows.map(toFact);
	},

	async add(userId: string, category: ScsFactCategory, text: string): Promise<Fact> {
		const [dupe] = await db
			.select({ id: scsCareerFact.id })
			.from(scsCareerFact)
			.where(and(eq(scsCareerFact.userId, userId), eq(scsCareerFact.text, text.trim())))
			.limit(1);
		if (dupe) throw new ORPCError("CONFLICT", { message: "That's already in your profile." });
		const [row] = await db
			.insert(scsCareerFact)
			.values({ userId, category, text: text.trim(), source: "manual", status: "approved" })
			.returning();
		if (!row) throw new Error("fact insert failed");
		return toFact(row);
	},

	// Every mutation is scoped by user_id: another student's fact id simply matches nothing (404).
	async setStatus(userId: string, id: string, status: "approved" | "rejected"): Promise<Fact> {
		const [row] = await db
			.update(scsCareerFact)
			.set({ status })
			.where(and(eq(scsCareerFact.id, id), eq(scsCareerFact.userId, userId)))
			.returning();
		if (!row) throw new ORPCError("NOT_FOUND", { message: "That item wasn't found." });
		return toFact(row);
	},

	async edit(userId: string, id: string, text: string): Promise<Fact> {
		const [row] = await db
			.update(scsCareerFact)
			.set({ text: text.trim() })
			.where(and(eq(scsCareerFact.id, id), eq(scsCareerFact.userId, userId)))
			.returning();
		if (!row) throw new ORPCError("NOT_FOUND", { message: "That item wasn't found." });
		return toFact(row);
	},

	async remove(userId: string, id: string): Promise<void> {
		const rows = await db
			.delete(scsCareerFact)
			.where(and(eq(scsCareerFact.id, id), eq(scsCareerFact.userId, userId)))
			.returning({ id: scsCareerFact.id });
		if (rows.length === 0) throw new ORPCError("NOT_FOUND", { message: "That item wasn't found." });
	},

	async approveMany(userId: string, ids: string[]): Promise<number> {
		if (ids.length === 0) return 0;
		const rows = await db
			.update(scsCareerFact)
			.set({ status: "approved" })
			.where(and(eq(scsCareerFact.userId, userId), inArray(scsCareerFact.id, ids)))
			.returning({ id: scsCareerFact.id });
		return rows.length;
	},

	/**
	 * Turn the student's own résumés into *proposed* facts. No AI and no quota: it only reshapes data the student
	 * already wrote. Nothing becomes part of the profile until they approve it.
	 */
	async importFromResumes(userId: string): Promise<{ proposed: Fact[]; resumesRead: number }> {
		const rows = await db.select({ data: resume.data }).from(resume).where(eq(resume.userId, userId));
		const out: { category: ScsFactCategory; text: string }[] = [];
		const clip = (s: string, n = 220) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
		const join = (...p: (string | undefined)[]) =>
			p
				.map((x) => x?.trim())
				.filter(Boolean)
				.join(", ");
		for (const { data } of rows) {
			const sections = (data as { sections?: Record<string, { items?: Record<string, unknown>[] }> }).sections ?? {};
			const items = (k: string) => (sections[k]?.items ?? []).filter((i) => !i.hidden);
			const s = (v: unknown) => (typeof v === "string" ? v : "");
			for (const i of items("education"))
				out.push({ category: "education", text: join(join(s(i.degree), s(i.area)), s(i.school), s(i.period)) });
			for (const i of items("experience")) {
				const desc = stripHtml(s(i.description));
				out.push({
					category: "experience",
					text: clip(`${join(s(i.position), s(i.company), s(i.period))}${desc ? `: ${desc}` : ""}`),
				});
			}
			for (const i of items("projects")) {
				const desc = stripHtml(s(i.description));
				out.push({ category: "project", text: clip(`${s(i.name)}${desc ? `: ${desc}` : ""}`) });
			}
			const skillNames = items("skills")
				.flatMap((i) => [s(i.name), ...(Array.isArray(i.keywords) ? (i.keywords as unknown[]).map(s) : [])])
				.filter(Boolean);
			if (skillNames.length)
				out.push({ category: "skill", text: clip(`Skills: ${[...new Set(skillNames)].join(", ")}`, 280) });
			for (const i of items("certifications"))
				out.push({ category: "certification", text: join(s(i.title), s(i.issuer), s(i.date)) });
			for (const i of items("volunteer"))
				out.push({ category: "volunteering", text: clip(join(s(i.organization), s(i.period))) });
			for (const i of items("awards"))
				out.push({ category: "achievement", text: join(s(i.title), s(i.awarder), s(i.date)) });
			const langs = items("languages")
				.map((i) => s(i.language))
				.filter(Boolean);
			if (langs.length) out.push({ category: "language", text: `Languages: ${langs.join(", ")}` });
		}
		const usable = out.filter((f) => f.text.length >= 3).slice(0, 60);
		return { proposed: await factsService.propose(userId, usable, "resume"), resumesRead: rows.length };
	},
};
