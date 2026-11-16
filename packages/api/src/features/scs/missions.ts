import { ORPCError } from "@orpc/client";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@reactive-resume/db/client";
import { scsMission } from "@reactive-resume/db/schema";

export const MISSION_IDS = ["discover", "linkedin", "scout", "intel"] as const;
const MAX_SAVED = 30;

export const missionInputSchema = z.strictObject({
	id: z.string().min(1).max(64).optional(),
	missionId: z.enum(MISSION_IDS),
	name: z.string().trim().min(1).max(80),
	answers: z
		.record(z.string().max(40), z.union([z.string().max(2000), z.array(z.string().max(400)).max(30)]))
		.refine((a) => Object.keys(a).length <= 40, "Too many answers"),
	prompt: z.string().max(14_000),
	templateVersion: z.number().int().min(1).max(100).default(1),
	selectedFactIds: z.array(z.string().max(64)).max(100),
});
export type MissionInput = z.infer<typeof missionInputSchema>;

const view = (m: typeof scsMission.$inferSelect) => ({
	id: m.id,
	missionId: m.missionId,
	name: m.name,
	answers: m.answers,
	prompt: m.prompt,
	templateVersion: m.templateVersion,
	selectedFactIds: m.selectedFactIds,
	updatedAt: m.updatedAt.toISOString(),
});

async function owned(userId: string, id: string) {
	// Scoped by user: someone else's id is indistinguishable from a missing one.
	const [row] = await db
		.select()
		.from(scsMission)
		.where(and(eq(scsMission.id, id), eq(scsMission.userId, userId)));
	if (!row) throw new ORPCError("NOT_FOUND", { message: "That mission wasn't found." });
	return row;
}

export const missionsService = {
	async list(userId: string) {
		const rows = await db
			.select()
			.from(scsMission)
			.where(eq(scsMission.userId, userId))
			.orderBy(desc(scsMission.updatedAt))
			.limit(MAX_SAVED);
		return rows.map(view);
	},

	/** Saves a new mission, or updates the one named by `id`. */
	async save(userId: string, input: MissionInput) {
		const values = {
			missionId: input.missionId,
			name: input.name,
			answers: input.answers,
			prompt: input.prompt,
			templateVersion: input.templateVersion,
			selectedFactIds: input.selectedFactIds,
			updatedAt: new Date(),
		};
		if (input.id) {
			await owned(userId, input.id);
			const [row] = await db
				.update(scsMission)
				.set(values)
				.where(and(eq(scsMission.id, input.id), eq(scsMission.userId, userId)))
				.returning();
			if (!row) throw new ORPCError("NOT_FOUND", { message: "That mission wasn't found." });
			return view(row);
		}
		const [count] = await db
			.select({ n: sql<number>`count(*)::int` })
			.from(scsMission)
			.where(eq(scsMission.userId, userId));
		if ((count?.n ?? 0) >= MAX_SAVED)
			throw new ORPCError("BAD_REQUEST", { message: `You can keep up to ${MAX_SAVED} missions. Delete one first.` });
		const [row] = await db
			.insert(scsMission)
			.values({ userId, ...values })
			.returning();
		if (!row) throw new Error("mission insert failed");
		return view(row);
	},

	async duplicate(userId: string, id: string) {
		const m = await owned(userId, id);
		return this.save(userId, {
			missionId: m.missionId as MissionInput["missionId"],
			name: `${m.name} (copy)`.slice(0, 80),
			answers: m.answers,
			prompt: m.prompt,
			templateVersion: m.templateVersion,
			selectedFactIds: m.selectedFactIds,
		});
	},

	async remove(userId: string, id: string) {
		await owned(userId, id);
		await db.delete(scsMission).where(and(eq(scsMission.id, id), eq(scsMission.userId, userId)));
	},
};
