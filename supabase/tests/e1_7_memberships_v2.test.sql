-- pgTAP: Phase 2 M1 memberships-v2 invariants (engagement + registration v2).
--
-- Covers:
--   A. engagement_tier enum has exactly the five values in the fixed order.
--   B. Default engagement on a new membership is 'normal'.
--   C. Setting engagement to a valid value works.
--   D. Setting engagement to an invalid value fails (enum type guard).
--   E. registration_status: mutually-exclusive terminal timestamps CHECK
--      rejects a row with both marked_paid_at AND waived_at set.
--   F. registration_status: registration_state SQL helper returns the
--      correct derived state for each shape.
--   G. registration_status: transferred_terminals_frozen trigger BLOCKS
--      an UPDATE that nulls all terminal timestamps on a row whose parent
--      membership is `transferred`.
--   H. registration_status: transferred_terminals_frozen trigger ALLOWS
--      a correction that swaps one terminal for another on the same row.
--   I. New permission keys exist in the catalog:
--      membership.engagement.set, membership.remove, registration.waive,
--      registration.pay_on_behalf.

BEGIN;
SET LOCAL search_path = pgtap, public, audit, core, auth;

GRANT USAGE ON SCHEMA pgtap TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO authenticated;

SELECT plan(13);

-------------------------------------------------------------------------------
-- Setup — a fresh member + membership at Branch A
-------------------------------------------------------------------------------

INSERT INTO auth.users (id, email, instance_id) VALUES
  ('66666666-0000-0000-0000-00000000aaaa', 'e17a@shesa.test', '00000000-0000-0000-0000-000000000000');

INSERT INTO core.scopes (id, name, slug, scope_type, parent_scope_id)
VALUES (
  '66666666-1111-0000-0000-000000000001', 'E1.7 Test Branch', 'e17-test-branch', 'branch',
  '00000000-0000-0000-0000-000000000001'
);

INSERT INTO core.members (
  id, full_name, email, batch_scope_id, house_scope_id, network_scope_id
) VALUES (
  '66666666-4444-0000-0000-000000000001',
  'E1.7 Test Member',
  'e17-member@shesa.test',
  (SELECT id FROM core.scopes WHERE slug = 'batch-1953'),
  '33333333-0000-0000-0000-000000000001',
  '44444444-0000-0000-0000-000000000001'
);

INSERT INTO core.memberships (
  id, member_id, scope_id, membership_status, join_method, joined_at
) VALUES (
  '66666666-5555-0000-0000-000000000001',
  '66666666-4444-0000-0000-000000000001',
  '66666666-1111-0000-0000-000000000001',
  'active', 'admin_added', NOW()
);

-------------------------------------------------------------------------------
-- A) engagement_tier enum has exactly the five values in the fixed order
-------------------------------------------------------------------------------

SELECT is(
  (SELECT array_agg(enumlabel::text ORDER BY enumsortorder)
   FROM pg_enum e
   INNER JOIN pg_type t ON t.oid = e.enumtypid
   WHERE t.typname = 'engagement_tier'),
  ARRAY['dormant', 'normal', 'engaged', 'committed', 'pillar']::text[],
  'engagement_tier enum has the five values in ladder order'
);

-------------------------------------------------------------------------------
-- B) Default engagement on a new membership is 'normal'
-------------------------------------------------------------------------------

SELECT is(
  (SELECT engagement::text FROM core.memberships
   WHERE id = '66666666-5555-0000-0000-000000000001'),
  'normal',
  'memberships: engagement column defaults to `normal` on insert'
);

-------------------------------------------------------------------------------
-- C) Setting engagement to a valid value works
-------------------------------------------------------------------------------

UPDATE core.memberships
   SET engagement = 'committed'
 WHERE id = '66666666-5555-0000-0000-000000000001';

SELECT is(
  (SELECT engagement::text FROM core.memberships
   WHERE id = '66666666-5555-0000-0000-000000000001'),
  'committed',
  'memberships: engagement can be updated to a valid enum value'
);

-------------------------------------------------------------------------------
-- D) Invalid engagement value rejected by enum type
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ UPDATE core.memberships
        SET engagement = 'super-devoted'
      WHERE id = '66666666-5555-0000-0000-000000000001' $$,
  '22P02',
  NULL,
  'memberships: engagement rejects a value outside the enum'
);

-------------------------------------------------------------------------------
-- E) registration_status: mutually-exclusive terminals rejected
-------------------------------------------------------------------------------
-- Insert a fee_required row, then try to set BOTH marked_paid_at AND
-- waived_at in the same UPDATE — the mutually-exclusive CHECK rejects.

INSERT INTO core.registration_status (
  membership_id, fee_required, amount, currency_code
) VALUES (
  '66666666-5555-0000-0000-000000000001', TRUE, 10000, 'XAF'
);

SELECT throws_ok(
  $$ UPDATE core.registration_status
        SET marked_paid_at = NOW(),
            marked_paid_by = '66666666-0000-0000-0000-00000000aaaa',
            waived_at = NOW(),
            waived_by = '66666666-0000-0000-0000-00000000aaaa'
      WHERE membership_id = '66666666-5555-0000-0000-000000000001' $$,
  '23514',
  NULL,
  'registration_status: cannot set both marked_paid_at and waived_at (mutually exclusive)'
);

-------------------------------------------------------------------------------
-- F) registration_state helper returns the expected derived state
-------------------------------------------------------------------------------

SELECT is(
  core.registration_state(TRUE, NULL, NULL, NULL),
  'pending',
  'registration_state helper: fee_required + no terminals → pending'
);

SELECT is(
  core.registration_state(FALSE, NULL, NULL, NULL),
  'not_required',
  'registration_state helper: !fee_required → not_required'
);

SELECT is(
  core.registration_state(TRUE, NOW(), NULL, NULL),
  'paid',
  'registration_state helper: marked_paid_at set → paid'
);

SELECT is(
  core.registration_state(TRUE, NULL, NOW(), NULL),
  'waived',
  'registration_state helper: waived_at set → waived'
);

SELECT is(
  core.registration_state(TRUE, NULL, NULL, NOW()),
  'paid_on_behalf',
  'registration_state helper: paid_on_behalf_at set → paid_on_behalf'
);

-------------------------------------------------------------------------------
-- G) transferred_terminals_frozen trigger blocks nulling all terminals
-------------------------------------------------------------------------------
-- Mark the registration as paid, close the parent membership to
-- transferred, then try to null the marked_paid_at → guarded.

UPDATE core.registration_status
   SET marked_paid_at = NOW(),
       marked_paid_by = '66666666-0000-0000-0000-00000000aaaa'
 WHERE membership_id = '66666666-5555-0000-0000-000000000001';

UPDATE core.memberships
   SET membership_status = 'transferred',
       transferred_at    = NOW()
 WHERE id = '66666666-5555-0000-0000-000000000001';

SELECT throws_ok(
  $$ UPDATE core.registration_status
        SET marked_paid_at = NULL,
            marked_paid_by = NULL
      WHERE membership_id = '66666666-5555-0000-0000-000000000001' $$,
  '23514',
  NULL,
  'transferred_terminals_frozen: cannot null all terminals on a transferred row'
);

-------------------------------------------------------------------------------
-- H) transferred_terminals_frozen allows correcting one terminal → another
-------------------------------------------------------------------------------
-- An admin fixing a mis-keyed registration should be able to swap
-- marked_paid_at for waived_at on the same row (both non-null after) —
-- the trigger only fires when ALL terminals go to null.

SELECT lives_ok(
  $$ UPDATE core.registration_status
        SET marked_paid_at = NULL,
            marked_paid_by = NULL,
            waived_at = NOW(),
            waived_by = '66666666-0000-0000-0000-00000000aaaa',
            waived_reason = 'Was mis-keyed as paid; actually waived'
      WHERE membership_id = '66666666-5555-0000-0000-000000000001' $$,
  'transferred_terminals_frozen: allows swapping one terminal for another'
);

-------------------------------------------------------------------------------
-- I) New permission keys exist in the catalog
-------------------------------------------------------------------------------

SELECT is(
  (SELECT COUNT(*)::int FROM core.permissions
   WHERE key IN (
     'membership.engagement.set',
     'membership.remove',
     'registration.waive',
     'registration.pay_on_behalf'
   )),
  4,
  'permissions catalog: all four M1 keys are present'
);

SELECT * FROM finish();
ROLLBACK;
