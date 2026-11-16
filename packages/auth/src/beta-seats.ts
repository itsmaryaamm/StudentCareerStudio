import { and, eq, gt, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { db } from "@reactive-resume/db/client";
import { scsBetaSeat } from "@reactive-resume/db/schema";
import { env } from "@reactive-resume/env/server";

/** A reserved seat whose account never got created (failed sign-up) frees itself after this long. */
const RESERVATION_TTL_MS = 10 * 60 * 1000;
const SEAT_LOCK_KEY = 0x5c5_b3a7; // arbitrary constant: serialises every seat decision in the database

export class BetaClosedError extends Error {
	constructor(
		public readonly reason: "full",
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
export async function reserveBetaSeat(email: string): Promise<void> {
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
