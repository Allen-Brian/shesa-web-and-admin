-- Migration: announcements_rls_global_admin_maps_to_mainstream
--
-- ADR-0041 refinement: a global mainstream_admin grant
-- (core.role_assignments.scope_id IS NULL, role = 'mainstream_admin')
-- must still see announcements owned by Mainstream.
--
-- The initial policy in 20260704110000_create_exco_announcements.sql
-- filtered `ra.scope_id IS NOT NULL`, which excluded global grants.
-- Result: the seeded `admin@shesa.test` (global mainstream_admin) saw
-- ZERO announcements — even ones they authored — because Mainstream's
-- scope_id never landed in their allowed-scopes set.
--
-- Fix: OR-in a second clause that maps a global mainstream_admin
-- assignment to the Mainstream scope, so those admins see Mainstream-
-- owned announcements only (still siloed — they can't see Branch or
-- Chapter announcements).
--
-- The siloed semantics of ADR-0041 stand — this migration doesn't
-- open the cascade. A global mainstream_admin gets Mainstream's
-- own row set, nothing else. Branch admins still see only their branch.

DROP POLICY IF EXISTS announcements_admin_can_select ON exco.announcements;

CREATE POLICY announcements_admin_can_select
  ON exco.announcements FOR SELECT
  TO authenticated
  USING (
    owner_scope_id IN (
      -- Scoped admin grants (branch_admin, batch_admin, mainstream_admin at
      -- a specific scope). Exact match — no cascade per ADR-0041.
      SELECT ra.scope_id
      FROM core.role_assignments ra
      JOIN core.roles r ON r.id = ra.role_id
      WHERE ra.user_id = auth.uid()
        AND ra.scope_id IS NOT NULL
        AND core.is_admin_role_key(r.key)
        AND ra.starts_at <= NOW()
        AND ra.revoked_at IS NULL
        AND (ra.ends_at IS NULL OR ra.ends_at > NOW())

      UNION ALL

      -- Global mainstream_admin (scope_id IS NULL, role_key =
      -- 'mainstream_admin'): map to Mainstream's own scope so those
      -- admins see Mainstream-owned announcements. Doesn't reach any
      -- other scope — silo intact.
      SELECT s.id
      FROM core.scopes s
      WHERE s.scope_type = 'mainstream'
        AND EXISTS (
          SELECT 1
          FROM core.role_assignments ra2
          JOIN core.roles r2 ON r2.id = ra2.role_id
          WHERE ra2.user_id = auth.uid()
            AND ra2.scope_id IS NULL
            AND r2.key = 'mainstream_admin'
            AND ra2.starts_at <= NOW()
            AND ra2.revoked_at IS NULL
            AND (ra2.ends_at IS NULL OR ra2.ends_at > NOW())
        )
    )
  );

COMMENT ON POLICY announcements_admin_can_select ON exco.announcements IS
  'ADR-0041 admin-lens SELECT — siloed on owner_scope_id. Global mainstream_admin grants map to Mainstream (refined 2026-07-04, see 20260704160000).';
