import { eq, sql } from "drizzle-orm";
import { db } from "@reactive-resume/db/client";
import { scsUserState } from "@reactive-resume/db/schema";

// No 0/O/1/I/L: codes get read aloud and typed from a phone.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

export const normalizeReferralCode = (value: unknown) =>
	typeof value === "string" ? value.trim().toUpperCase().slice(0, 32) : "";

const newCode = () =>
	Array.from({ length: CODE_LENGTH }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");

/** The student's own friend code, made the first time it's needed. */
export async function ensureReferralCode(userId: string): Promise<string> {
	const [row] = await db
		.select({ code: scsUserState.referralCode })
		.from(scsUserState)
		.where(eq(scsUserState.userId, userId));
	if (row?.code) return row.code;
	for (let attempt = 0; attempt < 6; attempt++) {
		const code = newCode();
		try {
			await db
				.insert(scsUserState)
				.values({ userId, referralCode: code })
				.onConflictDoUpdate({
					target: scsUserState.userId,
					// Never overwrite a code another request just made.
					set: { referralCode: sql`coalesce(${scsUserState.referralCode}, ${code})` },
				});
			const [saved] = await db
				.select({ code: scsUserState.referralCode })
				.from(scsUserState)
				.where(eq(scsUserState.userId, userId));
			if (saved?.code) return saved.code;
		} catch {
			// A collision with another student's code: try another.
		}
	}
	throw new Error("could not make a referral code");
}

export type ReferralResult = "applied" | "unknown" | "own" | "already";

/** Records that `userId` joined with a friend's code. A student can be referred once, and never by themselves. */
export async function applyReferral(userId: string, rawCode: unknown): Promise<ReferralResult> {
	const code = normalizeReferralCode(rawCode);
	if (!code) return "unknown";
	const [friend] = await db
		.select({ userId: scsUserState.userId })
		.from(scsUserState)
		.where(eq(scsUserState.referralCode, code));
	if (!friend) return "unknown";
	if (friend.userId === userId) return "own";
	const [mine] = await db
		.select({ by: scsUserState.referredBy })
		.from(scsUserState)
		.where(eq(scsUserState.userId, userId));
	if (mine?.by) return "already";
	await db
		.insert(scsUserState)
		.values({ userId, referredBy: friend.userId })
		.onConflictDoUpdate({ target: scsUserState.userId, set: { referredBy: friend.userId } });
	return "applied";
}
