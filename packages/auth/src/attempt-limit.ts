import { authRateLimitStorage } from "./rate-limit";

type Rule = { window: number; max: number };

// One instance's view while there is no shared store. Entries expire on their own; the map is capped so a flood of made-up
// account names can't grow it without limit (a full map refuses new keys instead of forgetting old ones).
const local = new Map<string, { count: number; expiresAt: number }>();
const MAX_KEYS = 20_000;

/** Counts one attempt against `key` ("sign-in:ada@example.com"). `window` is in seconds. */
// oxlint-disable-next-line require-await -- the shared store is async; the per-instance path answers at once
export async function consumeAttempt(
	key: string,
	rule: Rule,
): Promise<{ allowed: boolean; retryAfter: number | null }> {
	if (authRateLimitStorage) return authRateLimitStorage.consume(`attempt:${key}`, rule);
	const now = Date.now();
	const entry = local.get(key);
	const live = entry && entry.expiresAt > now ? entry : undefined;
	if (live && live.count >= rule.max) return { allowed: false, retryAfter: Math.ceil((live.expiresAt - now) / 1000) };
	if (!live && local.size >= MAX_KEYS) {
		for (const [k, v] of local) if (v.expiresAt <= now) local.delete(k);
		if (local.size >= MAX_KEYS) return { allowed: false, retryAfter: 60 };
	}
	local.set(key, { count: (live?.count ?? 0) + 1, expiresAt: live?.expiresAt ?? now + rule.window * 1000 });
	return { allowed: true, retryAfter: null };
}
