-- Migration: create_core_branches
--
-- Third cluster detail table. `core.branches` carries branch-only
-- fields alongside the shared `core.scopes` spine (Option 1 pattern,
-- see M6 core.houses and M7 core.networks).
--
-- Geography goes here (country + region + city) rather than on scopes
-- because it's branch/chapter-specific — houses, batches, networks have
-- no meaningful location. We use ISO alpha-2 country codes + free-text
-- region/city so the UI can source dropdowns from `country-state-city`
-- (npm library) without a reference-table roundtrip. The country_code
-- CHECK enforces the shape at write time.
--
-- Finance settings — registration fee tracking — live here too since
-- they only apply to branches + autonomous chapters. `currency_code`
-- stays on `core.scopes` (already there) because it's read by every
-- ancestor-walk query; the immutable-currency trigger from M5 attaches
-- to `core.scopes` in a follow-up migration once finance tables land.
--
-- Notably ABSENT: registration is TRACKED, not GATED — a member can
-- join a branch without paying (spec §3.5). The amount + required flag
-- surface in the UI as a reminder, not as an enforceable barrier.

-------------------------------------------------------------------------------
-- 1. Table
-------------------------------------------------------------------------------

CREATE TABLE core.branches (
  scope_id                    UUID PRIMARY KEY REFERENCES core.scopes(id) ON DELETE CASCADE,

  -- Geography
  country_code                TEXT NOT NULL,
  region                      TEXT NOT NULL,
  city                        TEXT NOT NULL,

  -- Presentation
  nickname                    TEXT,
  description                 TEXT,

  -- Registration tracking (not a gate)
  registration_fee_required   BOOLEAN NOT NULL DEFAULT FALSE,
  registration_fee_amount     NUMERIC(14,2),
  registration_fee_currency   TEXT,

  -- Contact
  contact_email               TEXT,
  contact_phone               TEXT,

  -- Free-form (logo, cover_image, established_date, socials, etc.)
  metadata                    JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- ISO 3166-1 alpha-2 shape guard. Two uppercase letters.
  CONSTRAINT branches_country_code_shape
    CHECK (country_code ~ '^[A-Z]{2}$'),

  -- ISO 4217 shape guard on the registration_fee_currency slot (nullable).
  CONSTRAINT branches_registration_fee_currency_shape
    CHECK (registration_fee_currency IS NULL OR registration_fee_currency ~ '^[A-Z]{3}$'),

  -- If required, amount must be provided. Currency defaults to the
  -- branch's own currency at the UI layer if left blank.
  CONSTRAINT branches_registration_fee_amount_required_when_flagged
    CHECK (
      registration_fee_required = FALSE
      OR registration_fee_amount IS NOT NULL
    )
);

COMMENT ON TABLE core.branches IS
  'Branch-only fields (geography + registration tracking + contact). 1:1 with core.scopes via scope_id.';
COMMENT ON COLUMN core.branches.country_code IS
  'ISO 3166-1 alpha-2 (e.g. CM). Sourced from country-state-city; used to derive the diaspora chip (country != CM).';
COMMENT ON COLUMN core.branches.region IS
  'Region/state name from country-state-city (free text; not FK-constrained).';
COMMENT ON COLUMN core.branches.registration_fee_required IS
  'Tracks whether the branch charges a registration fee. NOT a join gate; members can join without paying.';

CREATE TRIGGER branches_set_updated_at
  BEFORE UPDATE ON core.branches
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

-------------------------------------------------------------------------------
-- 2. Indexes
-------------------------------------------------------------------------------

CREATE INDEX branches_country_code_idx ON core.branches (country_code);
CREATE INDEX branches_region_idx       ON core.branches (region);

-------------------------------------------------------------------------------
-- 3. RLS — open SELECT for authenticated (same pattern as houses/networks)
-------------------------------------------------------------------------------

ALTER TABLE core.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY branches_select_authenticated ON core.branches
  FOR SELECT TO authenticated
  USING (TRUE);

GRANT SELECT ON core.branches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.branches TO service_role;

-------------------------------------------------------------------------------
-- 4. Atomic create/update RPCs — SECURITY DEFINER pattern from networks
-------------------------------------------------------------------------------
-- Same rationale as networks (see 20260703110000): authorization is
-- gated by the Edge Function's authorize() call BEFORE the RPC runs;
-- the SQL fn does the two-table write with owner privileges.

CREATE OR REPLACE FUNCTION core.create_branch(
  p_name                        TEXT,
  p_slug                        TEXT,
  p_country_code                TEXT,
  p_region                      TEXT,
  p_city                        TEXT,
  p_currency_code               TEXT,
  p_nickname                    TEXT,
  p_description                 TEXT,
  p_registration_fee_required   BOOLEAN,
  p_registration_fee_amount     NUMERIC,
  p_registration_fee_currency   TEXT,
  p_contact_email               TEXT,
  p_contact_phone               TEXT,
  p_metadata                    JSONB DEFAULT '{}'::jsonb
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
    name, slug, scope_type, parent_scope_id, currency_code, metadata, created_by
  ) VALUES (
    p_name, p_slug, 'branch', v_mainstream_id,
    UPPER(p_currency_code), p_metadata, auth.uid()
  )
  RETURNING id INTO v_scope_id;

  INSERT INTO core.branches (
    scope_id,
    country_code, region, city,
    nickname, description,
    registration_fee_required, registration_fee_amount, registration_fee_currency,
    contact_email, contact_phone
  ) VALUES (
    v_scope_id,
    UPPER(p_country_code), p_region, p_city,
    p_nickname, p_description,
    COALESCE(p_registration_fee_required, FALSE),
    p_registration_fee_amount,
    NULLIF(UPPER(COALESCE(p_registration_fee_currency, '')), ''),
    p_contact_email, p_contact_phone
  );

  RETURN v_scope_id;
END;
$$;

COMMENT ON FUNCTION core.create_branch IS
  'Atomic scopes + branches insert. SECURITY DEFINER — the caller must have already cleared scope.create at Mainstream via the Edge Function.';

REVOKE ALL ON FUNCTION core.create_branch(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  BOOLEAN, NUMERIC, TEXT, TEXT, TEXT, JSONB
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core.create_branch(
  TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  BOOLEAN, NUMERIC, TEXT, TEXT, TEXT, JSONB
) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION core.update_branch(
  p_scope_id                    UUID,
  p_name                        TEXT,
  p_country_code                TEXT,
  p_region                      TEXT,
  p_city                        TEXT,
  p_currency_code               TEXT,
  p_nickname                    TEXT,
  p_description                 TEXT,
  p_registration_fee_required   BOOLEAN,
  p_registration_fee_amount     NUMERIC,
  p_registration_fee_currency   TEXT,
  p_contact_email               TEXT,
  p_contact_phone               TEXT,
  p_status                      core.scope_status
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, core, public, auth
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM core.scopes
    WHERE id = p_scope_id AND scope_type = 'branch'
  ) THEN
    RAISE EXCEPTION 'branch % not found', p_scope_id
      USING ERRCODE = '23503';
  END IF;

  UPDATE core.scopes
     SET name          = COALESCE(p_name,          name),
         currency_code = COALESCE(UPPER(p_currency_code), currency_code),
         status        = COALESCE(p_status,        status)
   WHERE id = p_scope_id;

  UPDATE core.branches
     SET country_code              = COALESCE(UPPER(p_country_code),               country_code),
         region                    = COALESCE(p_region,                             region),
         city                      = COALESCE(p_city,                               city),
         nickname                  = COALESCE(p_nickname,                           nickname),
         description               = COALESCE(p_description,                        description),
         registration_fee_required = COALESCE(p_registration_fee_required,          registration_fee_required),
         registration_fee_amount   = COALESCE(p_registration_fee_amount,            registration_fee_amount),
         registration_fee_currency = COALESCE(NULLIF(UPPER(COALESCE(p_registration_fee_currency, '')), ''),
                                              registration_fee_currency),
         contact_email             = COALESCE(p_contact_email,                      contact_email),
         contact_phone             = COALESCE(p_contact_phone,                      contact_phone)
   WHERE scope_id = p_scope_id;
END;
$$;

COMMENT ON FUNCTION core.update_branch IS
  'Atomic scopes + branches patch. SECURITY DEFINER — the caller must have already cleared scope.update at the branch via the Edge Function.';

REVOKE ALL ON FUNCTION core.update_branch(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  BOOLEAN, NUMERIC, TEXT, TEXT, TEXT, core.scope_status
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core.update_branch(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  BOOLEAN, NUMERIC, TEXT, TEXT, TEXT, core.scope_status
) TO authenticated, service_role;
