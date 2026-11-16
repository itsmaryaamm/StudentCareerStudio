# Deploy to Render (about 10 minutes)

I could not do this from the build environment (no network path or credentials for Render), so these are the exact clicks.

1. **Render**: Dashboard -> New -> **Blueprint** -> pick this repo and branch. `render.yaml` creates the web service and its Postgres database (no Neon needed). When asked, fill:
   - `GEMINI_API_KEY` = your AI Studio key
   - `SMTP_*` = your mail provider (needed for email confirmation and password reset)
   - `GOOGLE_CLIENT_ID/SECRET` = optional, for "Continue with Google"
2. First deploy builds the Docker image (several minutes) and applies migrations at startup. `APP_URL` is taken from Render's `RENDER_EXTERNAL_URL`; set `APP_URL` yourself if you add a custom domain.
3. Google sign-in only: in Google Cloud add the redirect URI `https://<your-service>.onrender.com/api/auth/callback/google`.
4. Open the site, sign up, then make yourself admin: in Render open the database, copy its **External Database URL**, then run `DATABASE_URL=<that url> pnpm scs:make-admin you@example.com` on your computer. Admin page: `/dashboard/admin`.
5. Set `SCS_LIMIT_GLOBAL_AI_PER_DAY` to ~90% of the daily quota shown in AI Studio.
6. Share the site address. Anyone can sign up (first 50 seats). Each student gets their own friend code in Settings → Privacy: friends who join with it, and the student who shared it, get a bigger free AI allowance.

Free Render sleeps after ~15 minutes idle (30 to 60 s first load) and its disk is wiped on redeploy. Move `plan` to `starter` before real students arrive.

**Free database warning:** Render deletes a free Postgres 30 days after creation (with a short grace period). Before then, upgrade the database to a paid plan in the Render dashboard (about $6/month), or students lose everything.
