-- Migration: perform_transfer_destination_approves
--
-- Flips the transfer approval model per the 2026-07-03 lock.
--
-- BEFORE: source-scope admin approved (Phase 1 lock, encoded in the RPC
--         comment header + the pgTAP F/G/H test cases).
-- AFTER:  DESTINATION-scope admin approves. Source only gets a
--         notification (in-app, fan-out to source-scope admins). Source
--         has NO veto — informed only, history retained on the closed
--         source membership row.
--
-- Rationale (see memory/project_phase2_membership_locks.md #2):
-- destination absorbs the operational cost, so destination decides.
-- Source has no legitimate reason to hold a member hostage.
--
-- This migration does three things:
--   1. Rewrites core.perform_transfer with an updated comment header
--      that documents the flipped assumption. The BODY is byte-for-byte
--      identical — the RPC still just closes source + opens destination
--      + updates the transfer request. The AUTHORIZATION layer sits in
--      the calling Edge Function; this migration only clarifies who is
--      expected to have cleared that gate.
--
--   2. Adds the surgical guard trigger
--      registration_status_transferred_terminals_frozen — fires only
--      when a terminal timestamp (marked_paid_at / waived_at /
--      paid_on_behalf_at) is being NULLED on a registration_status row
--      whose parent membership is `transferred`. Preserves the
--      historical "member X had unpaid dues at Buea when they
--      transferred to DC" fact without blocking legitimate corrections
--      (nulling to a DIFFERENT non-null terminal state stays legal —
--      an admin fixing a mis-keyed registration can still do that).
--
--   3. Adds the notify_source_of_transfer(source_scope_id, membership_id,
--      actor_id) helper that fans out an in-app notification event to
--      every source-scope admin. Called by the approve-transfer Edge
--      Function BEFORE its final success response.

-------------------------------------------------------------------------------
-- 1. Rewrite core.perform_transfer with updated comment/assumption
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION core.perform_transfer(
  p_source_membership_id UUID,
  p_destination_scope_id UUID,
  p_approved_by          UUID,
  p_transfer_request_id  UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_member_id UUID;
  v_source_scope UUID;
  v_new_membership UUID;
BEGIN
  IF p_source_membership_id IS NULL OR p_destination_scope_id IS NULL OR p_approved_by IS NULL THEN
    RAISE EXCEPTION 'perform_transfer: all args required'
      USING ERRCODE = '22004';
  END IF;

  SELECT member_id, scope_id INTO v_member_id, v_source_scope
  FROM core.memberships WHERE id = p_source_membership_id;

  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'perform_transfer: source membership not found' USING ERRCODE = '02000';
  END IF;

  UPDATE core.memberships
     SET membership_status = 'transferred',
         transferred_at    = NOW()
   WHERE id = p_source_membership_id;

  INSERT INTO core.memberships (
    member_id, scope_id, membership_status, join_method,
    joined_at, approved_at, approved_by
  )
  VALUES (
    v_member_id, p_destination_scope_id, 'active', 'transfer',
    NOW(), NOW(), p_approved_by
  )
  RETURNING id INTO v_new_membership;

  IF p_transfer_request_id IS NOT NULL
     AND to_regclass('core.membership_transfers') IS NOT NULL THEN
    EXECUTE format(
      $sql$
        UPDATE core.membership_transfers
           SET status = 'approved',
               approved_at = NOW(),
               approved_by = %L
         WHERE id = %L
      $sql$,
      p_approved_by,
      p_transfer_request_id
    );
  END IF;

  RETURN v_new_membership;
END;
$$;

COMMENT ON FUNCTION core.perform_transfer IS
  'Atomic transfer: closes source membership + opens destination as active + updates transfer request if provided. Callers must have cleared `membership.transfer` at the DESTINATION scope (2026-07-03 flip — was source pre-flip). The source registration_status row is preserved intact on the closed source membership (see the transferred_terminals_frozen trigger).';

-------------------------------------------------------------------------------
-- 2. Guard trigger — preserve source registration_status on transferred
-------------------------------------------------------------------------------
-- Fires only on UPDATE (never INSERT, never DELETE — the CASCADE from
-- parent membership DELETE is still free to run on genuine member
-- deletion). Fires only when the parent membership is `transferred`.
-- Fires only when a terminal timestamp is being nulled (correcting a
-- WRONG entry to a DIFFERENT non-null value stays legal — an admin can
-- fix a mis-keyed registration by nulling marked_paid_at + setting
-- waived_at in the same UPDATE, since we check final row state, not
-- individual column deltas).
--
-- Predicate is surgical (WHEN clause) so this won't surface as a
-- mysterious failure during a Phase 3 finance migration — it's scoped
-- to the exact (parent=transferred, terminal→null with no replacement)
-- shape.

CREATE OR REPLACE FUNCTION core.registration_status_transferred_terminals_frozen_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, core
AS $$
DECLARE
  v_parent_status core.membership_status;
  v_had_terminal_before  BOOLEAN;
  v_has_terminal_after   BOOLEAN;
BEGIN
  SELECT membership_status INTO v_parent_status
  FROM core.memberships
  WHERE id = NEW.membership_id;

  -- Only guard rows attached to a transferred membership.
  IF v_parent_status IS DISTINCT FROM 'transferred' THEN
    RETURN NEW;
  END IF;

  v_had_terminal_before := OLD.marked_paid_at IS NOT NULL
                        OR OLD.waived_at IS NOT NULL
                        OR OLD.paid_on_behalf_at IS NOT NULL;

  v_has_terminal_after  := NEW.marked_paid_at IS NOT NULL
                        OR NEW.waived_at IS NOT NULL
                        OR NEW.paid_on_behalf_at IS NOT NULL;

  -- Guard fires only when the row had a terminal state and no longer
  -- does. Correcting one terminal to a different terminal (both
  -- non-null on the row after UPDATE) stays legal.
  IF v_had_terminal_before AND NOT v_has_terminal_after THEN
    RAISE EXCEPTION
      'registration_status: cannot null all terminal timestamps on a row attached to a transferred membership (would erase historical dues state)'
      USING ERRCODE = '23514',
            HINT    = 'Set a different terminal (marked_paid_at, waived_at, or paid_on_behalf_at) in the same UPDATE if the entry was mis-keyed.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER registration_status_transferred_terminals_frozen
  BEFORE UPDATE OF marked_paid_at, waived_at, paid_on_behalf_at,
                   marked_paid_by,  waived_by,  paid_on_behalf_by
  ON core.registration_status
  FOR EACH ROW
  EXECUTE FUNCTION core.registration_status_transferred_terminals_frozen_fn();

COMMENT ON FUNCTION core.registration_status_transferred_terminals_frozen_fn IS
  'Guards against nulling ALL terminal states on a registration_status row whose parent membership is transferred. Fires only for that exact (parent=transferred, all-terminals-null-after) shape — legitimate corrections between terminals still work.';

-------------------------------------------------------------------------------
-- 3. Source notification helper — fan-out to source-scope admins
-------------------------------------------------------------------------------
-- Writes one notification_events row per source-scope admin (users with
-- membership.approve at the source scope). event_type is
-- 'membership.transfer.source_notified'; in-app only (no delivery rows
-- created — those come from Epic 2.10's dispatcher). Same shape as the
-- president-prompt notification pattern.

CREATE OR REPLACE FUNCTION core.notify_source_of_transfer(
  p_source_scope_id UUID,
  p_membership_id   UUID,
  p_actor_id        UUID
)
RETURNS INTEGER   -- number of notifications enqueued
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, core, notifications, auth
AS $$
DECLARE
  v_count INTEGER := 0;
  v_source_admin_id UUID;
  v_member_id UUID;
BEGIN
  IF p_source_scope_id IS NULL OR p_membership_id IS NULL THEN
    RAISE EXCEPTION 'notify_source_of_transfer: source_scope_id + membership_id required'
      USING ERRCODE = '22004';
  END IF;

  SELECT member_id INTO v_member_id
  FROM core.memberships WHERE id = p_membership_id;

  -- Recipients: every user with an active membership.approve grant at
  -- the source scope. Includes NULL-scope global grants
  -- (mainstream_admin) because has_permission's ancestry walk short-
  -- circuits on scope_id IS NULL.
  FOR v_source_admin_id IN
    SELECT DISTINCT ra.user_id
    FROM core.role_assignments ra
    INNER JOIN core.role_permissions rp ON rp.role_id = ra.role_id
    INNER JOIN core.permissions p        ON p.id     = rp.permission_id
    WHERE p.key = 'membership.approve'
      AND ra.revoked_at IS NULL
      AND ra.starts_at <= NOW()
      AND (ra.ends_at IS NULL OR ra.ends_at > NOW())
      AND (ra.scope_id IS NULL OR ra.scope_id = p_source_scope_id)
      AND ra.user_id IS DISTINCT FROM p_actor_id   -- don't notify the acting admin
  LOOP
    INSERT INTO notifications.notification_events (
      event_type, severity, recipient_user_id, scope_id, payload
    ) VALUES (
      'membership.transfer.source_notified',
      'info',
      v_source_admin_id,
      p_source_scope_id,
      jsonb_build_object(
        'member_id',      v_member_id,
        'membership_id',  p_membership_id,
        'source_scope_id', p_source_scope_id,
        'actor_id',       p_actor_id,
        'channel',        'in_app'
      )
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION core.notify_source_of_transfer IS
  'Fan-out in-app notification: enqueues one notification_events row per source-scope admin (has membership.approve) when a transfer completes. Called by approve-transfer Edge Function. In-app only — delivery rows are Epic 2.10.';

REVOKE ALL ON FUNCTION core.notify_source_of_transfer(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core.notify_source_of_transfer(UUID, UUID, UUID) TO authenticated, service_role;
