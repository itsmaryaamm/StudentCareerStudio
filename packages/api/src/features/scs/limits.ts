import { ORPCError } from "@orpc/client";
import { and, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { db } from "@reactive-resume/db/client";
import { scsAiUsage } from "@reactive-resume/db/schema";
import { env } from "@reactive-resume/env/server";

export type UsageKind = "chat" | "linkedin" | "upload";

/** Chat replies and LinkedIn generations share one daily allowance; uploads have their own lifetime allowance. */
const BUDGET_KINDS: Record<UsageKind, UsageKind[]> = {
	chat: ["chat", "linkedin"],
	linkedin: ["chat", "linkedin"],
	upload: ["upload"],
};

export const startOfUtcDay = (now = new Date()) =>
	new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
export const startOfNextUtcDay = (now = new Date()) => new Date(startOfUtcDay(now).getTime() + 86_400_000);

const limitFor = (kind: UsageKind) => (kind === "upload" ? env.SCS_LIMIT_UPLOADS_TOTAL : env.SCS_LIMIT_CHAT_PER_DAY);

/** Refunded (`error`) calls don't count: a student isn't charged for our failures or Google's. */
async function countUsed(runner: Pick<typeof db, "select">, userId: string, kind: UsageKind) {
	const windowStart = kind === "upload" ? null : startOfUtcDay();
	const [row] = await runner
		.select({ n: sql<number>`count(*)::int` })
		.from(scsAiUsage)
		.where(
			and(
				eq(scsAiUsage.userId, userId),
				inArray(scsAiUsage.kind, BUDGET_KINDS[kind]),
				ne(scsAiUsage.status, "error"),
				windowStart ? gte(scsAiUsage.createdAt, windowStart) : undefined,
			),
		);
	return row?.n ?? 0;
}

export type UsageSummary = {
	chat: { used: number; limit: number; resetsAt: string };
	upload: { used: number; limit: number; resetsAt: null };
};

export async function usageSummary(userId: string): Promise<UsageSummary> {
	const [chat, upload] = await Promise.all([countUsed(db, userId, "chat"), countUsed(db, userId, "upload")]);
	return {
		chat: { used: chat, limit: env.SCS_LIMIT_CHAT_PER_DAY, resetsAt: startOfNextUtcDay().toISOString() },
		upload: { used: upload, limit: env.SCS_LIMIT_UPLOADS_TOTAL, resetsAt: null },
	};
}

/**
 * Take one unit of quota before calling Gemini. Counting and inserting happen under a per-user advisory lock, so
 * ten parallel requests from one student can't slip past the limit. The same transaction enforces the shared
 * circuit-breaker so the one Gemini key stays inside its free quota.
 */
export function reserveUsage(userId: string, kind: UsageKind): Promise<string> {
	return db.transaction(async (tx) => {
		await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`scs-usage:${userId}`}))`);

		const used = await countUsed(tx, userId, kind);
		const limit = limitFor(kind);
		if (used >= limit) {
			const resets = kind === "upload" ? "" : ` Your allowance resets at ${startOfNextUtcDay().toUTCString()}.`;
			throw new ORPCError("TOO_MANY_REQUESTS", {
				message:
					kind === "upload"
						? `You've used all ${limit} document/image analyses in the founding beta.`
						: `You've used your ${limit} AI messages for today.${resets}`,
				data: { kind, limit, used, resetsAt: kind === "upload" ? null : startOfNextUtcDay().toISOString() },
			});
		}

		const [global] = await tx
			.select({ n: sql<number>`count(*)::int` })
			.from(scsAiUsage)
			.where(and(gte(scsAiUsage.createdAt, startOfUtcDay()), ne(scsAiUsage.status, "error")));
		if ((global?.n ?? 0) >= env.SCS_LIMIT_GLOBAL_AI_PER_DAY) {
			throw new ORPCError("SERVICE_UNAVAILABLE", {
				message: "The coach is very busy today and has reached its shared daily limit. Please try again tomorrow.",
				data: { kind, shared: true },
			});
		}

		// Rolling-minute breaker, counted in the database so it holds across instances. Checked before a unit is taken.
		const [lastMinute] = await tx
			.select({ n: sql<number>`count(*)::int` })
			.from(scsAiUsage)
			.where(and(gte(scsAiUsage.createdAt, new Date(Date.now() - 60_000)), ne(scsAiUsage.status, "error")));
		if ((lastMinute?.n ?? 0) >= env.SCS_LIMIT_GLOBAL_AI_PER_MINUTE) {
			throw new ORPCError("SERVICE_UNAVAILABLE", {
				message:
					"The coach is busy right now. Nothing was used from your allowance — please try again in a few seconds.",
				data: { kind, busy: true },
			});
		}

		const [row] = await tx
			.insert(scsAiUsage)
			.values({ userId, kind, status: "reserved" })
			.returning({ id: scsAiUsage.id });
		if (!row) throw new Error("usage reservation failed");
		return row.id;
	});
}

export function commitUsage(id: string, model: string, latencyMs: number) {
	return db.update(scsAiUsage).set({ status: "ok", model, latencyMs }).where(eq(scsAiUsage.id, id));
}

/** Refund the unit and record why, so the admin dashboard can show errors. `reason` must not contain user content. */
export function refundUsage(id: string, reason: string) {
	return db
		.update(scsAiUsage)
		.set({ status: "error", error: reason.slice(0, 300) })
		.where(eq(scsAiUsage.id, id));
}
