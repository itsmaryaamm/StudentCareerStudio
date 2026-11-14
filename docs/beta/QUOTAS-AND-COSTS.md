# Gemini quota, hosting and cost notes (as of 2026-11-14)

## Gemini quota — NOT verified against your project

I had no access to your Google AI Studio project, so **actual quotas are unverified**. Published figures conflict:

- Recent community readings (Sept–Oct 2026) of AI Studio for free projects: Flash-Lite ≈ **10–15 requests/minute and ≈500 requests/day**; Flash models as low as **20/day**; Pro models 0. Older posts claim 1,000–1,500/day.
- Limits are per **project** (not per key), reset at midnight Pacific, and are "not guaranteed" by Google.
  **Action for you:** open aistudio.google.com → your project → Rate limits, read the numbers for the model you will use, then set `SCS_LIMIT_GLOBAL_AI_PER_DAY` to ~90% of its daily requests figure.

## What the quotas support (if Flash-Lite ≈ 500 RPD)

- Worst case: 50 students × 10 messages = **500/day** — right at the ceiling; the 450 circuit breaker trips first.
- Realistic: ~30% of students active on a given day × ~5 messages ≈ **75–100 requests/day** → comfortably inside the free tier.
- Uploads: 50 × 3 = 150 total over the whole beta — negligible.
- If the real daily cap is 20/day (Flash), the free tier supports **~2 students/day** — switch to Flash-Lite or enable billing.
- RPM: 10–15/min is the other constraint; 50 students rarely collide, and a Google 429 is refunded and shown as "try again in a minute".
- Free-tier content may be used by Google to improve products — the privacy notice says so. Paid-tier terms differ.

## Hosting (free tiers, community-sourced, verify on vendor pages)

| Option                                                                                                           | Fit                 | Catch                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Render free web service + **Neon** free Postgres                                                                 | Works for ≤50 users | Render sleeps after ~15 min idle (30–60 s cold start); Render's own free Postgres **expires after 30 days**, so use Neon. Filesystem is ephemeral → set `STORAGE_BACKEND` to S3/R2 (free R2 tier) or accept losing profile pictures. 512 MB RAM fit for RR + WASM PDF **untested**. |
| Supabase Postgres                                                                                                | OK                  | Pauses after 7 idle days; no backups.                                                                                                                                                                                                                                               |
| Fly.io / Koyeb / Railway                                                                                         | Not free in 2026    | Card required / small credit only.                                                                                                                                                                                                                                                  |
| Recommendation: Render Starter (~$7/mo, no sleep) + Neon free, only when you approve. Nothing has been deployed. |

## Expected cost for 50 students

- Free-tier path: **$0** (Render free + Neon + Gemini free) with cold starts and the quota ceiling above.
- Reliable path: ≈ **$7–10/month** (Starter web service; Gemini still free at realistic usage). Even if Gemini were paid, 500 requests/day at ~2k tokens each is on the order of a few dollars a month for a Flash-Lite-class model (**estimate from older price lists — verify current pricing**).
- Domain (optional) ≈ $10–15/year; SMTP free tiers exist for this volume.
