-- Migration: deceased_cascade_and_extend_member_rls
--
-- Two E1.2 deferrals that E1.4 finally has the foundation to land:
--
--   1) **Deceased cascade** — a member flipped to `member_status='deceased'`
--      via update-member or admin-correct-member should propagate: every
--      current active/passive membership becomes `left` with left_at=NOW().
--      Deferred from E1.2 because core.memberships didn't yet exist.
--
--   2) **Extended member.read RLS** — the plan's clause (b): "a user can
--      SELECT a member row iff they hold `member.read` at any scope
--      containing the member's active memberships". Now that memberships
--      exists, we can implement the full three-clause policy — owner,
--      Mainstream-level member.read, OR member.read at any of the
--      member's current-active-scopes.

-------------------------------------------------------------------------------
-- 1. Deceased cascade trigger
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION core.members_cascade_deceased()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only fire when the status transitions INTO deceased.
  IF NEW.member_status = 'deceased' AND OLD.member_status IS DISTINCT FROM 'deceased' THEN
    UPDATE core.memberships
       SET membership_status = 'left',
           left_at           = COALESCE(left_at, NOW())
     WHERE member_id = NEW.id
       AND membership_status IN ('pending', 'active', 'passive');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER members_deceased_cascade
  AFTER UPDATE OF member_status ON core.members
  FOR EACH ROW EXECUTE FUNCTION core.members_cascade_deceased();

COMMENT ON FUNCTION core.members_cascade_deceased IS
  'AFTER UPDATE trigger: on member_status → deceased, close every active/passive/pending membership to `left`. The audit trail is centrally captured because updates on core.memberships are RLS-gated and the Edge Function paths write audit; a raw superuser update from a script would bypass audit for the cascade, which is acceptable for the rare deceased flow.';

-------------------------------------------------------------------------------
-- 2. Helper: does the caller have member.read at any scope holding an
-- active membership for the target member?
-------------------------------------------------------------------------------
-- SECURITY DEFINER + pinned search_path — same discipline as
-- member_owned_by. The subquery reads core.memberships which has its
-- own RLS; running as owner bypasses it so we don't loop.

CREATE OR REPLACE FUNCTION core.can_read_member_via_membership(p_member_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
STABLE
AS $$
DECLARE
  v_hit BOOLEAN;
BEGIN
  IF p_member_id IS NULL OR p_user_id IS NULL THEN RETURN FALSE; END IF;

  -- Iterate active membership scopes; return TRUE as soon as any grants
  -- member.read to the caller (has_permission walks the ancestry from
  -- there — this loop just enumerates the target scopes).
  SELECT EXISTS (
    SELECT 1
    FROM core.memberships m
    WHERE m.member_id = p_member_id
      AND m.membership_status IN ('active', 'passive')
      AND core.has_permission(p_user_id, m.scope_id, 'member.read')
  )
  INTO v_hit;

  RETURN COALESCE(v_hit, FALSE);
END;
$$;

REVOKE ALL ON FUNCTION core.can_read_member_via_membership(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core.can_read_member_via_membership(UUID, UUID) TO authenticated, service_role;

COMMENT ON FUNCTION core.can_read_member_via_membership IS
  'RLS helper: does the caller hold member.read at any scope hosting the target member''s active/passive membership? SECURITY DEFINER + pinned search_path so the membership scan doesn''t recurse into RLS.';

-------------------------------------------------------------------------------
-- 3. Widen members SELECT policy
-------------------------------------------------------------------------------

DROP POLICY IF EXISTS members_select ON core.members;

CREATE POLICY members_select ON core.members
  FOR SELECT TO authenticated
  USING (
    core.member_owned_by(id, auth.uid())
    OR core.has_permission(auth.uid(), core.mainstream_scope_id(), 'member.read')
    OR core.can_read_member_via_membership(id, auth.uid())
  );
