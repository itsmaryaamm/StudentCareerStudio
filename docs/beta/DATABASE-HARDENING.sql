-- Student Career Studio: database lock-down (Postgres / Neon). Run as the database OWNER, then follow the steps below.
-- Idempotent: run it again after any deploy that adds tables.
--
-- What it does
--   1. The app gets its own login ("scs_app") that can read and write rows but cannot create, alter or drop anything.
--      If the app were ever tricked into running bad SQL, it still could not delete tables or read other databases' roles.
--   2. Row security is switched on for every table. Any other role (a read-only analytics login, a data API, a leaked
--      second credential) sees NOTHING unless you give it a policy. The app role is let through by name.
--   3. Nobody gets CREATE on the public schema by default.
--
-- Steps
--   a) As the owner:       CREATE ROLE scs_app LOGIN PASSWORD '<a long random password>';
--   b) As the owner:       run this whole file.
--   c) On Render set:      DATABASE_URL           = the connection string for scs_app (same host and database, ?sslmode=require)
--                          DATABASE_MIGRATION_URL = the OWNER's connection string (used only at start-up to run migrations)
--   d) Redeploy.

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO scs_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO scs_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO scs_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO scs_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO scs_app;

DO $$
DECLARE t record;
BEGIN
	FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
		EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
		EXECUTE format('DROP POLICY IF EXISTS scs_app_all ON public.%I', t.tablename);
		EXECUTE format('CREATE POLICY scs_app_all ON public.%I FOR ALL TO scs_app USING (true) WITH CHECK (true)', t.tablename);
	END LOOP;
END
$$;
