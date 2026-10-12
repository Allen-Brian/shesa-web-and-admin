-- Baseline 1/3 — extensions
--
-- Part of the 2026-09-02 squash. The 112 migrations that built this schema
-- between 2026-06-29 and 2026-09-02 are archived under
-- `supabase/migrations/_archive/` — kept in git for history, out of the
-- migration path.
--
-- Runs first because the schema baseline defines functions that reference
-- pgmq, and the platform baseline creates queues in it.
--
-- ── Why these are guarded ───────────────────────────────────────────────
-- The originals were not, and it cost us. An unguarded `CREATE EXTENSION`
-- is an early hard stop on any project where the extension is not
-- allowlisted — and because pgtap sat at position 4 of 109, that stop came
-- before almost the entire schema. The pg_cron migrations already used this
-- pattern after an incident; it is now applied uniformly.
--
-- Supabase pre-installs pgcrypto, uuid-ossp, pg_net, pg_stat_statements and
-- supabase_vault, so they are not declared here.

-------------------------------------------------------------------------------
-- pgmq — the notification outbox queues (ADR-0008)
-------------------------------------------------------------------------------

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pgmq;
EXCEPTION WHEN insufficient_privilege OR undefined_file THEN
  RAISE NOTICE 'pgmq unavailable on this project; notification queues will be skipped.';
END $$;

-------------------------------------------------------------------------------
-- pgtap — the database test framework
-------------------------------------------------------------------------------
-- Installed into its own schema, and only outside production. pgtap is a
-- TEST framework; the original migration put it into production databases
-- unconditionally, which is a needless surface. CI and local both run with
-- APP_ENV != production, so `supabase test db` still works everywhere it
-- needs to.
--
-- The guard reads a GUC rather than an env var because a migration has no
-- access to the process environment. Set it per environment with:
--
--     ALTER DATABASE postgres SET app.environment = 'production';
--
-- Unset (the local and CI default) means "not production", so pgtap installs.

DO $$
BEGIN
  IF coalesce(current_setting('app.environment', true), 'local') = 'production' THEN
    RAISE NOTICE 'production database; skipping pgtap.';
    RETURN;
  END IF;

  CREATE SCHEMA IF NOT EXISTS pgtap;
  CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA pgtap;
EXCEPTION WHEN insufficient_privilege OR undefined_file THEN
  RAISE NOTICE 'pgtap unavailable on this project; database tests cannot run here.';
END $$;
