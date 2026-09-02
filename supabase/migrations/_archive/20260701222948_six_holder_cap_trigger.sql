-- Migration: six_holder_cap_trigger
--
-- Enforces Phase 1 §2.18 — a body can have at most **six holders of
-- Admin + Finance combined**. The plan documents this as belt-and-
-- suspenders:
--
--   - Edge Function `grant-role` checks the count before INSERT and
--     fast-fails with a 409 CAP_EXCEEDED envelope (good UX — no
--     silent DB error).
--   - This trigger is the backstop. Two concurrent grants can both
--     pass the app-level count check and race to INSERT; without a
--     DB-level rejection the seventh row lands and the cap is
--     silently violated. The trigger catches that race.
--
-- Design notes:
--
--   * BEFORE INSERT/UPDATE on core.role_assignments. Fires per row.
--   * Only fires for role keys in ('mainstream_admin', 'branch_admin',
--     'batch_admin', 'finance'). "Admin" per §2.18 collapses the
--     three admin variants — someone with Branch Admin + Finance is
--     two of the six holders.
--   * NEW.scope_id IS NOT NULL check — the cap is a per-body count;
--     it does not apply to global grants (Recruiter with scope_id
--     NULL is unbounded per §2.17).
--   * Counts active, non-revoked rows at the same scope, excluding
--     the row being edited (so an UPDATE that flips ends_at doesn't
--     count itself twice).
--   * Concurrency: uses `pg_advisory_xact_lock(hashtext(scope_id::text))`
--     to serialize concurrent grants at the same scope for the
--     lifetime of the transaction. Cheap (advisory locks are
--     in-memory) and closes the classic count-then-insert race.
--   * Raises SQLSTATE 23514 with MESSAGE starting `CAP_EXCEEDED:` so
--     the Edge Function envelope layer can decode it to the standard
--     CAP_EXCEEDED code without a code-table.

CREATE OR REPLACE FUNCTION core.enforce_six_holder_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_role_key TEXT;
  v_count    INTEGER;
BEGIN
  -- No cap on global grants — those have no per-body count concept.
  IF NEW.scope_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only counts admin + finance roles toward the cap.
  SELECT key INTO v_role_key FROM core.roles WHERE id = NEW.role_id;
  IF v_role_key NOT IN ('mainstream_admin', 'branch_admin', 'batch_admin', 'finance') THEN
    RETURN NEW;
  END IF;

  -- If this row is a revocation write (revoked_at just got set), it
  -- doesn't consume a slot. Bail out.
  IF NEW.revoked_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- If this row is expired (ends_at in the past), it also doesn't consume.
  IF NEW.ends_at IS NOT NULL AND NEW.ends_at <= NOW() THEN
    RETURN NEW;
  END IF;

  -- Serialize concurrent grants at the same scope. Advisory xact locks
  -- release automatically at commit/rollback.
  PERFORM pg_advisory_xact_lock(hashtext('role_assignments_cap:' || NEW.scope_id::text));

  -- Count active admin+finance rows at this scope, EXCLUDING the row
  -- being written (UPDATE case) or the target of an idempotent
  -- INSERT (matched by id).
  SELECT COUNT(*)
    INTO v_count
    FROM core.role_assignments ra
    INNER JOIN core.roles r ON r.id = ra.role_id
   WHERE ra.scope_id = NEW.scope_id
     AND r.key IN ('mainstream_admin', 'branch_admin', 'batch_admin', 'finance')
     AND ra.revoked_at IS NULL
     AND ra.starts_at <= NOW()
     AND (ra.ends_at IS NULL OR ra.ends_at > NOW())
     AND ra.id IS DISTINCT FROM NEW.id;

  IF v_count + 1 > 6 THEN
    RAISE EXCEPTION 'CAP_EXCEEDED: admin+finance cap of 6 exceeded at scope %', NEW.scope_id
      USING ERRCODE = '23514',
            HINT = 'Revoke an existing admin or finance holder at this scope before granting another.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER role_assignments_six_holder_cap
  BEFORE INSERT OR UPDATE ON core.role_assignments
  FOR EACH ROW EXECUTE FUNCTION core.enforce_six_holder_cap();

COMMENT ON FUNCTION core.enforce_six_holder_cap IS
  'Phase 1 §2.18 backstop: rejects INSERT/UPDATE that would push the (admin + finance) grant count for the row''s scope over 6. Serialized per scope via pg_advisory_xact_lock. Skips global grants (scope_id IS NULL) — those are the Recruiter role which §2.17 exempts.';
