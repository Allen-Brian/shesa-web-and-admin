-- pgTAP: Phase 3 M2A charge CRUD invariants.
--
-- Covers the DB-level rules that back the charges/create + charges/update
-- edge functions. The Zod + validateChargeInput layer (packages/domain)
-- gives friendly errors up-front; these tests confirm the DB itself
-- refuses malformed rows even if that layer were bypassed.
--
-- Tests:
--   A. charges_capacity_only_ticketed CHECK rejects capacity on non-ticketed
--   B. charges_goal_only_goal_shape CHECK rejects goal_amount on non-goal
--   C. charges_contribution_has_lifecycle CHECK rejects contribution without lifecycle
--   D. charges_contribution_has_lifecycle CHECK rejects lifecycle on shape='charge'
--   E. charges_close_after_open CHECK rejects reversed window
--   F. A valid 'charge' shape row inserts cleanly (positive control)
--   G. A valid 'goal' shape row inserts cleanly (positive control)
--   H. RLS: authenticated with treasury.read at scope CAN SELECT
--   I. RLS: authenticated without permission at scope CANNOT SELECT
--   J. Contribution extensions table exists with the right FK to charges

BEGIN;
SET LOCAL search_path = pgtap, public, audit, core, finance, auth;

GRANT USAGE ON SCHEMA pgtap TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO authenticated;

SELECT plan(10);

-------------------------------------------------------------------------------
-- Setup — a test branch scope with a Finance user granted at the scope.
-------------------------------------------------------------------------------

INSERT INTO auth.users (id, email, instance_id) VALUES
  ('88888888-0000-0000-0000-00000000aaaa', 'e32a@shesa.test', '00000000-0000-0000-0000-000000000000'),
  ('88888888-0000-0000-0000-00000000bbbb', 'e32b@shesa.test', '00000000-0000-0000-0000-000000000000');

INSERT INTO core.scopes (id, name, slug, scope_type, parent_scope_id, currency_code)
VALUES (
  '88888888-1111-0000-0000-000000000001',
  'E3.2 Test Branch',
  'e32-test-branch',
  'branch',
  '00000000-0000-0000-0000-000000000001',
  'XAF'
);

-- User A gets the finance role at the test branch (treasury.read + finance.read + write).
INSERT INTO core.role_assignments (id, user_id, role_id, scope_id, starts_at)
SELECT
  '88888888-2222-0000-0000-000000000001',
  '88888888-0000-0000-0000-00000000aaaa',
  r.id,
  '88888888-1111-0000-0000-000000000001',
  NOW()
FROM core.roles r WHERE r.key = 'finance';

-------------------------------------------------------------------------------
-- A) charges_capacity_only_ticketed rejects capacity on non-ticketed
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ INSERT INTO finance.charges
       (scope_id, shape, name, base_amount, currency, capacity)
     VALUES
       ('88888888-1111-0000-0000-000000000001', 'charge', 'Bad capacity', 100, 'XAF', 50) $$,
  '23514',
  NULL,
  'charges: capacity on non-ticketed shape raises 23514'
);

-------------------------------------------------------------------------------
-- B) charges_goal_only_goal_shape rejects goal_amount on non-goal
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ INSERT INTO finance.charges
       (scope_id, shape, name, base_amount, currency, goal_amount)
     VALUES
       ('88888888-1111-0000-0000-000000000001', 'charge', 'Bad goal', 100, 'XAF', 10000) $$,
  '23514',
  NULL,
  'charges: goal_amount on non-goal shape raises 23514'
);

-------------------------------------------------------------------------------
-- C) contribution shapes require a lifecycle
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ INSERT INTO finance.charges
       (scope_id, shape, name, currency, goal_amount, open_date, close_date)
     VALUES
       ('88888888-1111-0000-0000-000000000001', 'goal', 'Missing lifecycle',
        'XAF', 100000, NOW(), NOW() + INTERVAL '30 days') $$,
  '23514',
  NULL,
  'charges: contribution shape without lifecycle raises 23514'
);

-------------------------------------------------------------------------------
-- D) shape='charge' MUST NOT carry a lifecycle
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ INSERT INTO finance.charges
       (scope_id, shape, name, base_amount, currency, lifecycle)
     VALUES
       ('88888888-1111-0000-0000-000000000001', 'charge', 'Lifecycle on charge',
        100, 'XAF', 'draft') $$,
  '23514',
  NULL,
  'charges: lifecycle on shape=charge raises 23514'
);

-------------------------------------------------------------------------------
-- E) close_date must be on or after open_date
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ INSERT INTO finance.charges
       (scope_id, shape, name, currency, goal_amount, lifecycle, open_date, close_date)
     VALUES
       ('88888888-1111-0000-0000-000000000001', 'goal', 'Reversed window',
        'XAF', 100000, 'draft', NOW() + INTERVAL '30 days', NOW()) $$,
  '23514',
  NULL,
  'charges: close_date before open_date raises 23514'
);

-------------------------------------------------------------------------------
-- F) Positive control — a well-formed 'charge' shape inserts
-------------------------------------------------------------------------------

SELECT lives_ok(
  $$ INSERT INTO finance.charges
       (scope_id, shape, name, base_amount, currency, recurrence, activation_date, status)
     VALUES
       ('88888888-1111-0000-0000-000000000001', 'charge', 'E3.2 Valid Charge',
        25000, 'XAF', 'monthly', NOW(), 'draft') $$,
  'charges: a well-formed charge shape row inserts cleanly'
);

-------------------------------------------------------------------------------
-- G) Positive control — a well-formed 'goal' contribution inserts
-------------------------------------------------------------------------------

SELECT lives_ok(
  $$ INSERT INTO finance.charges
       (scope_id, shape, name, currency, goal_amount, lifecycle, open_date, close_date)
     VALUES
       ('88888888-1111-0000-0000-000000000001', 'goal', 'E3.2 Valid Goal',
        'XAF', 210000, 'draft', NOW(), NOW() + INTERVAL '30 days') $$,
  'charges: a well-formed goal contribution row inserts cleanly'
);

-------------------------------------------------------------------------------
-- H) RLS: authenticated with treasury.read at the scope CAN SELECT
-------------------------------------------------------------------------------

SET LOCAL ROLE authenticated;
SET LOCAL search_path = pgtap, public, audit, core, finance, auth;

-- Impersonate user A (the finance officer at the test branch).
SET LOCAL request.jwt.claim.sub = '88888888-0000-0000-0000-00000000aaaa';
SET LOCAL request.jwt.claims = '{"sub":"88888888-0000-0000-0000-00000000aaaa","role":"authenticated"}';

SELECT cmp_ok(
  (SELECT COUNT(*)::int FROM finance.charges WHERE scope_id = '88888888-1111-0000-0000-000000000001'),
  '>',
  0,
  'RLS: authenticated user with finance role at scope sees charges (treasury.read reachable via role bundle)'
);

-------------------------------------------------------------------------------
-- I) RLS: authenticated without permission CANNOT SELECT (silently filtered)
-------------------------------------------------------------------------------

SET LOCAL request.jwt.claim.sub = '88888888-0000-0000-0000-00000000bbbb';
SET LOCAL request.jwt.claims = '{"sub":"88888888-0000-0000-0000-00000000bbbb","role":"authenticated"}';

SELECT is(
  (SELECT COUNT(*)::int FROM finance.charges WHERE scope_id = '88888888-1111-0000-0000-000000000001'),
  0,
  'RLS: authenticated user without permission sees zero rows at the scope'
);

RESET ROLE;
SET LOCAL search_path = pgtap, public, audit, core, finance, auth;

-------------------------------------------------------------------------------
-- J) contribution_extensions references charges with CASCADE
-------------------------------------------------------------------------------

SELECT is(
  (SELECT confdeltype
     FROM pg_constraint c
     JOIN pg_class t ON t.oid = c.conrelid
     JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'finance'
      AND t.relname = 'contribution_extensions'
      AND c.contype = 'f'
      AND c.confrelid = (SELECT oid FROM pg_class WHERE relname = 'charges' AND relnamespace = 'finance'::regnamespace)
    LIMIT 1),
  'c'::"char",
  'finance.contribution_extensions FK to charges uses ON DELETE CASCADE (charge deletion is blocked by RESTRICT elsewhere; this is the escape hatch)'
);

SELECT * FROM finish();
ROLLBACK;
