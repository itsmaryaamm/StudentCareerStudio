# Deploying the founding beta (Render + Neon) — step by step

Nothing here has been run. Every step is yours to approve. Total time: about 30 minutes. Cost: $0 on free tiers (sleeps when idle) or ≈ $7/month on Render Starter (always awake).

## 0. Before you start

- [ ] A **dedicated** Google AI Studio project and key (so your other tools can't use up the 500 requests/day).
- [ ] A free SMTP account for password-reset emails (e.g. Brevo, Resend) — optional but strongly recommended.
- [ ] Pick an invite code, e.g. `ksu-founders-2026`.

## 1. Database (Neon, free)

1. neon.tech → sign up → **Create project** (any region near your students).
2. Copy the **connection string** (starts with `postgresql://`, ends with `?sslmode=require`).

## 2. Render service

1. render.com → sign up → **New → Blueprint** → connect GitHub repo `itsmaryaamm/StudentCareerStudio`, branch `claude/hopeful-brahmagupta-0uf3p8` (or `main` after you merge).
2. Render reads `render.yaml`. It asks for the values marked `sync: false`:
   | Name                   | Value                                     |
   | ---------------------- | ----------------------------------------- |
   | `DATABASE_URL`         | the Neon string from step 1               |
   | `GEMINI_API_KEY`       | your dedicated project key                |
   | `SCS_BETA_INVITE_CODE` | your invite code                          |
   | `APP_URL`              | leave blank for now                       |
   | `SMTP_*`               | from your email provider (or leave blank) |
3. Choose plan **Free** (or **Starter**) and click **Apply**. First build takes ~10 minutes.
4. When it's live, copy the URL (`https://student-career-studio-xxxx.onrender.com`).
5. **Settings → Environment → `APP_URL`** = that exact URL (https, no trailing slash) → **Save, rebuild & deploy**. Sign-in breaks if `APP_URL` is wrong.

## 3. Make yourself admin

1. Open the URL → `/auth/register?invite=YOURCODE` → create your account.
2. In Neon → **SQL Editor**, run (use your own email):
   ```sql
   update "user" set role = 'admin' where lower(email) = lower('you@example.com');
   ```
   (Admin is never granted by sign-up, so nobody can claim it by registering your address first.)
3. Reload — a **Beta dashboard** item appears in the sidebar.

## 4. Smoke test the live site (15 minutes, do not skip)

Sign up with a second email, then: chat → approve a fact → LinkedIn headline → create résumé → download PDF → Career Prompts → send feedback → Settings → delete the test account. Then check the Beta dashboard shows the activity.

## 5. Invite students

Send `https://<your-url>/auth/register?invite=YOURCODE`. The first 50 get in; the 51st sees "The founding beta is full".

## Known limits on the free setup

- First visit after ~15 idle minutes takes 30–60 s (Render free sleeps).
- Profile pictures are lost on restart (ephemeral disk). Résumés and profile data live in Neon and are safe.
- Neon free has no automatic backups you control: export important data (Settings → Download my data).
- Without SMTP nobody can reset a password.
