-- Migration: rls_positions
--
-- RLS on position_catalog + position_assignments.
--
--   position_catalog     — public read for any authenticated user
--                          (the badges are visible to the whole
--                          membership per §2.19). Write requires
--                          `scope.manage_capabilities` at Mainstream
--                          — Mainstream Admin owns catalog changes.
--   position_assignments — public read for any authenticated user
--                          (public-facing Exco badges). Write requires
--                          `position.assign` / `position.remove` at
--                          the target scope.

-------------------------------------------------------------------------------
-- 1. position_catalog policies
-------------------------------------------------------------------------------

CREATE POLICY position_catalog_select ON core.position_catalog
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY position_catalog_insert ON core.position_catalog
  FOR INSERT TO authenticated
  WITH CHECK (
    core.has_permission(auth.uid(), core.mainstream_scope_id(), 'scope.manage_capabilities')
  );

CREATE POLICY position_catalog_update ON core.position_catalog
  FOR UPDATE TO authenticated
  USING (
    core.has_permission(auth.uid(), core.mainstream_scope_id(), 'scope.manage_capabilities')
  )
  WITH CHECK (
    core.has_permission(auth.uid(), core.mainstream_scope_id(), 'scope.manage_capabilities')
  );

-------------------------------------------------------------------------------
-- 2. position_assignments policies
-------------------------------------------------------------------------------

CREATE POLICY position_assignments_select ON core.position_assignments
  FOR SELECT TO authenticated
  USING (TRUE);

CREATE POLICY position_assignments_insert ON core.position_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    core.has_permission(auth.uid(), scope_id, 'position.assign')
  );

CREATE POLICY position_assignments_update ON core.position_assignments
  FOR UPDATE TO authenticated
  USING (
    core.has_permission(auth.uid(), scope_id, 'position.assign')
    OR core.has_permission(auth.uid(), scope_id, 'position.remove')
  )
  WITH CHECK (
    core.has_permission(auth.uid(), scope_id, 'position.assign')
    OR core.has_permission(auth.uid(), scope_id, 'position.remove')
  );
