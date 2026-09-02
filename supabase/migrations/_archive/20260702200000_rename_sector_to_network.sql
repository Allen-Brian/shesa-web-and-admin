-- Migration: rename_sector_to_network
--
-- Renames the `sector` scope-type concept to `network` across the DB.
-- Trigger: the Clusters spec locks the user-facing term as "Professional
-- Networks" (planning conversation 2026-07-02). Keeping the schema aligned
-- avoids a two-vocabulary drift where UI says "network" and SQL says
-- "sector" — the kind of tangle that gets expensive later.
--
-- What this migration renames:
--   1. Enum value:  core.scope_type 'sector' → 'network'.
--   2. Column:      core.members.sector_scope_id → network_scope_id.
--   3. Index:       members_sector_scope_id_idx → members_network_scope_id_idx.
--   4. Trigger fn:  core.members_check_scope_types() — sector clause becomes
--                   network; error messages updated. Trigger recreated to
--                   pick up the new UPDATE-OF column list.
--   5. Descriptions in the permission catalog that mentioned "sector".
--
-- What this migration does NOT touch:
--   - The Edge Function directories `create-sector` / `update-sector` and
--     their `sectorScopeId` payloads — those are code renames, handled
--     alongside this migration in the same PR but outside DDL.
--   - `packages/domain/imports` / `packages/types` — cascaded in code.
--
-- Note on `ALTER TYPE ... RENAME VALUE`: Postgres 12+ supports it in-place
-- (no data rewrite), and it cascades to every column, constraint, and
-- policy that references the enum. Safe for a live migration.

-------------------------------------------------------------------------------
-- 1. Enum value rename
-------------------------------------------------------------------------------

ALTER TYPE core.scope_type RENAME VALUE 'sector' TO 'network';

-------------------------------------------------------------------------------
-- 2. Column rename on core.members
-------------------------------------------------------------------------------

ALTER TABLE core.members RENAME COLUMN sector_scope_id TO network_scope_id;

COMMENT ON COLUMN core.members.network_scope_id IS
  'The member''s professional network attribute (formerly "sector"). Every member picks exactly one; "Other" is the safety-net default seeded at 44444444-0000-0000-0000-000000000001.';

-------------------------------------------------------------------------------
-- 3. Index rename
-------------------------------------------------------------------------------

ALTER INDEX core.members_sector_scope_id_idx
  RENAME TO members_network_scope_id_idx;

-------------------------------------------------------------------------------
-- 4. Trigger function — rewrite the network-slot check and error messages
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION core.members_check_scope_types()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_type core.scope_type;
BEGIN
  SELECT scope_type INTO v_type FROM core.scopes WHERE id = NEW.batch_scope_id;
  IF v_type IS DISTINCT FROM 'batch' THEN
    RAISE EXCEPTION 'members.batch_scope_id must reference a batch scope (got %)', COALESCE(v_type::text, 'null')
      USING ERRCODE = '23514';
  END IF;

  SELECT scope_type INTO v_type FROM core.scopes WHERE id = NEW.house_scope_id;
  IF v_type IS DISTINCT FROM 'house' THEN
    RAISE EXCEPTION 'members.house_scope_id must reference a house scope (got %)', COALESCE(v_type::text, 'null')
      USING ERRCODE = '23514';
  END IF;

  SELECT scope_type INTO v_type FROM core.scopes WHERE id = NEW.network_scope_id;
  IF v_type IS DISTINCT FROM 'network' THEN
    RAISE EXCEPTION 'members.network_scope_id must reference a network scope (got %)', COALESCE(v_type::text, 'null')
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION core.members_check_scope_types IS
  'BEFORE trigger: enforces batch/house/network FK columns reference scopes of the correct scope_type. Postgres CHECK can''t run a subquery so this trigger is the canonical enforcement.';

-- Recreate the trigger so `UPDATE OF` picks up the renamed column.
DROP TRIGGER IF EXISTS members_scope_types_check ON core.members;

CREATE TRIGGER members_scope_types_check
  BEFORE INSERT OR UPDATE OF batch_scope_id, house_scope_id, network_scope_id
  ON core.members
  FOR EACH ROW EXECUTE FUNCTION core.members_check_scope_types();

-------------------------------------------------------------------------------
-- 5. Permission catalog descriptions
-------------------------------------------------------------------------------
-- Rows inserted by 20260701204946_extend_permissions_members.sql and
-- 20260702113026_extend_permissions_phase2.sql carry "sector" verbatim in
-- their `description`. UPDATE them in place so the catalog reads
-- consistently after this migration.

UPDATE core.permissions
   SET description = REPLACE(description, 'sector', 'network')
 WHERE description LIKE '%sector%';

UPDATE core.permissions
   SET description = REPLACE(description, 'Sector', 'Network')
 WHERE description LIKE '%Sector%';
