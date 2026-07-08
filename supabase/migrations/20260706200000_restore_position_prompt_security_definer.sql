-- Migration: harden core.position_president_prompt
--
-- Two things happening here — belt and suspenders on the same regression:
--
-- 1. Restore SECURITY DEFINER + pinned search_path (regression from
--    20260705100000 dropping the attribute via CREATE OR REPLACE).
--
-- 2. Rewrite the function body to wrap the notifications INSERT in an
--    EXCEPTION handler. The prompt is best-effort — it emits an in-app
--    hint that the just-assigned President has no admin role at the
--    scope. If the write fails for any reason (missing permission,
--    schema drift, whatever), the parent position INSERT must still
--    succeed. Losing the prompt is fine; losing the assignment is not.
--
-- Root cause narrative:
--   `20260703200000_governance_trigger_fixes.sql` set the trigger to
--   SECURITY DEFINER so the caller's JWT (no INSERT on
--   notifications.notification_events) could still succeed on the
--   position_assignments INSERT.
--
--   Later, `20260705100000_drop_batch_admin_and_add_member_code.sql`
--   used CREATE OR REPLACE to change the exempted-role set (dropping
--   batch_admin). CREATE OR REPLACE does not preserve SECURITY DEFINER
--   — the function reverted to SECURITY INVOKER. Every President
--   assignment then failed with 42501, surfacing as "An unexpected
--   error occurred" (500 from the edge function's internal-error
--   branch, since 42501 is not one of the mapped SQLSTATE codes).
--
-- Fix:
--   Recreate the function with the same body as 20260705100000 but wrap
--   the notifications INSERT in a BEGIN … EXCEPTION WHEN OTHERS block,
--   and re-apply SECURITY DEFINER + search_path via ALTER FUNCTION.

CREATE OR REPLACE FUNCTION core.position_president_prompt()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_position_name TEXT;
  v_has_admin     BOOLEAN;
BEGIN
  SELECT name INTO v_position_name
    FROM core.position_catalog WHERE id = NEW.position_catalog_id;

  IF v_position_name IS NULL OR v_position_name NOT ILIKE 'President%' THEN
    RETURN NEW;
  END IF;

  IF NEW.assigned_by IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM core.role_assignments ra
    INNER JOIN core.roles r ON r.id = ra.role_id
    INNER JOIN core.member_accounts ma ON ma.auth_user_id = ra.user_id
    WHERE ma.member_id = NEW.member_id
      AND ma.claim_status = 'claimed'
      AND r.key IN ('mainstream_admin', 'branch_admin')
      AND ra.revoked_at IS NULL
      AND ra.starts_at <= NOW()
      AND (ra.ends_at IS NULL OR ra.ends_at > NOW())
      AND (ra.scope_id IS NULL OR ra.scope_id = NEW.scope_id)
  ) INTO v_has_admin;

  IF v_has_admin THEN
    RETURN NEW;
  END IF;

  -- Best-effort: the prompt is a nudge, not a hard requirement of the
  -- assignment. If the write fails (missing grant, schema drift, etc.)
  -- log a NOTICE and let the parent INSERT succeed.
  BEGIN
    INSERT INTO notifications.notification_events (
      event_type,
      severity,
      recipient_user_id,
      scope_id,
      payload
    ) VALUES (
      'position.president_needs_admin',
      'info',
      NEW.assigned_by,
      NEW.scope_id,
      jsonb_build_object(
        'member_id',              NEW.member_id,
        'position_assignment_id', NEW.id,
        'position_name',          v_position_name,
        'channel',                'in_app',
        'hint',                   'This president has no Admin role at this scope. Consider granting.'
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'position_president_prompt: could not enqueue notification (%)', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

ALTER FUNCTION core.position_president_prompt() SECURITY DEFINER
  SET search_path = pg_catalog, core, notifications, auth, public;

COMMENT ON FUNCTION core.position_president_prompt() IS
  'AFTER INSERT trigger on core.position_assignments — emits a best-effort in-app hint when a President is assigned to someone without an admin role at the scope. SECURITY DEFINER + EXCEPTION-wrapped INSERT so the trigger never breaks the parent assignment even if the caller lacks notifications-schema INSERT.';
