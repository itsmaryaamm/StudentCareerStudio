# Student Career Studio — founding beta runbook

Built on Reactive Resume 6.1.1 (MIT). Everything below is implemented in this repo; nothing is deployed and no paid service is active.

## What was added on top of Reactive Resume

| Area                                                                                                                 | Where                                                                                 |
| -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 50-seat cap + invite code, enforced in the auth hook (advisory-locked seat table)                                    | `packages/auth/src/beta-seats.ts`, `config.ts`                                        |
| Server-side Gemini (key never reaches the browser), conversation memory, quotas with refunds, shared circuit breaker | `packages/api/src/features/scs/{gemini,limits,chat,upload}.ts`                        |
| Shared career profile (facts the student approves) feeding chat, LinkedIn Studio, prompts                            | `scs/facts.ts`, `apps/web/src/features/studio/`                                       |
| LinkedIn Studio, Career Prompts, onboarding, feedback, admin dashboard, privacy notice/settings                      | `apps/web/src/features/studio/`, `routes/dashboard/*`                                 |
| Schema                                                                                                               | `packages/db/src/schema/scs.ts`, migration `migrations/20261114143008_parallel_beast` |

## Configuration (environment variables)

| Variable                                                                                                                               | Default               | Meaning                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------ |
| `GEMINI_API_KEY`                                                                                                                       | –                     | Google AI Studio key. Server only. Without it the coach shows "not switched on".                 |
| `SCS_GEMINI_MODEL`                                                                                                                     | RR default for Gemini | Model name.                                                                                      |
| `SCS_BETA_MAX_USERS`                                                                                                                   | 50                    | Founding-beta seats (admins don't count). `0` closes sign-ups.                                   |
| `SCS_BETA_INVITE_CODE`                                                                                                                 | –                     | If set, sign-up requires it (share links as `/auth/register?invite=CODE`). Strongly recommended. |
| `SCS_LIMIT_CHAT_PER_DAY`                                                                                                               | 7                     | Per student per UTC day. Counts chat replies **and** LinkedIn generations.                       |
| `SCS_LIMIT_UPLOADS_TOTAL`                                                                                                              | 3                     | Per student, lifetime, document/image analyses.                                                  |
| `SCS_LIMIT_IMPROVE_PER_DAY`                                                                                                            | 8                     | Per student per UTC day: "Improve" suggestions in the résumé editor (separate from chat).        |
| `SCS_LIMIT_GLOBAL_AI_PER_MINUTE`                                                                                                       | 12                    | Shared rolling-minute breaker (Google free tier: 15/min).                                        |
| `SCS_LIMIT_GLOBAL_AI_PER_DAY`                                                                                                          | 450                   | Shared circuit breaker so the one key stays inside its free quota.                               |
| `SCS_UPLOAD_MAX_BYTES`                                                                                                                 | 4 MiB                 | Max upload.                                                                                      |
| `SCS_GEMINI_BASE_URL`                                                                                                                  | –                     | Tests only (stand-in server). Leave unset in production.                                         |
| Plus RR's own: `DATABASE_URL`, `APP_URL` (must equal the public URL), `AUTH_SECRET`, `ENCRYPTION_SECRET`, `STORAGE_BACKEND`, SMTP\_\*. |

## Making yourself admin

Sign up normally, then on the server:
`DATABASE_URL=... pnpm scs:make-admin you@example.com`
Admin is never granted by sign-up, so nobody can claim it by registering your address first. Admin sees counts, names and emails only — never résumé or chat content. The admin role is re-read from the database on every admin call.

## Tests

```
node tests/scs/fake-gemini.mjs &                 # stand-in Gemini on :4010 (NOT Gemini)
# server: APP_URL=http://localhost:3001 SCS_BETA_MAX_USERS=4 SCS_BETA_INVITE_CODE=beta-code-1 GEMINI_API_KEY=x SCS_GEMINI_BASE_URL=http://localhost:4010/v1beta pnpm start
node tests/scs/api.test.mjs                      # 64 server checks: cap races, quotas, privacy, admin, deletion
# server again with default limits, then:
node tests/scs/e2e.cjs                           # the five workflows + feedback/export/delete in a real browser
# REAL Gemini (needs GEMINI_API_KEY; start the server WITHOUT SCS_GEMINI_BASE_URL; spends ~6 requests + 1 upload):
node tests/scs/live-gemini.cjs                   # sign-up, consent, chat, memory, facts, PDF upload, LinkedIn, usage
pnpm --filter web exec vp test run src/features/studio
```

These prove our plumbing. They do **not** prove Gemini's answer quality or your real quota — see `QUOTAS-AND-COSTS.md`.

## How AI works for a student

- **Use mine (default, free, limited):** the app's Gemini key, with the daily allowances above.
- **Use my own (unlimited):** Settings → AI. A student who connects a tested key of their own is never limited by us (coach, LinkedIn Studio, uploads, Improve all use their key; the Assistant button appears too). Their text goes to _their_ provider.
- The profile is built live from the student's résumés (read-only, "From your résumé") plus facts they approved in chat, so nothing has to be typed twice.

## Known gaps before inviting students

1. **Real Gemini tested** (API run + browser run `tests/scs/live-gemini.cjs`, 15 checks, model `gemini-3.5-flash-lite`, 0.8–2.8 s per call). Not yet tested: behaviour near Google's daily/minute limits with many students, and answer quality across many different students.
2. **No email delivery configured** → no password-reset or verification emails. A student who forgets a password is locked out until you reset it. Configure SMTP (or a free transactional tier) first.
3. Editor "Assistant"/"Improve"/AI-import buttons are RR's bring-your-own-key AI; students who connect a key send data to _that_ provider (disclosed in the privacy notice). Not covered by our limits.
4. Many secondary RR strings still say "Reactive Resume" (homepage components, share dialogs, importer text). Auth, shell, titles, manifest and icons are rebranded.
5. Applications / Career (RR job-search modules) and cover letters still exist by URL but are not in the navigation.
6. UI copy in the new screens is plain English strings (not wrapped for translation).
