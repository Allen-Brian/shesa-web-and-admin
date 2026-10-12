-- Migration: create_exco_schema
--
-- Phase 2 creates the `exco` schema per the schemas-per-phase rule
-- (memory `feedback_schemas_per_phase.md`). Owns governance-flow
-- surfaces: events, event RSVPs, event audiences, announcements,
-- announcement audiences, admin notifications. The command palette
-- materialized index is deferred; see the Phase 2 plan §Open items.
--
-- This migration creates the schema shell + grants. Actual table
-- definitions land in per-concern migrations in Epics 2.7 (events),
-- 2.8 (announcements), 2.10 (admin notifications).

CREATE SCHEMA IF NOT EXISTS exco;

COMMENT ON SCHEMA exco IS
  'Phase 2 governance flows: events, announcements, admin notifications, RSVPs, pledges. Same RLS + Edge Function authority pattern as core (per Phase 2 ADR-0037).';

-- Data-API access: the PostgREST layer needs USAGE on the schema to
-- expose tables via .from() calls. Table-level GRANTs land per-table
-- as they're created.
GRANT USAGE ON SCHEMA exco TO authenticated, service_role;

-- The default privileges on new tables/functions in this schema
-- extend to service_role only. Authenticated grants are added
-- per-table so RLS is the primary gate (matches the Phase 0
-- init_core_schema pattern).
ALTER DEFAULT PRIVILEGES IN SCHEMA exco
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA exco
  GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA exco
  GRANT ALL ON FUNCTIONS TO service_role;

-- Note: `supabase/config.toml` [api] `schemas` array needs `exco`
-- appended so PostgREST exposes it via the Data API. That edit lands
-- in the SAME PR as this migration.
