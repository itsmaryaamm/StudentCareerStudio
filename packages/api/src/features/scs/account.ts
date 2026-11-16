import type { ScsIntake } from "@reactive-resume/db/schema";
import { ORPCError } from "@orpc/client";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@reactive-resume/db/client";
import {
	resume,
	scsAiUsage,
	scsCareerFact,
	scsChatMessage,
	scsChatThread,
	scsFeedback,
	scsLinkedinDraft,
	scsUserState,
	user,
} from "@reactive-resume/db/schema";
import { env } from "@reactive-resume/env/server";
import { isGeminiConfigured } from "./gemini";
import { startOfUtcDay, usageSummary } from "./limits";

export const accountService = {
	async state(userId: string) {
		const [row] = await db.select().from(scsUserState).where(eq(scsUserState.userId, userId));
		const [facts] = await db
			.select({ n: count() })
			.from(scsCareerFact)
			.where(and(eq(scsCareerFact.userId, userId), eq(scsCareerFact.status, "approved")));
		const [resumes] = await db.select({ n: count() }).from(resume).where(eq(resume.userId, userId));
		const [account] = await db.select({ role: user.role }).from(user).where(eq(user.id, userId));
		return {
			isAdmin: account?.role === "admin",
			aiConsentAt: row?.aiConsentAt?.toISOString() ?? null,
			privacyAckAt: row?.privacyAckAt?.toISOString() ?? null,
			onboardingChoice: row?.onboardingChoice ?? null,
			onboardedAt: row?.onboardedAt?.toISOString() ?? null,
			preferredName: row?.preferredName ?? null,
			onboardingStep: row?.onboardingStep ?? null,
			intake: row?.intake ?? {},
			approvedFacts: facts?.n ?? 0,
			resumeCount: resumes?.n ?? 0,
			usage: await usageSummary(userId),
			aiAvailable: isGeminiConfigured(),
		};
	},

	async acceptConsent(userId: string) {
		const now = new Date();
		await db
			.insert(scsUserState)
			.values({ userId, aiConsentAt: now, privacyAckAt: now })
			.onConflictDoUpdate({ target: scsUserState.userId, set: { aiConsentAt: now, privacyAckAt: now } });
	},

	async revokeConsent(userId: string) {
		await db.update(scsUserState).set({ aiConsentAt: null }).where(eq(scsUserState.userId, userId));
	},

	async setOnboarding(userId: string, choice: "ai" | "resume" | "linkedin" | "skip") {
		const now = new Date();
		await db
			.insert(scsUserState)
			.values({ userId, onboardingChoice: choice, onboardedAt: now })
			.onConflictDoUpdate({ target: scsUserState.userId, set: { onboardingChoice: choice, onboardedAt: now } });
	},

	/** Saves progress of the guided first conversation. `intake` is merged, so each step can send only what is new. */
	async saveIntake(
		userId: string,
		input: {
			preferredName?: string | undefined;
			step?: string | undefined;
			intake?: ScsIntake | undefined;
			complete?: boolean | undefined;
		},
	) {
		const [row] = await db.select().from(scsUserState).where(eq(scsUserState.userId, userId));
		const old = row?.intake ?? {};
		const intake: ScsIntake = {
			...old,
			...input.intake,
			has: { ...old.has, ...input.intake?.has },
			contact: { ...old.contact, ...input.intake?.contact },
		};
		const set = {
			...(input.preferredName ? { preferredName: input.preferredName } : {}),
			...(input.step ? { onboardingStep: input.step } : {}),
			...(input.complete ? { onboardedAt: new Date(), onboardingStep: "done" } : {}),
			intake,
		};
		await db
			.insert(scsUserState)
			.values({ userId, ...set })
			.onConflictDoUpdate({ target: scsUserState.userId, set });
	},

	/** Everything this feature stores about the student, as JSON they can download. Résumés export from their own page. */
	async exportData(userId: string) {
		const [facts, threads, messages, drafts, feedback, state] = await Promise.all([
			db.select().from(scsCareerFact).where(eq(scsCareerFact.userId, userId)),
			db.select().from(scsChatThread).where(eq(scsChatThread.userId, userId)),
			db.select().from(scsChatMessage).where(eq(scsChatMessage.userId, userId)),
			db.select().from(scsLinkedinDraft).where(eq(scsLinkedinDraft.userId, userId)),
			db.select().from(scsFeedback).where(eq(scsFeedback.userId, userId)),
			db.select().from(scsUserState).where(eq(scsUserState.userId, userId)),
		]);
		const resumes = await db
			.select({ id: resume.id, name: resume.name, data: resume.data })
			.from(resume)
			.where(eq(resume.userId, userId));
		return {
			exportedAt: new Date().toISOString(),
			state: state[0] ?? null,
			careerProfile: facts,
			chatThreads: threads,
			chatMessages: messages,
			linkedinDrafts: drafts,
			feedback,
			resumes,
		};
	},

	async submitFeedback(
		userId: string,
		input: {
			rating: number;
			category: "bug" | "idea" | "praise" | "other";
			message: string;
			page?: string | undefined;
		},
	) {
		const [today] = await db
			.select({ n: count() })
			.from(scsFeedback)
			.where(and(eq(scsFeedback.userId, userId), gte(scsFeedback.createdAt, startOfUtcDay())));
		if ((today?.n ?? 0) >= 20)
			throw new ORPCError("TOO_MANY_REQUESTS", { message: "Thanks — that's plenty of feedback for today!" });
		await db.insert(scsFeedback).values({
			userId,
			rating: input.rating,
			category: input.category,
			message: input.message.trim(),
			page: input.page?.slice(0, 120) ?? null,
		});
	},
};

/** Public numbers only: the sign-up page and the app shell may read these. */
export async function betaInfo() {
	const { betaSeatsTaken } = await import("@reactive-resume/auth/beta-seats");
	const taken = await betaSeatsTaken();
	return {
		maxSeats: env.SCS_BETA_MAX_USERS,
		seatsLeft: Math.max(0, env.SCS_BETA_MAX_USERS - taken),
		inviteRequired: Boolean(env.SCS_BETA_INVITE_CODE),
	};
}

/** Reads the role from the database on every call, so demoting or banning an admin takes effect immediately. */
export async function requireAdmin(userId: string) {
	const [row] = await db.select({ role: user.role, banned: user.banned }).from(user).where(eq(user.id, userId));
	if (row?.role !== "admin" || row.banned) throw new ORPCError("FORBIDDEN", { message: "Admins only." });
}

export const adminService = {
	async stats() {
		const day = startOfUtcDay();
		const [users] = await db
			.select({ n: count() })
			.from(user)
			.where(sql`${user.role} is distinct from 'admin'`);
		const [anyUsers] = await db.select({ n: count() }).from(user);
		const [withResume] = await db
			.execute<{ n: number }>(sql`select count(distinct user_id)::int as n from ${resume}`)
			.then((r) => r.rows as { n: number }[]);
		// "Completed": a name plus at least one experience or education entry. Counts only; never the content.
		const [completed] = await db
			.execute<{ n: number }>(
				sql`select count(*)::int as n from ${resume} where coalesce(data->'basics'->>'name','') <> '' and (coalesce(jsonb_array_length(data->'sections'->'experience'->'items'),0) > 0 or coalesce(jsonb_array_length(data->'sections'->'education'->'items'),0) > 0)`,
			)
			.then((r) => r.rows as { n: number }[]);
		const [totalResumes] = await db.select({ n: count() }).from(resume);
		// Onboarding funnel for students (not admins): finished, or stuck at which step. Counts only.
		const funnel = await db
			.execute<{ step: string; n: number }>(
				sql`select case when s.onboarded_at is not null then 'done' else coalesce(s.onboarding_step, 'not started') end as step, count(*)::int as n
					from "user" u left join ${scsUserState} s on s.user_id = u.id
					where u.role is distinct from 'admin' and coalesce(u.is_anonymous, false) = false group by 1`,
			)
			.then((r) => r.rows as { step: string; n: number }[]);
		const ai = await db
			.select({ kind: scsAiUsage.kind, status: scsAiUsage.status, n: count() })
			.from(scsAiUsage)
			.where(gte(scsAiUsage.createdAt, day))
			.groupBy(scsAiUsage.kind, scsAiUsage.status);
		const [aiTotal] = await db
			.select({ n: count() })
			.from(scsAiUsage)
			.where(sql`${scsAiUsage.status} <> 'error'`);
		const [errors24h] = await db
			.select({ n: count() })
			.from(scsAiUsage)
			.where(and(eq(scsAiUsage.status, "error"), gte(scsAiUsage.createdAt, new Date(Date.now() - 86_400_000))));
		const [fb] = await db
			.select({ n: count(), avg: sql<number>`coalesce(avg(${scsFeedback.rating}),0)::float` })
			.from(scsFeedback);
		const { betaSeatsTaken } = await import("@reactive-resume/auth/beta-seats");
		return {
			registeredUsers: users?.n ?? 0,
			allAccounts: anyUsers?.n ?? 0,
			seatsTaken: await betaSeatsTaken(),
			maxSeats: env.SCS_BETA_MAX_USERS,
			usersWithResume: (withResume as unknown as { n: number } | undefined)?.n ?? 0,
			totalResumes: totalResumes?.n ?? 0,
			onboarding: funnel,
			completedResumes: (completed as unknown as { n: number } | undefined)?.n ?? 0,
			aiToday: ai.map((r) => ({ kind: r.kind, status: r.status, n: r.n })),
			aiTotal: aiTotal?.n ?? 0,
			aiErrors24h: errors24h?.n ?? 0,
			feedbackCount: fb?.n ?? 0,
			feedbackAverage: Math.round((fb?.avg ?? 0) * 10) / 10,
			limits: {
				chatPerDay: env.SCS_LIMIT_CHAT_PER_DAY,
				uploadsTotal: env.SCS_LIMIT_UPLOADS_TOTAL,
				globalPerDay: env.SCS_LIMIT_GLOBAL_AI_PER_DAY,
				model: env.SCS_GEMINI_MODEL ?? "default",
				geminiConfigured: isGeminiConfigured(),
			},
		};
	},

	async users() {
		const rows = await db.execute<{
			id: string;
			name: string;
			email: string;
			created_at: string;
			role: string | null;
			resumes: number;
			ai: number;
			step: string;
			facts: number;
		}>(sql`
			select u.id, u.name, u.email, u.created_at, u.role,
				case when s.onboarded_at is not null then 'done' else coalesce(s.onboarding_step, 'not started') end as step,
				(select count(*)::int from ${scsCareerFact} f where f.user_id = u.id and f.status = 'approved') as facts,
				(select count(*)::int from ${resume} r where r.user_id = u.id) as resumes,
				(select count(*)::int from ${scsAiUsage} a where a.user_id = u.id and a.status <> 'error') as ai
			from "user" u left join ${scsUserState} s on s.user_id = u.id order by u.created_at desc limit 200`);
		return (
			rows.rows as {
				id: string;
				name: string;
				email: string;
				created_at: string;
				role: string | null;
				resumes: number;
				ai: number;
				step: string;
				facts: number;
			}[]
		).map((r) => ({
			id: r.id,
			name: r.name,
			email: r.email,
			createdAt: new Date(r.created_at).toISOString(),
			isAdmin: r.role === "admin",
			resumes: r.resumes,
			aiRequests: r.ai,
			onboarding: r.step,
			approvedFacts: r.facts,
		}));
	},

	async errors() {
		const rows = await db
			.select({ id: scsAiUsage.id, kind: scsAiUsage.kind, error: scsAiUsage.error, at: scsAiUsage.createdAt })
			.from(scsAiUsage)
			.where(eq(scsAiUsage.status, "error"))
			.orderBy(desc(scsAiUsage.createdAt))
			.limit(50);
		return rows.map((r) => ({ id: r.id, kind: r.kind, reason: r.error ?? "unknown", at: r.at.toISOString() }));
	},

	async feedback() {
		const rows = await db
			.select({
				id: scsFeedback.id,
				rating: scsFeedback.rating,
				category: scsFeedback.category,
				message: scsFeedback.message,
				page: scsFeedback.page,
				at: scsFeedback.createdAt,
				name: user.name,
			})
			.from(scsFeedback)
			.innerJoin(user, eq(user.id, scsFeedback.userId))
			.orderBy(desc(scsFeedback.createdAt))
			.limit(100);
		return rows.map((r) => ({ ...r, at: r.at.toISOString() }));
	},
};
