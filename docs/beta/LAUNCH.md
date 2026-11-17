# Launch checklist (what is done, what only the owner can do)

## Done

- App deployed on Render (https://student-career-studio.onrender.com) with the redesign: sign-in/up, chat onboarding, dashboard with career coach, Career Lab (4 missions),
  LinkedIn Studio, Settings, feedback, friend codes, own-AI-key option, phone layout, marketing home page.
- Free limits per student: 7 messages a day and 3 document reads; friends who join with a code get more (see README).
- Server-side seat cap (`SCS_BETA_MAX_USERS`, default 50) and a shared daily AI cap (`SCS_LIMIT_GLOBAL_AI_PER_DAY`).

## Needs you (accounts and DNS I cannot reach)

1. **Make yourself admin** (once): sign up on the site, then run on your computer
   `DATABASE_URL=<your Neon url> pnpm scs:make-admin you@email.com`. Admin page: `/dashboard/admin`.
2. **Email (SMTP)**: without it nobody gets confirmation or password-reset emails, and a student who forgets a password
   is locked out. Add `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` in Render → Environment
   (Brevo, Resend or Gmail app-password all work). Confirmation links then become required at sign-up.
3. **Google sign-in** (optional): create a Web OAuth client in Google Cloud and add `GOOGLE_CLIENT_ID` and
   `GOOGLE_CLIENT_SECRET`. Redirect URI: `<site>/api/auth/callback/google`; authorised origin: `<site>`.
4. **Your domain**: see below.
5. **Render plan**: the free web service sleeps after ~15 minutes idle (first visit takes about a minute) and its disk is
   wiped on redeploy. Switch to Starter (about $7/month) before real traffic.
6. Set `SCS_LIMIT_GLOBAL_AI_PER_DAY` to about 90% of the daily quota shown in Google AI Studio for your key.

## Domain: maryamimran.com/studentcareerstudio

The app expects to live at the root of a host name (its links, assets, sign-in cookies and API all use `/…` paths), so a
sub-folder like `/studentcareerstudio` would need a base-path change in the app plus a reverse proxy on maryamimran.com.
The reliable setup, which takes about five minutes:

1. Already done: `studentcareerstudio.maryamimran.com` is added to the Render service (status: unverified until step 2).
2. At your DNS provider add a CNAME record: name `studentcareerstudio`, value `student-career-studio.onrender.com`.
3. When Render shows it verified, set the environment variable `APP_URL=https://studentcareerstudio.maryamimran.com`
   (and `https://…` in the Google OAuth client if you use Google). Redeploy.
4. On maryamimran.com make `/studentcareerstudio` redirect (301) to `https://studentcareerstudio.maryamimran.com`. Where your
   site is hosted decides how: a `_redirects` line on Netlify
   (`/studentcareerstudio  https://studentcareerstudio.maryamimran.com  301`), `redirects` in `vercel.json`, or a page rule
   on Cloudflare.
   Students then use either address. If you really need the address to stay `maryamimran.com/studentcareerstudio` while they
   browse, that is the base-path project mentioned above; ask for it separately.

## Security (audited)

- No API keys or secrets in the browser bundle. Student Gemini keys are stored server-side and never sent back.
- Cross-user access sweep (`tests/scs/idor-sweep.mjs`): no route lets one student read or change another's data.
- Rate limits (`tests/scs/rate-limit.mjs`): sign-in 20/min per IP plus 10 failed tries per account per 15 min; sign-up 12/min; emails 4/hour per address; scs endpoints budgeted per user or IP. On Render set `CLIENT_IP_HEADER=CF-Connecting-IP` (already in render.yaml) or every visitor shares one bucket.
- Every form and API input is cleaned (tags, hidden characters, non-http links removed): `packages/utils/src/text-clean.ts`.
- Passkeys removed. Sign-in is email + password, or Google.

## Lock down the database (needs your database owner login)

1. Create the app role: `CREATE ROLE scs_app LOGIN PASSWORD '<long random>';`
2. Run `docs/beta/DATABASE-HARDENING.sql` as the owner (safe to re-run after deploys that add tables).
3. On Render: `DATABASE_URL` = scs_app connection string, `DATABASE_MIGRATION_URL` = owner connection string.
4. Redeploy and check sign-in still works.

## Google sign-in

Create a Web OAuth client (see `GOOGLE-SIGNIN.md`), then set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` on Render.
