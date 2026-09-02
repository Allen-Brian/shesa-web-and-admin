-- Migration: networks_unblock_archive
--
-- Reverses the "block archive when members attached" guard added in
-- 20260702200600_create_core_networks.sql. Per the 2026-07-02 spec
-- refinement, archiving a network is now unblocking:
--
--   Members stay attached to an archived network until an admin reassigns
--   them at their own pace. The old guard forced reassignment BEFORE
--   archive was allowed, which turned a single-click operation into a
--   multi-step reshuffle. Product decided the archived-with-members
--   state is fine — dropdowns filter archived rows out, so no member
--   can be newly assigned to one, and existing assignments keep working.
--
-- Everything else about `core.update_network` stays the same: same
-- signature, same two-table update, same "network not found" error.

CREATE OR REPLACE FUNCTION core.update_network(
  p_scope_id    UUID,
  p_name        TEXT,
  p_short_name  TEXT,
  p_description TEXT,
  p_icon        TEXT,
  p_color_hex   TEXT,
  p_sort_order  INTEGER,
  p_status      core.scope_status
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM core.scopes
    WHERE id = p_scope_id AND scope_type = 'network'
  ) THEN
    RAISE EXCEPTION 'network % not found', p_scope_id
      USING ERRCODE = '23503';
  END IF;

  UPDATE core.scopes
     SET name   = COALESCE(p_name,   name),
         status = COALESCE(p_status, status)
   WHERE id = p_scope_id;

  UPDATE core.networks
     SET short_name  = COALESCE(p_short_name,  short_name),
         description = COALESCE(p_description, description),
         icon        = COALESCE(p_icon,        icon),
         color_hex   = COALESCE(p_color_hex,   color_hex),
         sort_order  = COALESCE(p_sort_order,  sort_order)
   WHERE scope_id = p_scope_id;
END;
$$;

COMMENT ON FUNCTION core.update_network IS
  'Atomic update for a network: patches both scopes + networks rows. Archive is unblocked as of 2026-07-02 — members hold the archived reference until admin reassigns.';
