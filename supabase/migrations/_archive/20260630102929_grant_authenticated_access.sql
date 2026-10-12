-- Migration: grant_authenticated_access
--
-- Postgres access checks happen in two layers BEFORE RLS even runs:
--   1. Schema USAGE   — required to "see" anything in a schema
--   2. Table privileges (SELECT / INSERT / UPDATE / DELETE) — required
--                       per-operation
-- RLS is a filter on TOP of these grants; it can deny but not enable
-- what wasn't granted.
--
-- The E2/E3/E4 migrations enabled RLS on every table but never
-- granted schema USAGE or full table privileges to the `authenticated`
-- role. It went unnoticed because every prior caller path was either
-- service_role (BYPASSRLS), the postgres role inside a SECURITY DEFINER
-- function, or the pgTAP runner as superuser.
--
-- E5's RLS pgTAP tests are the first time we exercise the real
-- `authenticated` role path. This migration grants everything that
-- the RLS policies in `rls_core` and `rls_audit` then narrow.
--
-- The grants here are deliberately broad (the WIDEST any policy might
-- allow); RLS does the per-row filtering. That's the standard
-- Postgres + RLS layering: GRANT widely, RLS narrowly.

-------------------------------------------------------------------------------
-- 1. Schema USAGE
-------------------------------------------------------------------------------

GRANT USAGE ON SCHEMA core  TO authenticated, service_role;
GRANT USAGE ON SCHEMA audit TO authenticated, service_role;

-------------------------------------------------------------------------------
-- 2. core.* table privileges
-------------------------------------------------------------------------------
-- profiles: own-row policy covers SELECT/INSERT/UPDATE.
GRANT SELECT, INSERT, UPDATE ON TABLE core.profiles            TO authenticated, service_role;

-- scopes + scope_capabilities: read-only for clients (no INSERT/UPDATE
-- policy = default deny for those operations even if granted; we
-- don't grant them so a missing policy is obvious in a future audit).
GRANT SELECT                  ON TABLE core.scopes              TO authenticated, service_role;
GRANT SELECT                  ON TABLE core.scope_capabilities  TO authenticated, service_role;

-- Catalog tables: read-only (system data, mutated via SQL migrations only).
GRANT SELECT                  ON TABLE core.roles               TO authenticated, service_role;
GRANT SELECT                  ON TABLE core.permissions         TO authenticated, service_role;
GRANT SELECT                  ON TABLE core.role_permissions    TO authenticated, service_role;

-- role_assignments: SELECT + INSERT + UPDATE allowed by RLS policies in
-- `rls_core` (grant, revoke). DELETE is never allowed (revoke via
-- UPDATE to preserve history).
GRANT SELECT, INSERT, UPDATE  ON TABLE core.role_assignments    TO authenticated, service_role;

-- role_history: read-only for clients (writes only via the trigger
-- which runs SECURITY DEFINER as owner — owner doesn't need the grant).
GRANT SELECT                  ON TABLE core.role_history        TO authenticated, service_role;

-------------------------------------------------------------------------------
-- 3. audit.* table privileges
-------------------------------------------------------------------------------
-- audit_entries: SELECT only. INSERT goes via audit.log_event() which
-- runs SECURITY DEFINER (owner = postgres, no grant needed). The
-- INSERT policy in `rls_audit` (WITH CHECK false) blocks direct
-- INSERTs even if the grant existed.
GRANT SELECT                  ON TABLE audit.audit_entries      TO authenticated, service_role;
