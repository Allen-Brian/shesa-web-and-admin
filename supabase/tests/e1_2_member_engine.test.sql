-- pgTAP: Phase 1 E1.2 member-engine invariants.
--
-- Covers:
--   A. Contact-required constraint (email OR phone).
--   B. Scope-type FK trigger — batch/house/network columns must reference
--      the correct scope_type.
--   C. Exit-after-entry constraint.
--   D. Duplicate-detection indexes exist and are hit by the intended
--      predicates (sanity check for the plan-verifiable "indexes not
--      forgotten").
--   E. RLS: a non-owner authenticated user cannot SELECT another
--      member's row (deny path).
--   F. RLS: mainstream_admin can INSERT a member (happy path).
--   G. RLS: member_accounts claimed-status CHECK — claimed requires
--      claimed_at AND auth_user_id together.

BEGIN;
SET LOCAL search_path = pgtap, public, audit, core, auth;

GRANT USAGE ON SCHEMA pgtap TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO authenticated;

SELECT plan(10);

-------------------------------------------------------------------------------
-- Setup: two users, one as mainstream_admin
-------------------------------------------------------------------------------

INSERT INTO auth.users (id, email, instance_id) VALUES
  ('77777777-0000-0000-0000-00000000aaaa', 'e2a@shesa.test', '00000000-0000-0000-0000-000000000000'),
  ('77777777-0000-0000-0000-00000000bbbb', 'e2b@shesa.test', '00000000-0000-0000-0000-000000000000');

INSERT INTO core.role_assignments (id, user_id, scope_id, role_id, granted_by)
VALUES (
  '77777777-1111-0000-0000-000000000001',
  '77777777-0000-0000-0000-00000000aaaa',
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM core.roles WHERE key = 'mainstream_admin'),
  NULL
);

-- Pick real seeded batch/house/network ids for FK tests.
-- Seed provides at least: Batch 1953 (any batch year), St Thomas house, Other network.

-------------------------------------------------------------------------------
-- A) Contact-required CHECK: email AND phone both NULL rejected
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ INSERT INTO core.members (full_name, email, phone,
       batch_scope_id, house_scope_id, network_scope_id)
     VALUES ('No Contact', NULL, NULL,
       (SELECT id FROM core.scopes WHERE slug = 'batch-1953'),
       '33333333-0000-0000-0000-000000000001',
       '44444444-0000-0000-0000-000000000001'
     ) $$,
  '23514',
  NULL,
  'members: email + phone both NULL rejected by CHECK'
);

-------------------------------------------------------------------------------
-- B) Scope-type FK trigger — misuse rejected
-------------------------------------------------------------------------------

-- Passing a branch id in the batch_scope_id slot should be rejected.
INSERT INTO core.scopes (id, name, slug, scope_type, parent_scope_id)
VALUES (
  '77777777-3333-0000-0000-000000000001',
  'E1.2 Test Branch',
  'e12-test-branch',
  'branch',
  '00000000-0000-0000-0000-000000000001'
);

SELECT throws_ok(
  $$ INSERT INTO core.members (full_name, email,
       batch_scope_id, house_scope_id, network_scope_id)
     VALUES ('Bad FK', 'bad-fk@shesa.test',
       '77777777-3333-0000-0000-000000000001',                          -- WRONG: a branch, not a batch
       '33333333-0000-0000-0000-000000000001',
       '44444444-0000-0000-0000-000000000001'
     ) $$,
  '23514',
  NULL,
  'members: passing a branch id in batch_scope_id rejected by scope-type trigger'
);

-- House column pointing at a network — rejected.
SELECT throws_ok(
  $$ INSERT INTO core.members (full_name, email,
       batch_scope_id, house_scope_id, network_scope_id)
     VALUES ('Bad FK 2', 'bad-fk2@shesa.test',
       (SELECT id FROM core.scopes WHERE slug = 'batch-1953'),
       '44444444-0000-0000-0000-000000000001',                          -- WRONG: network in house slot
       '44444444-0000-0000-0000-000000000001'
     ) $$,
  '23514',
  NULL,
  'members: passing a network id in house_scope_id rejected by scope-type trigger'
);

-------------------------------------------------------------------------------
-- C) Exit-after-entry CHECK
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ INSERT INTO core.members (full_name, email, entry_year, exit_year,
       batch_scope_id, house_scope_id, network_scope_id)
     VALUES ('Time Traveller', 'tt@shesa.test', 2010, 2005,
       (SELECT id FROM core.scopes WHERE slug = 'batch-1953'),
       '33333333-0000-0000-0000-000000000001',
       '44444444-0000-0000-0000-000000000001'
     ) $$,
  '23514',
  NULL,
  'members: exit_year < entry_year rejected by CHECK'
);

-------------------------------------------------------------------------------
-- D) Duplicate-detection indexes exist
-------------------------------------------------------------------------------

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'core' AND indexname = 'members_lower_email_idx'
  ),
  'members: LOWER(email) index for duplicate detection exists'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'core' AND indexname = 'members_fullname_batch_idx'
  ),
  'members: (full_name, batch_scope_id) composite index for duplicate detection exists'
);

-------------------------------------------------------------------------------
-- E) RLS deny path: non-owner cannot SELECT another member
-------------------------------------------------------------------------------

-- Insert a member row as superuser (bypasses RLS).
INSERT INTO core.members (
  id, full_name, email,
  batch_scope_id, house_scope_id, network_scope_id
)
VALUES (
  '77777777-4444-0000-0000-000000000001',
  'Target Member',
  'target@shesa.test',
  (SELECT id FROM core.scopes WHERE slug = 'batch-1953'),
  '33333333-0000-0000-0000-000000000001',
  '44444444-0000-0000-0000-000000000001'
);

-- Switch to user B (no grants).
SET LOCAL request.jwt.claim.sub  = '77777777-0000-0000-0000-00000000bbbb';
SET LOCAL request.jwt.claim.role = 'authenticated';
SET LOCAL ROLE authenticated;
SET LOCAL search_path = pgtap, public, audit, core, auth;

SELECT is(
  (SELECT COUNT(*)::int FROM core.members
   WHERE id = '77777777-4444-0000-0000-000000000001'),
  0,
  'members RLS: unrelated authenticated user sees 0 rows for another member'
);

-------------------------------------------------------------------------------
-- F) RLS happy path: mainstream_admin sees the row via member.read
-------------------------------------------------------------------------------

RESET ROLE;
SET LOCAL search_path = pgtap, public, audit, core, auth;
SET LOCAL request.jwt.claim.sub  = '77777777-0000-0000-0000-00000000aaaa';
SET LOCAL request.jwt.claim.role = 'authenticated';
SET LOCAL ROLE authenticated;
SET LOCAL search_path = pgtap, public, audit, core, auth;

SELECT is(
  (SELECT COUNT(*)::int FROM core.members
   WHERE id = '77777777-4444-0000-0000-000000000001'),
  1,
  'members RLS: mainstream_admin (has member.read) sees the row'
);

-------------------------------------------------------------------------------
-- G) member_accounts claim CHECK
-------------------------------------------------------------------------------

RESET ROLE;
SET LOCAL search_path = pgtap, public, audit, core, auth;

-- claim_status='claimed' without claimed_at → rejected.
SELECT throws_ok(
  $$ INSERT INTO core.member_accounts (member_id, auth_user_id, claim_status, invited_at)
     VALUES ('77777777-4444-0000-0000-000000000001',
             '77777777-0000-0000-0000-00000000bbbb',
             'claimed',
             NOW()) $$,
  '23514',
  NULL,
  'member_accounts: claim_status=claimed without claimed_at rejected by CHECK'
);

-- Well-formed claimed row → accepted.
SELECT lives_ok(
  $$ INSERT INTO core.member_accounts (member_id, auth_user_id, claim_status, invited_at, claimed_at)
     VALUES ('77777777-4444-0000-0000-000000000001',
             '77777777-0000-0000-0000-00000000bbbb',
             'claimed',
             NOW() - interval '1 day',
             NOW()) $$,
  'member_accounts: well-formed claimed row accepted (claimed_at + auth_user_id both present)'
);

SELECT * FROM finish();
ROLLBACK;
