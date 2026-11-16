import { and, eq, gt, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@reactive-resume/db/client";
import { scsBetaSeat } from "@reactive-resume/db/schema";
import { env } from "@reactive-resume/env/server";

/** A reserved seat whose account never got created (failed sign-up) frees itself after this long. */
const RESERVATION_TTL_MS = 10 * 60 * 1000;
const SEAT_LOCK_KEY = 0x5c5_b3a7; // arbitrary constant: serialises every seat decision in the database

export class BetaClosedError extends Error {
	constructor(
		public readonly reason: "full" | "invite",
		message: string,
	) {
		super(message);
	}
}

// Admin accounts (the founder) don't use up a student seat.
const countedSeats = () =>
	and(
		or(isNotNull(scsBetaSeat.userId), gt(scsBetaSeat.reservedAt, new Date(Date.now() - RESERVATION_TTL_MS))),
		sql`not exists (select 1 from "user" u where u.id = ${scsBetaSeat.userId} and u.role = 'admin')`,
	);

/**
 * Reserve one founding-beta seat for `email`, or throw. The count and the insert happen under one advisory lock in
 * one transaction, so two simultaneous sign-ups can't both take the last seat. Enforced here on the server,
 * whatever the browser does.
 */
export async function reserveBetaSeat(email: string, inviteCode: string | null | undefined): Promise<boolean> {
	const code = inviteCode?.trim() ?? "";
	if (env.SCS_BETA_INVITE_CODE) {
		// Sign-up is open. No code means a standard account without a free seat; a wrong code is a typo to report.
		if (!code) return false;
		if (code !== env.SCS_BETA_INVITE_CODE) throw new BetaClosedError("invite", "That invite code isn't valid.");
	}

	const normalized = email.trim().toLowerCase();
	await db.transaction(async (tx) => {
		await tx.execute(sql`select pg_advisory_xact_lock(${SEAT_LOCK_KEY})`);
		// Stale reservations are removed so the table doesn't grow and the count stays honest.
		await tx
			.delete(scsBetaSeat)
			.where(and(isNull(scsBetaSeat.userId), lt(scsBetaSeat.reservedAt, new Date(Date.now() - RESERVATION_TTL_MS))));
		// The same email retrying a failed sign-up reuses its own pending reservation.
		await tx.delete(scsBetaSeat).where(and(isNull(scsBetaSeat.userId), eq(scsBetaSeat.email, normalized)));

		const [{ taken = 0 } = {}] = await tx
			.select({ taken: sql<number>`count(*)::int` })
			.from(scsBetaSeat)
			.where(countedSeats());
		if (taken >= env.SCS_BETA_MAX_USERS) {
			throw new BetaClosedError(
				"full",
				`The founding beta is full (${env.SCS_BETA_MAX_USERS} students). Thank you for your interest — we'll open more seats soon.`,
			);
		}
		await tx.insert(scsBetaSeat).values({ email: normalized });
	});
	return true;
}

/** An existing standard account redeems an invite code for a free founding-beta seat. Idempotent. */
export async function redeemBetaCode(userId: string, email: string, inviteCode: string): Promise<void> {
	if (await hasFreeAccess(userId)) return;
	if (!env.SCS_BETA_INVITE_CODE || !inviteCode.trim())
		throw new BetaClosedError("invite", "That invite code isn't valid.");
	await reserveBetaSeat(email, inviteCode);
	await bindBetaSeat(email, userId);
}

/** Free AI access: a founding-beta seat, or an admin. Everyone else uses their own Gemini key. */
export async function hasFreeAccess(userId: string): Promise<boolean> {
	const [seat] = await db.select({ id: scsBetaSeat.id }).from(scsBetaSeat).where(eq(scsBetaSeat.userId, userId));
	if (seat) return true;
	const [row] = await db
		.execute<{ role: string | null }>(sql`select role from "user" where id = ${userId}`)
		.then((r) => r.rows as { role: string | null }[]);
	return row?.role === "admin";
}

/** Bind the reserved seat to the created account. */
export async function bindBetaSeat(email: string, userId: string): Promise<void> {
	await db
		.update(scsBetaSeat)
		.set({ userId })
		.where(and(isNull(scsBetaSeat.userId), eq(scsBetaSeat.email, email.trim().toLowerCase())));
}

export async function betaSeatsTaken(): Promise<number> {
	const [{ taken = 0 } = {}] = await db
		.select({ taken: sql<number>`count(*)::int` })
		.from(scsBetaSeat)
		.where(countedSeats());
	return taken;
}
