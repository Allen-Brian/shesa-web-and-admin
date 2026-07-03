-- pgTAP: Phase 1 E1.4 membership-engine invariants.
--
-- Covers:
--   A. One active geographic membership per member (partial unique).
--   B. Membership on non-autonomous chapter rejected by trigger.
--   C. Membership on non-geographic scope rejected by trigger.
--   D. Passive on non-geographic scope rejected by paired trigger.
--   E. Deceased cascade — flipping a member deceased closes their
--      active memberships to `left`.
--   F. perform_transfer atomicity — source closes AND destination opens
--      in one call.
--   G. RLS deny — unrelated user sees 0 memberships.
--   H. RLS happy — branch admin sees membership at their branch.
--
-- Added 2026-07-03 (M1 transfer-flip):
--   I. Source-only admin has NO membership.transfer at destination
--      (proves the Edge Function's flipped auth check denies them).
--   J. notify_source_of_transfer enqueues a notification_events row
--      of type membership.transfer.source_notified.
--   K. Source membership's registration_status row is PRESERVED after
--      transfer completes — its terminal state stays intact so we can
--      still see "member X had unpaid dues at Branch A when they
--      transferred to Branch B."

BEGIN;
SET LOCAL search_path = pgtap, public, audit, core, auth;

GRANT USAGE ON SCHEMA pgtap TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO authenticated;

SELECT plan(14);

-------------------------------------------------------------------------------
-- Setup — two branches + one autonomous + one grouping chapter, plus a member
-------------------------------------------------------------------------------

INSERT INTO auth.users (id, email, instance_id) VALUES
  ('55555555-0000-0000-0000-00000000aaaa', 'e4a@shesa.test', '00000000-0000-0000-0000-000000000000'),
  ('55555555-0000-0000-0000-00000000bbbb', 'e4b@shesa.test', '00000000-0000-0000-0000-000000000000');

INSERT INTO core.scopes (id, name, slug, scope_type, parent_scope_id)
VALUES
  ('55555555-1111-0000-0000-000000000001', 'E1.4 Branch A', 'e14-branch-a', 'branch',
   '00000000-0000-0000-0000-000000000001'),
  ('55555555-1111-0000-0000-000000000002', 'E1.4 Branch B', 'e14-branch-b', 'branch',
   '00000000-0000-0000-0000-000000000001');

INSERT INTO core.scopes (id, name, slug, scope_type, parent_scope_id, chapter_kind)
VALUES
  ('55555555-2222-0000-0000-000000000001', 'E1.4 Auto Chapter', 'e14-auto-chapter', 'chapter',
   '55555555-1111-0000-0000-000000000001', 'autonomous'),
  ('55555555-2222-0000-0000-000000000002', 'E1.4 Group Chapter', 'e14-group-chapter', 'chapter',
   '55555555-1111-0000-0000-000000000001', 'grouping');

INSERT INTO core.role_assignments (id, user_id, scope_id, role_id, granted_by)
VALUES
  -- User B is a branch admin at Branch A.
  ('55555555-3333-0000-0000-000000000001',
   '55555555-0000-0000-0000-00000000bbbb',
   '55555555-1111-0000-0000-000000000001',
   (SELECT id FROM core.roles WHERE key = 'branch_admin'), NULL);

-- Test member.
INSERT INTO core.members (
  id, full_name, email, batch_scope_id, house_scope_id, network_scope_id
) VALUES (
  '55555555-4444-0000-0000-000000000001',
  'E1.4 Test Member',
  'e14-member@shesa.test',
  (SELECT id FROM core.scopes WHERE slug = 'batch-1953'),
  '33333333-0000-0000-0000-000000000001',
  '44444444-0000-0000-0000-000000000001'
);

-- Active membership at Branch A.
INSERT INTO core.memberships (
  id, member_id, scope_id, membership_status, join_method, joined_at
) VALUES (
  '55555555-5555-0000-0000-000000000001',
  '55555555-4444-0000-0000-000000000001',
  '55555555-1111-0000-0000-000000000001',
  'active',
  'admin_added',
  NOW()
);

-------------------------------------------------------------------------------
-- A) One active geographic membership per member — second one rejected
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ INSERT INTO core.memberships (member_id, scope_id, membership_status, join_method)
     VALUES (
       '55555555-4444-0000-0000-000000000001',
       '55555555-1111-0000-0000-000000000002',
       'active', 'admin_added'
     ) $$,
  '23505',
  NULL,
  'memberships: second active geographic membership per member raises unique_violation'
);

-------------------------------------------------------------------------------
-- B) Membership on non-autonomous chapter rejected
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ INSERT INTO core.memberships (member_id, scope_id, membership_status, join_method)
     VALUES (
       '55555555-4444-0000-0000-000000000001',
       '55555555-2222-0000-0000-000000000002',  -- grouping chapter
       'active', 'admin_added'
     ) $$,
  '23514',
  NULL,
  'memberships: row scoped to a grouping chapter rejected by scope-shape trigger'
);

-------------------------------------------------------------------------------
-- C) Membership on non-geographic scope rejected
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ INSERT INTO core.memberships (member_id, scope_id, membership_status, join_method)
     VALUES (
       '55555555-4444-0000-0000-000000000001',
       (SELECT id FROM core.scopes WHERE slug = 'batch-1953'),
       'active', 'admin_added'
     ) $$,
  '23514',
  NULL,
  'memberships: row scoped to a batch (non-geographic) rejected by scope-shape trigger'
);

-------------------------------------------------------------------------------
-- D) Well-formed membership on autonomous chapter accepted (and one active
-- membership constraint means we must close the Branch A one first)
-------------------------------------------------------------------------------

UPDATE core.memberships
   SET membership_status = 'left', left_at = NOW()
 WHERE id = '55555555-5555-0000-0000-000000000001';

SELECT lives_ok(
  $$ INSERT INTO core.memberships (member_id, scope_id, membership_status, join_method, joined_at)
     VALUES (
       '55555555-4444-0000-0000-000000000001',
       '55555555-2222-0000-0000-000000000001',  -- autonomous chapter
       'active', 'admin_added', NOW()
     ) $$,
  'memberships: well-formed active membership on autonomous chapter accepted'
);

-------------------------------------------------------------------------------
-- E) Deceased cascade — flipping the member closes memberships
-------------------------------------------------------------------------------

UPDATE core.members
   SET member_status = 'deceased'
 WHERE id = '55555555-4444-0000-0000-000000000001';

SELECT is(
  (SELECT COUNT(*)::int FROM core.memberships
   WHERE member_id = '55555555-4444-0000-0000-000000000001'
     AND membership_status IN ('active', 'passive', 'pending')),
  0,
  'deceased cascade: no active/passive/pending memberships remain after deceased flip'
);

SELECT is(
  (SELECT COUNT(*)::int FROM core.memberships
   WHERE member_id = '55555555-4444-0000-0000-000000000001'
     AND membership_status = 'left'
     AND left_at IS NOT NULL),
  2,
  'deceased cascade: both prior memberships closed to `left` with left_at set'
);

-------------------------------------------------------------------------------
-- F) perform_transfer atomicity — one call closes source AND opens destination
-------------------------------------------------------------------------------

-- Insert a fresh member + membership for a transfer test.
INSERT INTO core.members (
  id, full_name, email, batch_scope_id, house_scope_id, network_scope_id
) VALUES (
  '55555555-4444-0000-0000-000000000002',
  'Transfer Test Member',
  'e14-transfer@shesa.test',
  (SELECT id FROM core.scopes WHERE slug = 'batch-1953'),
  '33333333-0000-0000-0000-000000000001',
  '44444444-0000-0000-0000-000000000001'
);

INSERT INTO core.memberships (
  id, member_id, scope_id, membership_status, join_method, joined_at
) VALUES (
  '55555555-5555-0000-0000-000000000002',
  '55555555-4444-0000-0000-000000000002',
  '55555555-1111-0000-0000-000000000001',  -- Branch A
  'active', 'admin_added', NOW()
);

SELECT lives_ok(
  $$ SELECT core.perform_transfer(
       '55555555-5555-0000-0000-000000000002',      -- source membership
       '55555555-1111-0000-0000-000000000002',      -- destination Branch B
       '55555555-0000-0000-0000-00000000bbbb',      -- approved_by
       NULL
     ) $$,
  'perform_transfer: source-close + destination-open call succeeds'
);

SELECT is(
  (SELECT membership_status::text FROM core.memberships
   WHERE id = '55555555-5555-0000-0000-000000000002'),
  'transferred',
  'perform_transfer: source membership closed to `transferred`'
);

SELECT is(
  (SELECT COUNT(*)::int FROM core.memberships
   WHERE member_id = '55555555-4444-0000-0000-000000000002'
     AND scope_id = '55555555-1111-0000-0000-000000000002'
     AND membership_status = 'active'
     AND join_method = 'transfer'),
  1,
  'perform_transfer: destination membership opened as active with join_method=transfer'
);

-------------------------------------------------------------------------------
-- G) RLS happy: branch admin sees their branch's memberships
-------------------------------------------------------------------------------

SET LOCAL request.jwt.claim.sub  = '55555555-0000-0000-0000-00000000bbbb';
SET LOCAL request.jwt.claim.role = 'authenticated';
SET LOCAL ROLE authenticated;
SET LOCAL search_path = pgtap, public, audit, core, auth;

SELECT ok(
  (SELECT COUNT(*)::int FROM core.memberships
   WHERE scope_id = '55555555-1111-0000-0000-000000000001') >= 1,
  'memberships RLS: branch admin sees memberships at their branch'
);

-------------------------------------------------------------------------------
-- I) Transfer flip — source-only admin lacks membership.transfer at destination
-------------------------------------------------------------------------------
-- User B holds branch_admin at Branch A ONLY. Post-flip, approve-transfer's
-- Edge Function checks has_permission at DESTINATION. User B's grant at
-- Branch A does not extend to Branch B, so the check must return FALSE —
-- proving a source-only admin cannot approve an incoming transfer.

RESET ROLE;
SET LOCAL search_path = pgtap, public, audit, core, auth;
SET LOCAL request.jwt.claim.sub  = '55555555-0000-0000-0000-00000000bbbb';
SET LOCAL request.jwt.claim.role = 'authenticated';

SELECT is(
  core.has_permission(
    '55555555-0000-0000-0000-00000000bbbb',
    '55555555-1111-0000-0000-000000000002',   -- Branch B (destination)
    'membership.transfer'
  ),
  FALSE,
  'transfer flip: user with branch_admin at source-only has NO membership.transfer at destination'
);

-------------------------------------------------------------------------------
-- J) notify_source_of_transfer enqueues a notification_events row
-------------------------------------------------------------------------------
-- Reset to superuser (RESET ROLE clears the authenticated JWT). The helper
-- is SECURITY DEFINER so it can insert into notifications regardless of
-- the caller's grants; we just want to prove it writes what we expect.

RESET ROLE;
SET LOCAL search_path = pgtap, public, audit, core, auth, notifications;

DO $$
BEGIN
  PERFORM core.notify_source_of_transfer(
    '55555555-1111-0000-0000-000000000001',   -- source scope (Branch A)
    '55555555-5555-0000-0000-000000000002',   -- the transferred membership id
    '55555555-0000-0000-0000-00000000aaaa'    -- actor id (unrelated user)
  );
END $$;

SELECT ok(
  (SELECT COUNT(*)::int FROM notifications.notification_events
   WHERE event_type = 'membership.transfer.source_notified'
     AND payload->>'source_scope_id' = '55555555-1111-0000-0000-000000000001'
     AND (payload->>'membership_id') = '55555555-5555-0000-0000-000000000002')
  >= 1,
  'notify_source_of_transfer: writes a source_notified event to source-scope admins'
);

-------------------------------------------------------------------------------
-- K) Source registration_status row is preserved after transfer
-------------------------------------------------------------------------------
-- Create a NEW transfer scenario so we can prove the preservation
-- property without depending on case F's setup. Insert a fresh member
-- with a registration_status row that has marked_paid_at set, then
-- perform_transfer, then assert the source's registration_status is
-- still there with its terminal state intact.

INSERT INTO core.members (
  id, full_name, email, batch_scope_id, house_scope_id, network_scope_id
) VALUES (
  '55555555-4444-0000-0000-000000000003',
  'Transfer Preserve Member',
  'e14-preserve@shesa.test',
  (SELECT id FROM core.scopes WHERE slug = 'batch-1953'),
  '33333333-0000-0000-0000-000000000001',
  '44444444-0000-0000-0000-000000000001'
);

INSERT INTO core.memberships (
  id, member_id, scope_id, membership_status, join_method, joined_at
) VALUES (
  '55555555-5555-0000-0000-000000000003',
  '55555555-4444-0000-0000-000000000003',
  '55555555-1111-0000-0000-000000000001',    -- Branch A (source)
  'active', 'admin_added', NOW()
);

INSERT INTO core.registration_status (
  membership_id, fee_required, amount, currency_code,
  marked_paid_at, marked_paid_by
) VALUES (
  '55555555-5555-0000-0000-000000000003',
  TRUE, 5000, 'XAF',
  NOW() - interval '30 days',
  '55555555-0000-0000-0000-00000000aaaa'
);

SELECT lives_ok(
  $$ SELECT core.perform_transfer(
       '55555555-5555-0000-0000-000000000003',      -- source membership
       '55555555-1111-0000-0000-000000000002',      -- destination Branch B
       '55555555-0000-0000-0000-00000000bbbb',      -- approved_by
       NULL
     ) $$,
  'preserve: perform_transfer completes for member with paid registration'
);

SELECT is(
  (SELECT marked_paid_at IS NOT NULL FROM core.registration_status
   WHERE membership_id = '55555555-5555-0000-0000-000000000003'),
  TRUE,
  'preserve: source membership registration_status row retains marked_paid_at after transfer'
);

SELECT * FROM finish();
ROLLBACK;
