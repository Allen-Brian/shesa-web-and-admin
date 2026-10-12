-- Migration: service_role_select_finance
--
-- Grants SELECT on every finance.* table to service_role. Without this,
-- any edge fn that does `.insert(...).select('id').maybeSingle()` on a
-- service-role client fails with a Postgres 42501 ("permission denied
-- for table charges") — the INSERT itself is fine, but the RETURNING
-- clause needs SELECT which was never granted at table-creation time.
--
-- The M1 finance schema migration only granted INSERT/UPDATE/DELETE to
-- service_role, on the assumption that RLS handles read gating. That's
-- true for the anon/authenticated paths, but service_role is the one
-- issuing writes with RETURNING, and Postgres checks table-level GRANT
-- before RLS.
--
-- Idempotent: GRANT is repeatable, and ALTER DEFAULT PRIVILEGES only
-- sets the default rule (safe to re-run).

GRANT SELECT ON ALL TABLES IN SCHEMA finance TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA finance
  GRANT SELECT ON TABLES TO service_role;
