import * as pg from "drizzle-orm/pg-core";
import { generateId } from "@reactive-resume/utils/string";
import { user } from "./auth";

/**
 * Student Career Studio beta tables. Every row that holds student content is owned by a user and cascades on
 * account deletion, so deleting the account removes it all and frees the founding-beta seat.
 */

/** One row per founding-beta seat. A seat is reserved before the account exists, then bound to it. */
export const scsBetaSeat = pg.pgTable(
	"scs_beta_seat",
	{
		id: pg.text("id").primaryKey().$defaultFn(generateId),
		email: pg.text("email").notNull(),
		userId: pg
			.text("user_id")
			.unique()
			.references(() => user.id, { onDelete: "cascade" }),
		reservedAt: pg.timestamp("reserved_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [pg.index().on(t.reservedAt)],
);

export type ScsIntake = {
	situation?: string | undefined;
	has?: { resume?: boolean | undefined; linkedin?: boolean | undefined; portfolio?: boolean | undefined } | undefined;
	/** Which of the three they named first: the conversation starts with that one. */
	first?: "resume" | "linkedin" | "portfolio" | undefined;
	contact?: { email?: string | undefined; phone?: string | undefined; portfolio?: string | undefined } | undefined;
};

/** Consent and onboarding state. AI calls are refused until `aiConsentAt` is set. */
export const scsUserState = pg.pgTable("scs_user_state", {
	userId: pg
		.text("user_id")
		.primaryKey()
		.references(() => user.id, { onDelete: "cascade" }),
	aiConsentAt: pg.timestamp("ai_consent_at", { withTimezone: true }),
	privacyAckAt: pg.timestamp("privacy_ack_at", { withTimezone: true }),
	onboardingChoice: pg.text("onboarding_choice").$type<"ai" | "resume" | "linkedin" | "skip">(),
	onboardedAt: pg.timestamp("onboarded_at", { withTimezone: true }),
	/** What the student asked to be called, and where the guided first conversation has got to. */
	preferredName: pg.text("preferred_name"),
	onboardingStep: pg.text("onboarding_step"),
	intake: pg.jsonb("intake").$type<ScsIntake>(),
	/** Optional: the student's own Gemini key, sealed with the server's encryption secret. Never returned or exported. */
	/** This student's own shareable friend code, and who (if anyone) shared theirs with them. */
	referralCode: pg.text("referral_code").unique(),
	referredBy: pg.text("referred_by").references(() => user.id, { onDelete: "set null" }),
	ownGeminiKeyEnc: pg.text("own_gemini_key_enc"),
	ownGeminiKeyPreview: pg.text("own_gemini_key_preview"),
	createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ScsFactCategory =
	| "education"
	| "experience"
	| "project"
	| "skill"
	| "achievement"
	| "volunteering"
	| "certification"
	| "language"
	| "goal"
	| "other";

/** The shared student career profile: facts the student has approved (or is still being asked to verify). */
export const scsCareerFact = pg.pgTable(
	"scs_career_fact",
	{
		id: pg.text("id").primaryKey().$defaultFn(generateId),
		userId: pg
			.text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		category: pg.text("category").$type<ScsFactCategory>().notNull(),
		text: pg.text("text").notNull(),
		status: pg.text("status").$type<"proposed" | "approved" | "rejected">().notNull().default("proposed"),
		source: pg.text("source").$type<"chat" | "upload" | "resume" | "manual">().notNull(),
		createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: pg
			.timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(t) => [pg.index().on(t.userId, t.status)],
);

export const scsChatThread = pg.pgTable(
	"scs_chat_thread",
	{
		id: pg.text("id").primaryKey().$defaultFn(generateId),
		userId: pg
			.text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		title: pg.text("title").notNull().default("New conversation"),
		createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: pg.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [pg.index().on(t.userId, t.updatedAt)],
);

export const scsChatMessage = pg.pgTable(
	"scs_chat_message",
	{
		id: pg.text("id").primaryKey().$defaultFn(generateId),
		threadId: pg
			.text("thread_id")
			.notNull()
			.references(() => scsChatThread.id, { onDelete: "cascade" }),
		userId: pg
			.text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		role: pg.text("role").$type<"user" | "assistant">().notNull(),
		content: pg.text("content").notNull(),
		createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [pg.index().on(t.threadId, t.createdAt)],
);

/** Quota ledger. `error` rows are refunded (not counted). Never stores prompts, content or keys. */
export const scsAiUsage = pg.pgTable(
	"scs_ai_usage",
	{
		id: pg.text("id").primaryKey().$defaultFn(generateId),
		userId: pg
			.text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		kind: pg.text("kind").$type<"chat" | "linkedin" | "upload">().notNull(),
		status: pg.text("status").$type<"reserved" | "ok" | "error">().notNull().default("reserved"),
		error: pg.text("error"),
		model: pg.text("model"),
		latencyMs: pg.integer("latency_ms"),
		createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [pg.index().on(t.userId, t.kind, t.createdAt), pg.index().on(t.createdAt)],
);

export const scsLinkedinDraft = pg.pgTable(
	"scs_linkedin_draft",
	{
		userId: pg
			.text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		section: pg.text("section").notNull(),
		content: pg.text("content").notNull(),
		updatedAt: pg.timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [pg.primaryKey({ columns: [t.userId, t.section] })],
);

export const scsFeedback = pg.pgTable(
	"scs_feedback",
	{
		id: pg.text("id").primaryKey().$defaultFn(generateId),
		userId: pg
			.text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		rating: pg.integer("rating").notNull(),
		category: pg.text("category").$type<"bug" | "idea" | "praise" | "other">().notNull(),
		message: pg.text("message").notNull(),
		page: pg.text("page"),
		createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [pg.index().on(t.createdAt)],
);
