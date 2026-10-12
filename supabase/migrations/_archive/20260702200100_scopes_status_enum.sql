-- Migration: scopes_status_enum
--
-- Replaces the boolean `is_active` on core.scopes with a three-value
-- `status` enum (active | inactive | archived). Motivated by the clusters
-- spec (planning 2026-07-02) which says scopes are **soft-deleted via
-- status, never hard-deleted**: `archived` is a distinct state from
-- `inactive` (temporarily paused) and both need to be representable.
--
-- Migration shape:
--   1. New enum `core.scope_status`.
--   2. New column `scopes.status` defaulting to 'active'.
--   3. Backfill: is_active=true → status='active', false → status='inactive'.
--   4. Drop `scopes_type_active_idx` (partial on is_active) and drop
--      `scopes.is_active` itself.
--   5. New composite index `(scope_type, status)` for the "active X of type
--      Y" queries every list page runs.
--
-- Backward compat:
--   Nothing in the runtime queries `is_active` directly except two admin
--   list pages (rewritten in the same PR). No RLS policy or trigger reads
--   the column, so dropping in this migration is safe.

-------------------------------------------------------------------------------
-- 1. Enum
-------------------------------------------------------------------------------

CREATE TYPE core.scope_status AS ENUM ('active', 'inactive', 'archived');

COMMENT ON TYPE core.scope_status IS
  'Soft-delete state for scopes. `active` = normal; `inactive` = temporarily paused (dues collection halted, admins can restore); `archived` = permanently retired (kept for referential integrity + audit). Hard DELETE is never used — spec 2026-07-02.';

-------------------------------------------------------------------------------
-- 2. Add column + backfill
-------------------------------------------------------------------------------

ALTER TABLE core.scopes
  ADD COLUMN status core.scope_status NOT NULL DEFAULT 'active';

UPDATE core.scopes
   SET status = CASE WHEN is_active THEN 'active'::core.scope_status
                                    ELSE 'inactive'::core.scope_status END;

COMMENT ON COLUMN core.scopes.status IS
  'Scope lifecycle state. Replaces the pre-2026-07-02 `is_active` boolean. Consumers filter with status = ''active'' rather than is_active = TRUE.';

-------------------------------------------------------------------------------
-- 3. Drop the old index + column
-------------------------------------------------------------------------------

DROP INDEX IF EXISTS core.scopes_type_active_idx;

ALTER TABLE core.scopes DROP COLUMN is_active;

-------------------------------------------------------------------------------
-- 4. New composite index
-------------------------------------------------------------------------------
-- "Active branches", "archived batches", etc. — the (scope_type, status)
-- pair serves the every-list-page filter shape.

CREATE INDEX scopes_type_status_idx
  ON core.scopes (scope_type, status);
