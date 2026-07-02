-- Migration: create_core_import_tables
--
-- Phase 1 §3.11 + §3.12 — the two-table backbone for Excel member
-- imports.
--
--   core.import_batches  — one row per uploaded .xlsx. Tracks lifecycle
--                          (uploaded → validated → confirmed / cancelled
--                          / failed) plus who uploaded / confirmed and
--                          when.
--   core.import_rows     — one row per data row in the sheet. Carries
--                          raw + normalized JSON, validation status,
--                          per-row errors, and any duplicate signals
--                          the validator produced.
--
-- The lifecycle is deliberately staged so `confirm-member-import` is
-- **idempotent** — the confirm path transitions the batch's status
-- from `validated` → `confirmed` in a single UPDATE guarded by
-- `WHERE status='validated'`. A concurrent re-confirm sees zero rows
-- affected, doesn't create members, and short-circuits to the existing
-- outcome (§Concurrency, plan E1.3).
--
-- No FK from import_rows.created_member_id → core.members with ON
-- DELETE — an admin correction that soft-removes a member shouldn't
-- take down the import history. Instead we NULL it (ON DELETE SET
-- NULL) so the row remains as an audit artifact.

-------------------------------------------------------------------------------
-- 1. Enums
-------------------------------------------------------------------------------

CREATE TYPE core.import_batch_status AS ENUM (
  'uploaded',
  'validated',
  'confirmed',
  'cancelled',
  'failed'
);

COMMENT ON TYPE core.import_batch_status IS
  'Lifecycle of a member import batch. Transitions:
     uploaded → validated  (validate-member-import Edge Function)
     validated → confirmed (confirm-member-import Edge Function, idempotent)
     uploaded|validated → cancelled (admin dismiss)
     any → failed (parse blew up)';

CREATE TYPE core.import_row_status AS ENUM (
  'pending',
  'valid',
  'invalid',
  'duplicate',
  'skipped',
  'created'
);

COMMENT ON TYPE core.import_row_status IS
  'Per-row state within an import batch. Duplicate is a soft-warning
   status — the operator can promote to valid via a force override in
   the review UI. Created is set on confirm when a member row was
   actually written.';

-------------------------------------------------------------------------------
-- 2. Table: core.import_batches
-------------------------------------------------------------------------------

CREATE TABLE core.import_batches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The scope the import targets. For Mainstream-level imports this
  -- is the Mainstream row; branch-scoped imports carry the branch id.
  -- Determines who can see the batch under RLS.
  scope_id          UUID NOT NULL REFERENCES core.scopes(id) ON DELETE RESTRICT,

  uploaded_by       UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,

  -- The private Storage object path (bucket = 'member-imports') for the
  -- raw .xlsx. Kept for traceability + re-parse if the validator is
  -- fixed after the fact.
  file_name         TEXT NOT NULL,
  storage_path      TEXT NOT NULL,

  status            core.import_batch_status NOT NULL DEFAULT 'uploaded',

  total_rows        INTEGER NOT NULL DEFAULT 0,
  valid_rows        INTEGER NOT NULL DEFAULT 0,
  invalid_rows      INTEGER NOT NULL DEFAULT 0,
  duplicate_rows    INTEGER NOT NULL DEFAULT 0,
  created_rows      INTEGER NOT NULL DEFAULT 0,

  parse_error       TEXT,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at      TIMESTAMPTZ,
  confirmed_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cancelled_at      TIMESTAMPTZ,
  cancelled_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  CONSTRAINT import_batches_confirm_consistent
    CHECK (
      (status = 'confirmed' AND confirmed_at IS NOT NULL AND confirmed_by IS NOT NULL)
      OR
      (status <> 'confirmed' AND confirmed_at IS NULL AND confirmed_by IS NULL)
    ),

  CONSTRAINT import_batches_cancel_consistent
    CHECK (
      (status = 'cancelled' AND cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL)
      OR
      (status <> 'cancelled' AND cancelled_at IS NULL AND cancelled_by IS NULL)
    )
);

CREATE INDEX import_batches_scope_id_idx    ON core.import_batches (scope_id);
CREATE INDEX import_batches_status_idx      ON core.import_batches (status);
CREATE INDEX import_batches_uploaded_by_idx ON core.import_batches (uploaded_by);

COMMENT ON TABLE core.import_batches IS
  'One row per uploaded member-import .xlsx. Lifecycle guards make confirm-member-import naturally idempotent via WHERE status=validated.';

-------------------------------------------------------------------------------
-- 3. Table: core.import_rows
-------------------------------------------------------------------------------

CREATE TABLE core.import_rows (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  import_batch_id        UUID NOT NULL REFERENCES core.import_batches(id) ON DELETE CASCADE,

  -- Row number in the sheet (1-indexed, EXCLUDING the header row).
  -- Kept so error messages can point the operator at "row 42" in the
  -- source file.
  row_number             INTEGER NOT NULL,

  -- The row as parsed from the sheet — string values, no coercion.
  -- Useful for redisplay if the normalized shape is wrong.
  raw_data               JSONB NOT NULL,

  -- The row after normalization: email lowercased, entry_year cast to
  -- int, batch_scope_id / house_scope_id / sector_scope_id resolved
  -- from the sheet's slug/year labels. Consumed by confirm-member-import.
  normalized_data        JSONB NOT NULL DEFAULT '{}'::jsonb,

  validation_status      core.import_row_status NOT NULL DEFAULT 'pending',

  -- Errors: flat array of strings. Duplicate signals: shape from
  -- packages/domain/src/members/duplicate-detection.ts.
  errors                 JSONB NOT NULL DEFAULT '[]'::jsonb,
  duplicate_signals      JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_member_id      UUID REFERENCES core.members(id) ON DELETE SET NULL,

  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One row per (batch, row_number). Re-uploads make a new batch.
  UNIQUE (import_batch_id, row_number)
);

CREATE INDEX import_rows_batch_status_idx
  ON core.import_rows (import_batch_id, validation_status);

COMMENT ON TABLE core.import_rows IS
  'One row per data row in a member-import batch. raw_data + normalized_data + validation_status drive the review UI; confirm-member-import consumes validation_status = valid rows.';

-------------------------------------------------------------------------------
-- 4. RLS — enable with policies restricted to the batch's scope
-------------------------------------------------------------------------------

ALTER TABLE core.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.import_rows    ENABLE ROW LEVEL SECURITY;

-- Batches: the uploader sees their own batch always. Anyone with
-- member.import at Mainstream (or ancestor of scope_id) sees any batch
-- at that scope. Same rule for import_rows — inherited via the batch.

CREATE POLICY import_batches_select ON core.import_batches
  FOR SELECT TO authenticated
  USING (
    uploaded_by = auth.uid()
    OR core.has_permission(auth.uid(), scope_id, 'member.import')
    OR core.has_permission(auth.uid(), core.mainstream_scope_id(), 'member.import')
  );

CREATE POLICY import_batches_insert ON core.import_batches
  FOR INSERT TO authenticated
  WITH CHECK (
    core.has_permission(auth.uid(), scope_id, 'member.import')
    OR core.has_permission(auth.uid(), core.mainstream_scope_id(), 'member.import')
  );

CREATE POLICY import_batches_update ON core.import_batches
  FOR UPDATE TO authenticated
  USING (
    core.has_permission(auth.uid(), scope_id, 'member.import')
    OR core.has_permission(auth.uid(), core.mainstream_scope_id(), 'member.import')
  )
  WITH CHECK (
    core.has_permission(auth.uid(), scope_id, 'member.import')
    OR core.has_permission(auth.uid(), core.mainstream_scope_id(), 'member.import')
  );

-- Rows inherit visibility from the batch. The subquery is fine here —
-- import_batches_select's own RLS still applies to the SELECT.
CREATE POLICY import_rows_select ON core.import_rows
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM core.import_batches b
      WHERE b.id = core.import_rows.import_batch_id
    )
  );

CREATE POLICY import_rows_insert ON core.import_rows
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM core.import_batches b
      WHERE b.id = import_rows.import_batch_id
    )
  );

CREATE POLICY import_rows_update ON core.import_rows
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM core.import_batches b
      WHERE b.id = core.import_rows.import_batch_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM core.import_batches b
      WHERE b.id = import_rows.import_batch_id
    )
  );

GRANT SELECT, INSERT, UPDATE ON core.import_batches TO authenticated;
GRANT SELECT, INSERT, UPDATE ON core.import_rows    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.import_batches TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.import_rows    TO service_role;
