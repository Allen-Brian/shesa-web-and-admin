-- Migration: enable_pgtap_extension
--
-- Installs the pgTAP test framework — per ADR-0034, this is how Shesa
-- tests RLS, security-definer functions, triggers, and append-only
-- constraints. Tests live at supabase/tests/*.test.sql and run via
-- `pnpm db:test`.
--
-- The extension goes in its own `pgtap` schema (Supabase's recommended
-- layout) so test helpers don't pollute `public` or our domain schemas.

CREATE SCHEMA IF NOT EXISTS pgtap;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA pgtap;

COMMENT ON SCHEMA pgtap IS
  'Home of the pgTAP extension. Test files include `SET search_path = pgtap, public, …` so the assertion functions resolve.';
