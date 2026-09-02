-- Migration: tighten_position_assignments_uniqueness
--
-- Phase 2 §7 tightens the position constraint from "one active
-- assignment per (member, scope, position)" (Phase 1 E1.6) to
-- "one position per person per body". A member cannot hold two
-- distinct positions at the same body simultaneously.
--
-- Implementation: drop the (member, scope, position) partial unique
-- index and replace with (member, scope). Removed assignments
-- (removed_at IS NOT NULL) don't count, so re-assigning to a
-- different position after removing the current one works.

DROP INDEX IF EXISTS core.position_assignments_one_active_per_member_scope_position;

CREATE UNIQUE INDEX position_assignments_one_active_per_member_scope
  ON core.position_assignments (member_id, scope_id)
  WHERE removed_at IS NULL;

COMMENT ON INDEX core.position_assignments_one_active_per_member_scope IS
  'Phase 2 §7 — one active position per (member, scope). Distinct from Phase 1''s (member, scope, position) partial unique.';
