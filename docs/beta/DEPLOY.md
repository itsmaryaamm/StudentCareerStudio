# Deploy to Render + Neon (about 15 minutes)

I could not do this from the build environment (no network path or credentials for Render/Neon), so these are the exact clicks.

1. **Neon**: neon.com -> New project (region near your students). Copy the **pooled** connection string. It must end with `?sslmode=require`.
2. **Render**: Dashboard -> New -> **Blueprint** -> pick this repo and branch. `render.yaml` creates the web service. When asked, fill:
   - `DATABASE_URL` = the Neon string
   - `GEMINI_API_KEY` = your AI Studio key
   - `SCS_BETA_INVITE_CODE` = a code you choose
   - `SMTP_*` = your mail provider (needed for email confirmation and password reset)
   - `GOOGLE_CLIENT_ID/SECRET` = optional, for "Continue with Google"
3. First deploy builds the Docker image (several minutes) and applies migrations at startup. `APP_URL` is taken from Render's `RENDER_EXTERNAL_URL`; set `APP_URL` yourself if you add a custom domain.
4. Google sign-in only: in Google Cloud add the redirect URI `https://<your-service>.onrender.com/api/auth/callback/google`.
5. Open the site, sign up with the invite code, then run once against Neon: `DATABASE_URL=<neon string> pnpm scs:make-admin you@example.com`. Admin page: `/dashboard/admin`.
6. Set `SCS_LIMIT_GLOBAL_AI_PER_DAY` to ~90% of the daily quota shown in AI Studio.
7. Invite link: `https://<your-service>.onrender.com/auth/register?invite=CODE`.

Free Render sleeps after ~15 minutes idle (30 to 60 s first load) and its disk is wiped on redeploy. Move `plan` to `starter` before real students arrive.
