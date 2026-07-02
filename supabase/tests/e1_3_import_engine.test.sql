-- pgTAP: Phase 1 E1.3 import-engine invariants.
--
-- Covers:
--   A. import_batches CHECK: confirmed status ↔ confirmed_at + confirmed_by.
--   B. import_batches CHECK: cancelled status ↔ cancelled_at + cancelled_by.
--   C. import_rows UNIQUE (batch, row_number).
--   D. RLS: unrelated authenticated user sees 0 batches / 0 rows.
--   E. RLS: mainstream_admin (has member.import via bundle) sees a batch.

BEGIN;
SET LOCAL search_path = pgtap, public, audit, core, auth;

GRANT USAGE ON SCHEMA pgtap TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgtap TO authenticated;

SELECT plan(8);

-------------------------------------------------------------------------------
-- Setup: two users, one as mainstream_admin (has member.import)
-------------------------------------------------------------------------------

INSERT INTO auth.users (id, email, instance_id) VALUES
  ('66666666-0000-0000-0000-00000000aaaa', 'e3a@shesa.test', '00000000-0000-0000-0000-000000000000'),
  ('66666666-0000-0000-0000-00000000bbbb', 'e3b@shesa.test', '00000000-0000-0000-0000-000000000000');

INSERT INTO core.role_assignments (id, user_id, scope_id, role_id, granted_by)
VALUES (
  '66666666-1111-0000-0000-000000000001',
  '66666666-0000-0000-0000-00000000aaaa',
  '00000000-0000-0000-0000-000000000001',
  (SELECT id FROM core.roles WHERE key = 'mainstream_admin'),
  NULL
);

-------------------------------------------------------------------------------
-- A) confirm-status CHECK — confirmed without confirmed_at rejected
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ INSERT INTO core.import_batches (
       scope_id, uploaded_by, file_name, storage_path, status
     )
     VALUES (
       '00000000-0000-0000-0000-000000000001',
       '66666666-0000-0000-0000-00000000aaaa',
       'x.xlsx', 'imports/x.xlsx', 'confirmed'
     ) $$,
  '23514',
  NULL,
  'import_batches: confirmed status without confirmed_at rejected by CHECK'
);

-------------------------------------------------------------------------------
-- B) cancel-status CHECK — cancelled without cancelled_at rejected
-------------------------------------------------------------------------------

SELECT throws_ok(
  $$ INSERT INTO core.import_batches (
       scope_id, uploaded_by, file_name, storage_path, status
     )
     VALUES (
       '00000000-0000-0000-0000-000000000001',
       '66666666-0000-0000-0000-00000000aaaa',
       'y.xlsx', 'imports/y.xlsx', 'cancelled'
     ) $$,
  '23514',
  NULL,
  'import_batches: cancelled status without cancelled_at rejected by CHECK'
);

-- Well-formed uploaded batch — accepted.
INSERT INTO core.import_batches (
  id, scope_id, uploaded_by, file_name, storage_path, status
)
VALUES (
  '66666666-3333-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '66666666-0000-0000-0000-00000000aaaa',
  'good.xlsx',
  'imports/good.xlsx',
  'uploaded'
);

SELECT ok(
  EXISTS (SELECT 1 FROM core.import_batches WHERE id = '66666666-3333-0000-0000-000000000001'),
  'import_batches: well-formed uploaded batch accepted'
);

-------------------------------------------------------------------------------
-- C) UNIQUE (batch, row_number) — dup row_number in same batch rejected
-------------------------------------------------------------------------------

INSERT INTO core.import_rows (
  import_batch_id, row_number, raw_data
)
VALUES (
  '66666666-3333-0000-0000-000000000001',
  1,
  '{"full_name":"Row 1"}'::jsonb
);

SELECT throws_ok(
  $$ INSERT INTO core.import_rows (
       import_batch_id, row_number, raw_data
     )
     VALUES (
       '66666666-3333-0000-0000-000000000001',
       1,
       '{"full_name":"Duplicate row 1"}'::jsonb
     ) $$,
  '23505',
  NULL,
  'import_rows: duplicate row_number in same batch rejected by UNIQUE'
);

-- But different row_number in same batch — accepted.
SELECT lives_ok(
  $$ INSERT INTO core.import_rows (
       import_batch_id, row_number, raw_data
     )
     VALUES (
       '66666666-3333-0000-0000-000000000001',
       2,
       '{"full_name":"Row 2"}'::jsonb
     ) $$,
  'import_rows: different row_number in same batch accepted'
);

-------------------------------------------------------------------------------
-- D) RLS deny: unrelated user sees 0 batches
-------------------------------------------------------------------------------

SET LOCAL request.jwt.claim.sub  = '66666666-0000-0000-0000-00000000bbbb';
SET LOCAL request.jwt.claim.role = 'authenticated';
SET LOCAL ROLE authenticated;
SET LOCAL search_path = pgtap, public, audit, core, auth;

SELECT is(
  (SELECT COUNT(*)::int FROM core.import_batches
   WHERE id = '66666666-3333-0000-0000-000000000001'),
  0,
  'import_batches RLS: unrelated authenticated user sees 0 batches'
);

SELECT is(
  (SELECT COUNT(*)::int FROM core.import_rows
   WHERE import_batch_id = '66666666-3333-0000-0000-000000000001'),
  0,
  'import_rows RLS: unrelated authenticated user sees 0 rows (inherited from batch)'
);

-------------------------------------------------------------------------------
-- E) RLS happy: mainstream_admin sees the batch (member.import in bundle)
-------------------------------------------------------------------------------

RESET ROLE;
SET LOCAL search_path = pgtap, public, audit, core, auth;
SET LOCAL request.jwt.claim.sub  = '66666666-0000-0000-0000-00000000aaaa';
SET LOCAL request.jwt.claim.role = 'authenticated';
SET LOCAL ROLE authenticated;
SET LOCAL search_path = pgtap, public, audit, core, auth;

SELECT is(
  (SELECT COUNT(*)::int FROM core.import_batches
   WHERE id = '66666666-3333-0000-0000-000000000001'),
  1,
  'import_batches RLS: mainstream_admin (has member.import) sees the batch'
);

SELECT * FROM finish();
ROLLBACK;
