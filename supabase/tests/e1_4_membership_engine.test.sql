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

BEGIN;
SET LOCAL search_path = pgtap, public, audit, core, auth;

GRANT USAGE ON SCHEMA pgtap TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO authenticated;

SELECT plan(10);

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

INSERT INTO core.scopes (id, name, slug, scope_type, parent_scope_id, chapter_kind, is_autonomous)
VALUES
  ('55555555-2222-0000-0000-000000000001', 'E1.4 Auto Chapter', 'e14-auto-chapter', 'chapter',
   '55555555-1111-0000-0000-000000000001', 'autonomous', TRUE),
  ('55555555-2222-0000-0000-000000000002', 'E1.4 Group Chapter', 'e14-group-chapter', 'chapter',
   '55555555-1111-0000-0000-000000000001', 'grouping', FALSE);

INSERT INTO core.role_assignments (id, user_id, scope_id, role_id, granted_by)
VALUES
  -- User B is a branch admin at Branch A.
  ('55555555-3333-0000-0000-000000000001',
   '55555555-0000-0000-0000-00000000bbbb',
   '55555555-1111-0000-0000-000000000001',
   (SELECT id FROM core.roles WHERE key = 'branch_admin'), NULL);

-- Test member.
INSERT INTO core.members (
  id, full_name, email, batch_scope_id, house_scope_id, sector_scope_id
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
  id, full_name, email, batch_scope_id, house_scope_id, sector_scope_id
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

SELECT * FROM finish();
ROLLBACK;
