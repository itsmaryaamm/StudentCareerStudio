# Student Career Studio — founding beta runbook

Built on Reactive Resume 6.1.1 (MIT). Everything below is implemented in this repo; nothing is deployed and no paid service is active.

## What was added on top of Reactive Resume

| Area                                                                                                                                                                              | Where                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 50-seat cap + invite code, enforced in the auth hook (advisory-locked seat table)                                                                                                 | `packages/auth/src/beta-seats.ts`, `config.ts`                                                                  |
| Server-side Gemini (key never reaches the browser), conversation memory, quotas with refunds, shared circuit breaker                                                              | `packages/api/src/features/scs/{gemini,limits,chat,upload}.ts`                                                  |
| Shared career profile (facts the student approves) feeding chat, LinkedIn Studio, prompts                                                                                         | `scs/facts.ts`, `apps/web/src/features/studio/`                                                                 |
| LinkedIn Studio, Career Prompts, onboarding, feedback, admin dashboard, privacy notice/settings                                                                                   | `apps/web/src/features/studio/`, `routes/dashboard/*`                                                           |
| First sign-in: chat-only onboarding (name → stage → what they have → contact → guided résumé/LinkedIn upload, or a get-to-know-you interview), then a side coach on the dashboard | `apps/web/src/features/studio/coach/`, `routes/dashboard/route.tsx`, `scs.saveIntake`, chat `mode: "interview"` |
| Optional own Gemini key per student (checked with Google, stored AES-GCM sealed, bypasses shared limits, excluded from exports)                                                   | `scs/byok.ts`, `studio/own-key.tsx`, Settings → Privacy                                                         |
| Schema                                                                                                                                                                            | `packages/db/src/schema/scs.ts`, migration `migrations/20261114143008_parallel_beast`                           |

## Configuration (environment variables)

| Variable                                                                                                                               | Default               | Meaning                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY`                                                                                                                       | –                     | Google AI Studio key. Server only. Without it the coach shows "not switched on".                                                                                                                                                               |
| `SCS_GEMINI_MODEL`                                                                                                                     | RR default for Gemini | Model name.                                                                                                                                                                                                                                    |
| `SCS_BETA_MAX_USERS`                                                                                                                   | 50                    | Founding-beta seats (admins don't count). `0` closes sign-ups.                                                                                                                                                                                 |
| `SCS_BETA_INVITE_CODE`                                                                                                                 | –                     | Free-access code. Sign-up is open; the code (at sign-up or later) gives free AI for a seat. Without it: résumé tools only, AI needs their own Gemini key. Unset = everyone gets a free seat until the cap. Link: `/auth/register?invite=CODE`. |
| `SCS_LIMIT_CHAT_PER_DAY`                                                                                                               | 7                     | Per student per UTC day. Counts chat replies **and** LinkedIn generations.                                                                                                                                                                     |
| `SCS_LIMIT_UPLOADS_TOTAL`                                                                                                              | 3                     | Per student, lifetime, document/image analyses.                                                                                                                                                                                                |
| `SCS_LIMIT_GLOBAL_AI_PER_MINUTE`                                                                                                       | 12                    | Shared rolling-minute breaker (Google free tier: 15/min).                                                                                                                                                                                      |
| `SCS_LIMIT_GLOBAL_AI_PER_DAY`                                                                                                          | 450                   | Shared circuit breaker so the one key stays inside its free quota.                                                                                                                                                                             |
| `SCS_UPLOAD_MAX_BYTES`                                                                                                                 | 4 MiB                 | Max upload.                                                                                                                                                                                                                                    |
| `SCS_GEMINI_BASE_URL`                                                                                                                  | –                     | Tests only (stand-in server). Leave unset in production.                                                                                                                                                                                       |
| Plus RR's own: `DATABASE_URL`, `APP_URL` (must equal the public URL), `AUTH_SECRET`, `ENCRYPTION_SECRET`, `STORAGE_BACKEND`, SMTP\_\*. |

## Making yourself admin

Sign up normally, then on the server:
`DATABASE_URL=... pnpm scs:make-admin you@example.com`
Admin is never granted by sign-up, so nobody can claim it by registering your address first. Admin sees counts, names and emails only — never résumé or chat content. The admin role is re-read from the database on every admin call.

## Seeing who has onboarded

Sign in as the admin and open **`/dashboard/admin`**. The "Finished onboarding" card shows how many students are done and
how many are stuck at which step (`welcome`, `situation`, `inventory`, `contact`, `resume`, `linkedin`, `interview`).
The student table has an Onboarding column (`done` or the step they stopped at) plus approved-fact and résumé counts.
Counts only: never chat or résumé content.

## Before inviting the first students

1. Deploy (see `QUOTAS-AND-COSTS.md`) with `APP_URL` equal to the public URL, `AUTH_SECRET`, `ENCRYPTION_SECRET`, `DATABASE_URL`.
2. Set `GEMINI_API_KEY`, `SCS_BETA_INVITE_CODE`, and `SCS_LIMIT_GLOBAL_AI_PER_DAY` to about 90% of your real Google daily quota.
3. Configure SMTP (`SMTP_HOST/PORT/USER/PASS/FROM`): confirmation and password-reset emails need it. Without it, students are not asked to confirm and cannot reset passwords.
4. Optional Google sign-in: `GOOGLE_CLIENT_ID/SECRET`, redirect URI `<APP_URL>/api/auth/callback/google`.
5. Sign up yourself, run `pnpm scs:make-admin you@example.com`, and walk the onboarding once on the live URL.
6. Share links as `<APP_URL>/auth/register?invite=CODE`.

## Tests

```
node tests/scs/fake-gemini.mjs &                 # stand-in Gemini on :4010 (NOT Gemini)
# server: APP_URL=http://localhost:3001 SCS_BETA_MAX_USERS=4 SCS_BETA_INVITE_CODE=beta-code-1 SCS_LIMIT_GLOBAL_AI_PER_MINUTE=1000 GEMINI_API_KEY=x SCS_GEMINI_BASE_URL=http://localhost:4010/v1beta pnpm start
node tests/scs/api.test.mjs                      # 64 server checks: cap races, quotas, privacy, admin, deletion
# server again with default limits, then:
node tests/scs/e2e.cjs                           # the five workflows + feedback/export/delete in a real browser
pnpm --filter web exec vp test run src/features/studio
```

These prove our plumbing. They do **not** prove Gemini's answer quality or your real quota — see `QUOTAS-AND-COSTS.md`.

## Known gaps before inviting students

1. **Real Gemini** was exercised for chat, facts, LinkedIn, PDF upload and the onboarding interview (API + browser, 2026-11-16). Not tested: real quota limits and answer quality at scale.
2. **No email delivery configured** → no password-reset or verification emails. A student who forgets a password is locked out until you reset it. Configure SMTP (or a free transactional tier) first.
3. Editor "Assistant"/"Improve"/AI-import buttons are RR's bring-your-own-key AI; students who connect a key send data to _that_ provider (disclosed in the privacy notice). Not covered by our limits.
4. Many secondary RR strings still say "Reactive Resume" (homepage components, share dialogs, importer text). Auth, shell, titles, manifest and icons are rebranded.
5. Applications / Career (RR job-search modules) and cover letters still exist by URL but are not in the navigation.
6. UI copy in the new screens is plain English strings (not wrapped for translation).
