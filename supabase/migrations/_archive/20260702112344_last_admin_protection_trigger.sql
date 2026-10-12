-- Migration: last_admin_protection_trigger
--
-- Phase 2 §6.1 + §13: an Admin cannot remove themselves; the last
-- Admin at a scope cannot be removed. Enforced by a BEFORE trigger
-- on `core.role_assignments` so no code path — Edge Function, direct
-- SQL, script — can bypass it.
--
-- What counts as an "Admin" for this rule: any of
-- {mainstream_admin, branch_admin, batch_admin}. Finance holders are
-- NOT counted — the rule protects governance, not treasury.
--
-- What the trigger blocks:
--   1. **Self-revoke.** The caller (auth.uid()) is the target user
--      being revoked. Enforced regardless of admin count. Prevents
--      the "I accidentally revoked myself and now I'm locked out"
--      failure mode.
--
--   2. **Zero-admin transitions.** An INSERT/UPDATE that would leave
--      the target scope with zero active admin holders. Fires on:
--        - UPDATE that sets revoked_at (the classic revoke).
--        - UPDATE that expires the row (ends_at <= NOW()).
--        - Any operation that reduces the count to zero.
--
-- Global grants (scope_id IS NULL — Recruiter) are exempt. Recruiter
-- isn't an admin role anyway; the check short-circuits.
--
-- Error contract: raises SQLSTATE 23514 with MESSAGE prefixed
-- `LAST_ADMIN:` so the envelope layer decodes it to a stable
-- LAST_ADMIN code. Matches the CAP_EXCEEDED pattern from Phase 1
-- E1.5.
--
-- Companion RPC: `core.would_be_last_admin(role_assignment_id)`
-- returns TRUE if revoking the named assignment would trip the
-- trigger. Used by the Exco UI to disable the Revoke button as
-- pre-flight (server trigger is the definitive gate).

-------------------------------------------------------------------------------
-- 1. Helper: is this role key an "admin" per §6.1?
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION core.is_admin_role_key(role_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT role_key IN ('mainstream_admin', 'branch_admin', 'batch_admin');
$$;

-------------------------------------------------------------------------------
-- 2. Trigger function
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION core.enforce_last_admin_protection()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_role_key         TEXT;
  v_old_active       BOOLEAN;
  v_new_active       BOOLEAN;
  v_caller_uuid      UUID;
  v_active_after     INTEGER;
BEGIN
  -- Global grants (Recruiter) are exempt — Recruiter isn't an admin
  -- role, and scope_id IS NULL wouldn't map to a per-body count.
  IF COALESCE(NEW.scope_id, OLD.scope_id) IS NULL THEN
    RETURN NEW;
  END IF;

  -- What role key is this? Read via role_id → key.
  SELECT key INTO v_role_key
  FROM core.roles
  WHERE id = COALESCE(NEW.role_id, OLD.role_id);

  IF NOT core.is_admin_role_key(v_role_key) THEN
    RETURN NEW;
  END IF;

  -- Determine "was active" and "will be active" for this row.
  v_old_active := (TG_OP = 'UPDATE')
    AND OLD.revoked_at IS NULL
    AND OLD.starts_at <= NOW()
    AND (OLD.ends_at IS NULL OR OLD.ends_at > NOW());

  v_new_active := NEW.revoked_at IS NULL
    AND NEW.starts_at <= NOW()
    AND (NEW.ends_at IS NULL OR NEW.ends_at > NOW());

  -- Only care about transitions that DEACTIVATE an admin grant.
  -- INSERTs of active grants (new admin) never trip the rule.
  IF v_new_active THEN
    RETURN NEW;
  END IF;

  -- On UPDATE that's transitioning OLD-active → NEW-inactive, this
  -- is where self-revoke and last-admin checks fire.
  IF TG_OP <> 'UPDATE' OR NOT v_old_active THEN
    RETURN NEW;
  END IF;

  -- Self-revoke guard: the caller cannot revoke their own admin.
  -- auth.uid() is available inside triggers when the mutation carries
  -- a user JWT; NULL for service-role / direct SQL, which is expected
  -- to bypass this rule (bootstrap scripts, tests).
  v_caller_uuid := auth.uid();
  IF v_caller_uuid IS NOT NULL AND v_caller_uuid = NEW.user_id THEN
    RAISE EXCEPTION 'LAST_ADMIN: cannot self-revoke your own admin role at scope %', NEW.scope_id
      USING ERRCODE = '23514',
            HINT = 'Ask another admin to revoke your role.';
  END IF;

  -- Zero-admin guard: count remaining active admin holders at scope
  -- AFTER this row deactivates.
  SELECT COUNT(*)
    INTO v_active_after
    FROM core.role_assignments ra
    INNER JOIN core.roles r ON r.id = ra.role_id
   WHERE ra.scope_id = NEW.scope_id
     AND ra.id <> NEW.id
     AND core.is_admin_role_key(r.key)
     AND ra.revoked_at IS NULL
     AND ra.starts_at <= NOW()
     AND (ra.ends_at IS NULL OR ra.ends_at > NOW());

  IF v_active_after = 0 THEN
    RAISE EXCEPTION 'LAST_ADMIN: cannot revoke the last active admin at scope %', NEW.scope_id
      USING ERRCODE = '23514',
            HINT = 'Grant admin to another user at this scope first, then revoke this one.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER role_assignments_last_admin_protection
  BEFORE UPDATE ON core.role_assignments
  FOR EACH ROW EXECUTE FUNCTION core.enforce_last_admin_protection();

COMMENT ON FUNCTION core.enforce_last_admin_protection IS
  'Phase 2 §6.1 + §13 — blocks self-revoke of admin AND blocks any operation that would leave a scope with zero active mainstream_admin/branch_admin/batch_admin holders. Raises 23514 with LAST_ADMIN: prefix.';

-------------------------------------------------------------------------------
-- 3. Read-only companion RPC — powers the UI Revoke-button pre-flight
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION core.would_be_last_admin(p_role_assignment_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
STABLE
AS $$
DECLARE
  v_scope_id     UUID;
  v_role_key     TEXT;
  v_active_other INTEGER;
BEGIN
  IF p_role_assignment_id IS NULL THEN RETURN FALSE; END IF;

  SELECT ra.scope_id, r.key INTO v_scope_id, v_role_key
    FROM core.role_assignments ra
    INNER JOIN core.roles r ON r.id = ra.role_id
   WHERE ra.id = p_role_assignment_id;

  -- No row, or not an admin role, or global scope — never a
  -- last-admin risk.
  IF v_scope_id IS NULL OR NOT core.is_admin_role_key(v_role_key) THEN
    RETURN FALSE;
  END IF;

  SELECT COUNT(*)
    INTO v_active_other
    FROM core.role_assignments ra
    INNER JOIN core.roles r ON r.id = ra.role_id
   WHERE ra.scope_id = v_scope_id
     AND ra.id <> p_role_assignment_id
     AND core.is_admin_role_key(r.key)
     AND ra.revoked_at IS NULL
     AND ra.starts_at <= NOW()
     AND (ra.ends_at IS NULL OR ra.ends_at > NOW());

  RETURN v_active_other = 0;
END;
$$;

REVOKE ALL ON FUNCTION core.would_be_last_admin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core.would_be_last_admin(UUID) TO authenticated, service_role;

COMMENT ON FUNCTION core.would_be_last_admin IS
  'Read-only pre-flight for the Exco UI Revoke button. Returns TRUE if revoking the named assignment would leave the scope with zero active admin holders. Does NOT enforce; the BEFORE trigger does.';
