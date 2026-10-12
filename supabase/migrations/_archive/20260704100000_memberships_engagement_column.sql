-- Migration: memberships_engagement_column
--
-- Introduces the manual `engagement` tier on `core.memberships` per the
-- 2026-07-03 Membership section design lock. Engagement is an ordered
-- ladder the admin moves people along; it is ORTHOGONAL to
-- `membership_status` (governance standing) and NOT derived from finance
-- signals. See `memory/project_phase2_membership_locks.md` for the
-- full rationale.
--
-- Enum values are LOWERCASE (`dormant | normal | engaged | committed`)
-- to match every existing enum in the schema (`scope_status`,
-- `membership_status`, `chapter_kind`, `membership_join_method`).
-- Postgres enums are case-sensitive; making engagement the one
-- PascalCase enum would silently break every hand-written query that
-- used the wrong case (`WHERE engagement = 'committed'` returning zero
-- rows with no error). UI display casing is a `formatEngagementTier()`
-- domain-helper concern — presentation is not storage.
--
-- Default `'normal'` for every seeded row; existing rows are backfilled
-- via the DEFAULT during ALTER TABLE.
--
-- Vocabulary discipline pinned:
--   `membership_status = 'passive'` — governance standing (on record but
--     inactive at this scope). Toggled via the mark_passive flow.
--   `engagement = 'dormant'`       — devotion tier (admin's judgment).
--     Toggled via `membership.engagement.set`.
-- These are DIFFERENT columns for DIFFERENT questions and MUST NOT be
-- collapsed. Docstrings, action names, and UI copy never use the two
-- words as synonyms.

-------------------------------------------------------------------------------
-- 1. Enum type
-------------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'engagement_tier' AND typnamespace = 'core'::regnamespace) THEN
    CREATE TYPE core.engagement_tier AS ENUM (
      'dormant',
      'normal',
      'engaged',
      'committed'
    );
  END IF;
END $$;

COMMENT ON TYPE core.engagement_tier IS
  'Manual admin-set devotion tier on a membership. Ordered ladder: dormant < normal < engaged < committed. Default normal on entry. Orthogonal to membership_status; never derived from finance.';

-------------------------------------------------------------------------------
-- 2. Column
-------------------------------------------------------------------------------

ALTER TABLE core.memberships
  ADD COLUMN IF NOT EXISTS engagement core.engagement_tier NOT NULL DEFAULT 'normal';

COMMENT ON COLUMN core.memberships.engagement IS
  'Manual devotion tier — dormant / normal / engaged / committed. Admin-set via membership.engagement.set. Default normal. NOT derived from finance or membership_status.';

-------------------------------------------------------------------------------
-- 3. Index — for filter dropdowns / count aggregates
-------------------------------------------------------------------------------

CREATE INDEX memberships_engagement_idx
  ON core.memberships (engagement);
