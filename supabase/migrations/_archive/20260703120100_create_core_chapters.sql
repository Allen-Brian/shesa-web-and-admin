-- Migration: create_core_chapters
--
-- Fourth cluster detail table. Chapters carry branch-shaped fields
-- (geography + optional registration + contact), but `chapter_kind`
-- on `core.scopes` (added earlier) is the master switch that decides
-- whether the finance/contact/etc. fields are semantically meaningful:
--
--   - **Autonomous** chapters: full body — own currency, own registration
--     tracking, own contact, own future treasury. Members carry a
--     dedicated membership row against the chapter scope.
--   - **Grouping** chapters: a labeled subset of the parent branch. No
--     currency, no registration, no treasury. `chapter_kind_semantics`
--     trigger enforces that grouping chapters keep their finance/contact
--     slots empty so a form bug can't silently populate them.
--
-- Two RPCs:
--   - `core.create_chapter` — parent branch fixed at insertion; kind
--     required.
--   - `core.update_chapter` — patches identity + geography + finance;
--     does NOT touch chapter_kind. Autonomy changes go through the
--     separate `core.change_chapter_autonomy` for the guard.
--   - `core.change_chapter_autonomy` — dedicated fn with the
--     autonomous → grouping demote guard (blocks if the chapter still
--     holds active/passive/pending memberships or, once finance schemas
--     land, any financial reference).

-------------------------------------------------------------------------------
-- 1. Table
-------------------------------------------------------------------------------

CREATE TABLE core.chapters (
  scope_id                    UUID PRIMARY KEY REFERENCES core.scopes(id) ON DELETE CASCADE,

  -- Geography (auto-filled from parent branch in the UI; still editable)
  country_code                TEXT NOT NULL,
  region                      TEXT NOT NULL,
  city                        TEXT NOT NULL,

  -- Presentation
  nickname                    TEXT,
  description                 TEXT,

  -- Registration tracking (autonomous chapters only — trigger enforces)
  registration_fee_required   BOOLEAN NOT NULL DEFAULT FALSE,
  registration_fee_amount     NUMERIC(14,2),
  registration_fee_currency   TEXT,

  -- Contact (autonomous chapters only — same trigger)
  contact_email               TEXT,
  contact_phone               TEXT,

  metadata                    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chapters_country_code_shape
    CHECK (country_code ~ '^[A-Z]{2}$'),
  CONSTRAINT chapters_registration_fee_currency_shape
    CHECK (registration_fee_currency IS NULL OR registration_fee_currency ~ '^[A-Z]{3}$'),
  CONSTRAINT chapters_registration_fee_amount_required_when_flagged
    CHECK (
      registration_fee_required = FALSE
      OR registration_fee_amount IS NOT NULL
    )
);

COMMENT ON TABLE core.chapters IS
  'Chapter-only fields. 1:1 with core.scopes via scope_id. chapter_kind on scopes decides whether the registration/contact slots are meaningful (autonomous) or must stay empty (grouping).';

CREATE TRIGGER chapters_set_updated_at
  BEFORE UPDATE ON core.chapters
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

CREATE INDEX chapters_country_code_idx ON core.chapters (country_code);
CREATE INDEX chapters_region_idx       ON core.chapters (region);

-------------------------------------------------------------------------------
-- 2. Grouping-chapter shape trigger
-------------------------------------------------------------------------------
-- CHECK constraints can't join across tables, so a trigger reads the
-- parent scope's chapter_kind and asserts that grouping chapters don't
-- carry registration or contact — those live on the parent branch
-- semantically, and a stray value here would let a bug in the create
-- form propagate silently.

CREATE OR REPLACE FUNCTION core.chapters_enforce_grouping_shape()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_kind core.chapter_kind;
BEGIN
  SELECT chapter_kind INTO v_kind
  FROM core.scopes
  WHERE id = NEW.scope_id;

  IF v_kind IS NULL THEN
    RAISE EXCEPTION 'chapters row references a scope with no chapter_kind (scope_id %)', NEW.scope_id
      USING ERRCODE = '23514';
  END IF;

  IF v_kind = 'grouping' THEN
    IF NEW.registration_fee_required
       OR NEW.registration_fee_amount IS NOT NULL
       OR NEW.registration_fee_currency IS NOT NULL
       OR NEW.contact_email IS NOT NULL
       OR NEW.contact_phone IS NOT NULL
    THEN
      RAISE EXCEPTION 'grouping chapters cannot carry registration or contact fields'
        USING ERRCODE = '23514',
              HINT = 'Promote the chapter to autonomous first, or clear the offending fields.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION core.chapters_enforce_grouping_shape IS
  'BEFORE trigger: grouping chapters must keep registration + contact fields empty. Autonomy is the master switch.';

CREATE TRIGGER chapters_grouping_shape_check
  BEFORE INSERT OR UPDATE ON core.chapters
  FOR EACH ROW EXECUTE FUNCTION core.chapters_enforce_grouping_shape();

-------------------------------------------------------------------------------
-- 3. RLS
-------------------------------------------------------------------------------

ALTER TABLE core.chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY chapters_select_authenticated ON core.chapters
  FOR SELECT TO authenticated
  USING (TRUE);

GRANT SELECT ON core.chapters TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.chapters TO service_role;

-------------------------------------------------------------------------------
-- 4. RPCs
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION core.create_chapter(
  p_parent_branch_id            UUID,
  p_chapter_kind                core.chapter_kind,
  p_name                        TEXT,
  p_slug                        TEXT,
  p_country_code                TEXT,
  p_region                      TEXT,
  p_city                        TEXT,
  p_currency_code               TEXT,          -- required when autonomous; ignored when grouping
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
  v_parent_type core.scope_type;
  v_currency    TEXT;
  v_scope_id    UUID;
BEGIN
  SELECT scope_type, currency_code INTO v_parent_type, v_currency
  FROM core.scopes
  WHERE id = p_parent_branch_id;

  IF v_parent_type IS DISTINCT FROM 'branch' THEN
    RAISE EXCEPTION 'chapter parent must be a branch (got %)', COALESCE(v_parent_type::TEXT, 'null')
      USING ERRCODE = '23503';
  END IF;

  IF p_chapter_kind = 'autonomous' AND (p_currency_code IS NULL OR p_currency_code = '') THEN
    RAISE EXCEPTION 'autonomous chapters require a currency_code'
      USING ERRCODE = '23514';
  END IF;

  -- Grouping chapters inherit the parent branch currency for the row
  -- (unused by any code path but keeps the NOT NULL constraint happy
  -- and gives a sensible value if we ever surface it).
  IF p_chapter_kind = 'grouping' THEN
    v_currency := v_currency;
  ELSE
    v_currency := UPPER(p_currency_code);
  END IF;

  INSERT INTO core.scopes (
    name, slug, scope_type, parent_scope_id, chapter_kind,
    currency_code, metadata, created_by
  ) VALUES (
    p_name, p_slug, 'chapter', p_parent_branch_id, p_chapter_kind,
    v_currency, p_metadata, auth.uid()
  )
  RETURNING id INTO v_scope_id;

  INSERT INTO core.chapters (
    scope_id,
    country_code, region, city,
    nickname, description,
    registration_fee_required, registration_fee_amount, registration_fee_currency,
    contact_email, contact_phone
  ) VALUES (
    v_scope_id,
    UPPER(p_country_code), p_region, p_city,
    p_nickname, p_description,
    CASE WHEN p_chapter_kind = 'autonomous'
         THEN COALESCE(p_registration_fee_required, FALSE)
         ELSE FALSE
    END,
    CASE WHEN p_chapter_kind = 'autonomous' THEN p_registration_fee_amount ELSE NULL END,
    CASE WHEN p_chapter_kind = 'autonomous'
         THEN NULLIF(UPPER(COALESCE(p_registration_fee_currency, '')), '')
         ELSE NULL
    END,
    CASE WHEN p_chapter_kind = 'autonomous' THEN p_contact_email ELSE NULL END,
    CASE WHEN p_chapter_kind = 'autonomous' THEN p_contact_phone ELSE NULL END
  );

  RETURN v_scope_id;
END;
$$;

COMMENT ON FUNCTION core.create_chapter IS
  'Atomic scopes + chapters insert. SECURITY DEFINER — caller must clear scope.create at the parent branch via the Edge Function.';

REVOKE ALL ON FUNCTION core.create_chapter(
  UUID, core.chapter_kind, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  TEXT, TEXT, BOOLEAN, NUMERIC, TEXT, TEXT, TEXT, JSONB
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core.create_chapter(
  UUID, core.chapter_kind, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  TEXT, TEXT, BOOLEAN, NUMERIC, TEXT, TEXT, TEXT, JSONB
) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION core.update_chapter(
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
DECLARE
  v_kind core.chapter_kind;
BEGIN
  SELECT chapter_kind INTO v_kind
  FROM core.scopes
  WHERE id = p_scope_id AND scope_type = 'chapter';

  IF v_kind IS NULL THEN
    RAISE EXCEPTION 'chapter % not found', p_scope_id
      USING ERRCODE = '23503';
  END IF;

  UPDATE core.scopes
     SET name          = COALESCE(p_name,          name),
         currency_code = CASE WHEN v_kind = 'autonomous'
                              THEN COALESCE(UPPER(p_currency_code), currency_code)
                              ELSE currency_code
                         END,
         status        = COALESCE(p_status,        status)
   WHERE id = p_scope_id;

  UPDATE core.chapters
     SET country_code = COALESCE(UPPER(p_country_code), country_code),
         region       = COALESCE(p_region,               region),
         city         = COALESCE(p_city,                 city),
         nickname     = COALESCE(p_nickname,             nickname),
         description  = COALESCE(p_description,          description),
         registration_fee_required = CASE WHEN v_kind = 'autonomous'
                                          THEN COALESCE(p_registration_fee_required, registration_fee_required)
                                          ELSE FALSE
                                     END,
         registration_fee_amount   = CASE WHEN v_kind = 'autonomous'
                                          THEN COALESCE(p_registration_fee_amount, registration_fee_amount)
                                          ELSE NULL
                                     END,
         registration_fee_currency = CASE WHEN v_kind = 'autonomous'
                                          THEN COALESCE(
                                                 NULLIF(UPPER(COALESCE(p_registration_fee_currency, '')), ''),
                                                 registration_fee_currency)
                                          ELSE NULL
                                     END,
         contact_email = CASE WHEN v_kind = 'autonomous'
                              THEN COALESCE(p_contact_email, contact_email)
                              ELSE NULL
                         END,
         contact_phone = CASE WHEN v_kind = 'autonomous'
                              THEN COALESCE(p_contact_phone, contact_phone)
                              ELSE NULL
                         END
   WHERE scope_id = p_scope_id;
END;
$$;

COMMENT ON FUNCTION core.update_chapter IS
  'Atomic scopes + chapters patch. Grouping chapters ignore finance/contact fields. chapter_kind changes go through core.change_chapter_autonomy for the demote guard.';

REVOKE ALL ON FUNCTION core.update_chapter(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  BOOLEAN, NUMERIC, TEXT, TEXT, TEXT, core.scope_status
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core.update_chapter(
  UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT,
  BOOLEAN, NUMERIC, TEXT, TEXT, TEXT, core.scope_status
) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION core.change_chapter_autonomy(
  p_scope_id UUID,
  p_new_kind core.chapter_kind
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, core, public, auth
AS $$
DECLARE
  v_current_kind         core.chapter_kind;
  v_membership_count     INTEGER;
BEGIN
  SELECT chapter_kind INTO v_current_kind
  FROM core.scopes
  WHERE id = p_scope_id AND scope_type = 'chapter';

  IF v_current_kind IS NULL THEN
    RAISE EXCEPTION 'chapter % not found', p_scope_id
      USING ERRCODE = '23503';
  END IF;

  -- No-op guard.
  IF v_current_kind = p_new_kind THEN
    RETURN;
  END IF;

  -- The dangerous direction: demoting a body into a tag. Refuse if
  -- the chapter still owns memberships. Also clears finance/contact
  -- slots so the grouping-shape trigger doesn't reject the row.
  IF v_current_kind = 'autonomous' AND p_new_kind = 'grouping' THEN
    SELECT COUNT(*) INTO v_membership_count
    FROM core.memberships
    WHERE scope_id = p_scope_id
      AND membership_status IN ('active', 'passive', 'pending');

    IF v_membership_count > 0 THEN
      RAISE EXCEPTION 'cannot demote autonomous chapter to grouping while % member(s) attached', v_membership_count
        USING ERRCODE = '23514',
              HINT = 'Transfer or close their memberships to the parent branch first.';
    END IF;

    -- TODO(finance): also block if finance.* rows reference this scope.

    UPDATE core.chapters
       SET registration_fee_required = FALSE,
           registration_fee_amount   = NULL,
           registration_fee_currency = NULL,
           contact_email             = NULL,
           contact_phone             = NULL
     WHERE scope_id = p_scope_id;
  END IF;

  UPDATE core.scopes
     SET chapter_kind = p_new_kind
   WHERE id = p_scope_id;
END;
$$;

COMMENT ON FUNCTION core.change_chapter_autonomy IS
  'Flip chapter_kind with the autonomous → grouping guard (blocks when memberships attached). Called only by the set-chapter-autonomy Edge Function which requires scope.change_autonomy at the chapter.';

REVOKE ALL ON FUNCTION core.change_chapter_autonomy(UUID, core.chapter_kind) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core.change_chapter_autonomy(UUID, core.chapter_kind)
  TO authenticated, service_role;
