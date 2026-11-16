import { ORPCError } from "@orpc/client";
import { eq } from "drizzle-orm";
import { db } from "@reactive-resume/db/client";
import { scsUserState } from "@reactive-resume/db/schema";
import { env } from "@reactive-resume/env/server";
import { decryptCredential, encryptCredential } from "../ai/credentials";
import { commitUsage, refundUsage, reserveUsage, type UsageKind } from "./limits";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

/** The student's own key, decrypted for one call. Null when they use the shared coach (or it can't be read). */
export async function ownGeminiKey(userId: string): Promise<string | null> {
	const [row] = await db
		.select({ enc: scsUserState.ownGeminiKeyEnc })
		.from(scsUserState)
		.where(eq(scsUserState.userId, userId));
	if (!row?.enc) return null;
	try {
		return decryptCredential(row.enc);
	} catch {
		return null;
	}
}

/**
 * One AI call's accounting. With the shared key it takes quota first (and refunds on failure). With the student's own
 * key nothing is counted and no shared limit applies: they are spending their own Google quota.
 */
export async function leaseGemini(userId: string, kind: UsageKind) {
	const apiKey = await ownGeminiKey(userId);
	const id = apiKey ? null : await reserveUsage(userId, kind);
	return {
		apiKey: apiKey ?? undefined,
		commit: async (model: string, latencyMs: number) => {
			if (id) await commitUsage(id, model, latencyMs);
		},
		refund: async (reason: string) => {
			if (id) await refundUsage(id, reason);
		},
	};
}

export const byokService = {
	/** Checks the key with Google, then stores it sealed. The key itself is never returned. */
	async set(userId: string, rawKey: string) {
		const apiKey = rawKey.trim();
		if (!/^[\w.-]{20,200}$/.test(apiKey))
			throw new ORPCError("BAD_REQUEST", { message: "That doesn't look like a Gemini API key." });
		let status: number;
		try {
			const res = await fetch(`${env.SCS_GEMINI_BASE_URL ?? GEMINI_BASE}/models?pageSize=1`, {
				headers: { "x-goog-api-key": apiKey },
				signal: AbortSignal.timeout(15_000),
			});
			status = res.status;
		} catch {
			throw new ORPCError("SERVICE_UNAVAILABLE", { message: "Couldn't reach Google to check the key. Try again." });
		}
		if (status === 400 || status === 401 || status === 403)
			throw new ORPCError("BAD_REQUEST", { message: "Google rejected that key. Check you copied all of it." });
		if (status >= 500 || status === 429)
			throw new ORPCError("SERVICE_UNAVAILABLE", { message: "Google couldn't check the key right now. Try again." });
		const sealed = encryptCredential(apiKey);
		const set = { ownGeminiKeyEnc: sealed.encryptedApiKey, ownGeminiKeyPreview: sealed.apiKeyPreview };
		await db
			.insert(scsUserState)
			.values({ userId, ...set })
			.onConflictDoUpdate({ target: scsUserState.userId, set });
		return { preview: sealed.apiKeyPreview };
	},

	async clear(userId: string) {
		await db
			.update(scsUserState)
			.set({ ownGeminiKeyEnc: null, ownGeminiKeyPreview: null })
			.where(eq(scsUserState.userId, userId));
	},
};
