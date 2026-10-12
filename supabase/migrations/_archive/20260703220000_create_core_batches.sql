-- Migration: create_core_batches
--
-- Batches detail table — the fourth cluster shipping the Option-1
-- two-table model (planning conversation 2026-07-02). Structure mirrors
-- core.houses / core.networks: 1:1 with core.scopes via scope_id, only
-- batch-specific fields land here.
--
-- Batch invariants per spec (2026-07-03 planning session):
--   - Global + Mainstream-owned (parent is always Mainstream).
--   - Attribute-based, not joined: members carry `batch_scope_id`, no
--     `core.memberships` row is created against a batch.
--   - No geography, no currency, no registration — the shared columns
--     that would carry those on branches/chapters stay unused. Currency
--     defaults to 'XAF' and is ignored.
--   - `entry_year` (INT) already lives on core.scopes for batches
--     (introduced by 20260701200100_extend_core_scopes.sql). It's the
--     natural key.
--   - Ordinal position (1st batch, 2nd batch, …, 53rd batch, …) is a
--     manually-assigned INT. Not derived from entry_year because the
--     school's history has ~7 years without a graduating batch (school
--     started 1946, first batch graduated 1953, 2012 = 53rd batch even
--     though year-1953+1 would suggest 60th). Nullable — admins fill it
--     in on demand; seeded batches ship without an ordinal and the UI
--     shows a blank in the ordinal column until an admin sets it.
--
-- Two names displayed everywhere a batch is shown:
--   - Year form: "2012 Batch" (stored as core.scopes.name)
--   - Ordinal form: "53rd Batch" (computed in the UI from ordinal via
--     formatOrdinal(n) — no separate column, since the ordinal itself
--     is the source of truth)

-------------------------------------------------------------------------------
-- 1. Rename seeded batches from "Batch YYYY" → "YYYY Batch"
-------------------------------------------------------------------------------
-- Bring the existing seeded 1953→2026 rows into the naming convention
-- the app renders. Idempotent: only rewrites rows still on the old
-- naming, leaves rows an admin may have renamed alone.

UPDATE core.scopes
   SET name = entry_year::text || ' Batch'
 WHERE scope_type = 'batch'
   AND name = 'Batch ' || entry_year::text;

-------------------------------------------------------------------------------
-- 2. Table
-------------------------------------------------------------------------------

CREATE TABLE core.batches (
  scope_id     UUID PRIMARY KEY REFERENCES core.scopes(id) ON DELETE CASCADE,
  ordinal      INTEGER,
  nickname     TEXT,
  description  TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT batches_ordinal_positive
    CHECK (ordinal IS NULL OR ordinal > 0),

  CONSTRAINT batches_nickname_len
    CHECK (nickname IS NULL OR char_length(nickname) BETWEEN 1 AND 80),

  CONSTRAINT batches_email_shape
    CHECK (contact_email IS NULL OR contact_email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$')
);

COMMENT ON TABLE core.batches IS
  'Batch-only fields. 1:1 with core.scopes via scope_id. `ordinal` is nullable — admins fill it in per batch (school history is discontinuous, no derive-from-year formula holds).';
COMMENT ON COLUMN core.batches.ordinal IS
  'Manual ordinal position: 1 = first ever batch (1953). Nullable + partial-unique so an admin can seed sparsely.';
COMMENT ON COLUMN core.batches.nickname IS
  'Optional batch nickname (e.g. "Golden Jubilee Batch"). Free text.';

CREATE TRIGGER batches_set_updated_at
  BEFORE UPDATE ON core.batches
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

-------------------------------------------------------------------------------
-- 3. Indexes
-------------------------------------------------------------------------------

-- Partial unique on ordinal — enforced only when set. Two batches
-- cannot both claim "53rd", but rows without an ordinal are allowed.
CREATE UNIQUE INDEX batches_ordinal_unique
  ON core.batches (ordinal)
  WHERE ordinal IS NOT NULL;

-- Sort helper — lists show batches by entry_year DESC (newest first).
-- entry_year lives on scopes; the JOIN suffices, no index needed here.

-------------------------------------------------------------------------------
-- 4. RLS — same open-SELECT pattern as core.houses / core.networks
-------------------------------------------------------------------------------

ALTER TABLE core.batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY batches_select_authenticated ON core.batches
  FOR SELECT TO authenticated
  USING (TRUE);

GRANT SELECT ON core.batches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.batches TO service_role;

-------------------------------------------------------------------------------
-- 5. Backfill — one core.batches row per existing seeded batch scope
-------------------------------------------------------------------------------
-- Every batch scope 1953→2026 seeded by supabase/seed.sql gets a companion
-- detail row so the JOIN never returns NULL. Ordinal stays NULL — admins
-- fill it in per batch via the UI (school history is discontinuous, see
-- top-of-file comment).

INSERT INTO core.batches (scope_id)
SELECT id FROM core.scopes WHERE scope_type = 'batch'
ON CONFLICT (scope_id) DO NOTHING;

-------------------------------------------------------------------------------
-- 6. RPC: atomic create + update (SECURITY DEFINER)
-------------------------------------------------------------------------------
-- Same shape as core.create_network / core.update_network — the Edge
-- Function's authorize() check gates access; the RPC runs with owner
-- privileges so authenticated JWTs without direct table writes still
-- succeed.

CREATE OR REPLACE FUNCTION core.create_batch(
  p_name        TEXT,
  p_slug        TEXT,
  p_entry_year  INTEGER,
  p_ordinal     INTEGER,
  p_nickname    TEXT,
  p_description TEXT,
  p_contact_email TEXT,
  p_contact_phone TEXT,
  p_metadata    JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, core, public, auth
AS $$
DECLARE
  v_mainstream_id UUID;
  v_scope_id      UUID;
BEGIN
  SELECT id INTO v_mainstream_id FROM core.scopes WHERE scope_type = 'mainstream';
  IF v_mainstream_id IS NULL THEN
    RAISE EXCEPTION 'no mainstream scope found — seed has not run';
  END IF;

  INSERT INTO core.scopes (
    name, slug, scope_type, parent_scope_id, entry_year, currency_code, metadata, created_by
  ) VALUES (
    p_name, p_slug, 'batch', v_mainstream_id, p_entry_year, 'XAF', p_metadata, auth.uid()
  )
  RETURNING id INTO v_scope_id;

  INSERT INTO core.batches (
    scope_id, ordinal, nickname, description, contact_email, contact_phone, created_by
  ) VALUES (
    v_scope_id, p_ordinal, p_nickname, p_description, p_contact_email, p_contact_phone, auth.uid()
  );

  RETURN v_scope_id;
END;
$$;

COMMENT ON FUNCTION core.create_batch IS
  'Atomic scopes + batches insert. SECURITY DEFINER — Edge Function must clear scope.create at Mainstream first.';

REVOKE ALL ON FUNCTION core.create_batch(TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core.create_batch(TEXT, TEXT, INTEGER, INTEGER, TEXT, TEXT, TEXT, TEXT, JSONB)
  TO authenticated, service_role;


CREATE OR REPLACE FUNCTION core.update_batch(
  p_scope_id    UUID,
  p_name        TEXT,
  p_ordinal     INTEGER,
  p_nickname    TEXT,
  p_description TEXT,
  p_contact_email TEXT,
  p_contact_phone TEXT,
  p_status      core.scope_status
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, core, public, auth
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM core.scopes
    WHERE id = p_scope_id AND scope_type = 'batch'
  ) THEN
    RAISE EXCEPTION 'batch % not found', p_scope_id
      USING ERRCODE = '23503';
  END IF;

  UPDATE core.scopes
     SET name   = COALESCE(p_name,   name),
         status = COALESCE(p_status, status)
   WHERE id = p_scope_id;

  UPDATE core.batches
     SET ordinal       = COALESCE(p_ordinal,       ordinal),
         nickname      = COALESCE(p_nickname,      nickname),
         description   = COALESCE(p_description,   description),
         contact_email = COALESCE(p_contact_email, contact_email),
         contact_phone = COALESCE(p_contact_phone, contact_phone)
   WHERE scope_id = p_scope_id;
END;
$$;

COMMENT ON FUNCTION core.update_batch IS
  'Atomic scopes + batches patch. SECURITY DEFINER — Edge Function must clear scope.update at the batch first.';

REVOKE ALL ON FUNCTION core.update_batch(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, core.scope_status) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core.update_batch(UUID, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, core.scope_status)
  TO authenticated, service_role;
