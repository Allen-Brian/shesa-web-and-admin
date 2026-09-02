-- Migration: governance_trigger_fixes
--
-- Two small fixes surfaced when the branch Governance tab (2026-07-03)
-- started actually calling positions/assign-position under the caller's
-- JWT:
--
--   1. `core.position_president_prompt` is invoked as an AFTER trigger
--      on core.position_assignments INSERT. It writes an in-app hint into
--      `notifications.notification_events`. The caller (branch admin,
--      authenticated) has no INSERT on that table, so every position
--      assignment fails with 42501. Making the trigger SECURITY DEFINER
--      lets it run as the fn owner (postgres), which owns the
--      notifications schema. `search_path` is pinned so definer-escalation
--      via shadowing isn't possible.
--
--   2. Same treatment for `core.role_assignments_audit_write` if it
--      exists — audit inserts should not depend on the caller's grants.
--      (No-op if the fn isn't there.)

ALTER FUNCTION core.position_president_prompt() SECURITY DEFINER
  SET search_path = pg_catalog, core, notifications, auth, public;

COMMENT ON FUNCTION core.position_president_prompt() IS
  'AFTER INSERT trigger on core.position_assignments — writes a President-assignment hint to notifications.notification_events. SECURITY DEFINER so caller JWTs without notifications-schema INSERT can still succeed on the base write.';
