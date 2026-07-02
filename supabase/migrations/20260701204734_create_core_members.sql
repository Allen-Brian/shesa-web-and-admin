-- Migration: create_core_members
--
-- The canonical person record — Phase 1 §3.3. One row per human, linked
-- to at most one auth.users via the separate `core.member_accounts`
-- join (§3.4 lands in the next migration).
--
-- Design notes (per Phase 1 plan, E1.2):
--
-- 1) **Passive is a membership state, not a person state.** `member_status`
--    here is a two-value enum (`active`, `deceased`). Whether the member
--    is currently *participating* is `core.memberships.membership_status`
--    (six values, lands in E1.4). This is why `deceased` is the only
--    non-active value here — passive/transferred/left describe the
--    person's relationship to a body, not the person themselves.
--
-- 2) **Batch/House/Sector are attributes.** They live as FK columns on
--    the member row (`batch_scope_id`, `house_scope_id`, `sector_scope_id`)
--    rather than as membership rows. Rationale: every member has exactly
--    one of each and moving them isn't a "transfer" — it's an admin
--    correction. §3.3 spec + E1.2 plan.
--
-- 3) **Scope-type FK enforcement.** The three scope FKs each point to
--    `core.scopes(id)` but every reference has a valid `scope_type` —
--    the batch column must reference a batch row, etc. Postgres CHECK
--    can't run a subquery so we enforce with a BEFORE INSERT/UPDATE
--    trigger.
--
-- 4) **Duplicate-detection indexes.** The `create-member` Edge Function
--    checks four signals: same email, same phone, same full_name, same
--    full_name + batch. Indexes on those columns keep those lookups
--    cheap even as membership grows into the tens of thousands.
--
-- 5) **Contact-required constraint.** `(email IS NOT NULL OR phone IS
--    NOT NULL)` — a member has to be reachable somehow. §2.9 spec.

-------------------------------------------------------------------------------
-- 1. Enum: member_status
-------------------------------------------------------------------------------

CREATE TYPE core.member_status AS ENUM ('active', 'deceased');

COMMENT ON TYPE core.member_status IS
  'Person-level status. Passive/transferred/left belong to core.memberships (E1.4) because they describe the member''s relationship to a body, not the person themselves. Deceased triggers a cascade of memberships → left (in the E1.4 trigger).';

-------------------------------------------------------------------------------
-- 2. Table: core.members
-------------------------------------------------------------------------------

CREATE TABLE core.members (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  full_name             TEXT NOT NULL,
  display_name          TEXT,

  -- Contact — at least one required (constraint below).
  email                 TEXT,
  phone                 TEXT,

  -- Attributes (§3.3). Each references a specific scope_type; a BEFORE
  -- trigger below enforces the type.
  batch_scope_id        UUID NOT NULL REFERENCES core.scopes(id) ON DELETE RESTRICT,
  house_scope_id        UUID NOT NULL REFERENCES core.scopes(id) ON DELETE RESTRICT,
  sector_scope_id       UUID NOT NULL REFERENCES core.scopes(id) ON DELETE RESTRICT,

  field                 TEXT,
  entry_year            INTEGER,
  exit_year             INTEGER,

  gender                TEXT,
  date_of_birth         DATE,
  profile_photo_url     TEXT,

  -- Current location — structured; PostGIS deferred per Phase 1 §2.6.
  current_country       TEXT,
  current_region_state  TEXT,
  current_city          TEXT,

  member_status         core.member_status NOT NULL DEFAULT 'active',

  created_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- §2.9: at least one contact method.
  CONSTRAINT members_contact_required
    CHECK (email IS NOT NULL OR phone IS NOT NULL),

  -- Entry year plausibility mirrors the batch table's window.
  CONSTRAINT members_entry_year_plausible
    CHECK (entry_year IS NULL OR (entry_year BETWEEN 1953 AND 2100)),
  CONSTRAINT members_exit_year_plausible
    CHECK (exit_year IS NULL OR (exit_year BETWEEN 1953 AND 2100)),

  -- Exit shouldn't precede entry when both are known.
  CONSTRAINT members_exit_after_entry
    CHECK (entry_year IS NULL OR exit_year IS NULL OR exit_year >= entry_year)
);

COMMENT ON TABLE core.members IS
  'Canonical person record. One row per human. Contact-required, batch+house+sector required as attributes (not memberships). See Phase 1 §3.3.';
COMMENT ON COLUMN core.members.display_name IS
  'Member-editable presentation name; falls back to full_name when NULL. full_name is admin-only correctable.';
COMMENT ON COLUMN core.members.member_status IS
  'Person-level status only. Passive/transferred/etc. live on core.memberships (E1.4).';

CREATE TRIGGER members_set_updated_at
  BEFORE UPDATE ON core.members
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

-------------------------------------------------------------------------------
-- 3. Scope-type FK trigger
-------------------------------------------------------------------------------
-- Every scope FK on core.members must reference a scope of the right
-- type. Foreign keys alone can't express "and the pointed-at row has
-- scope_type = 'batch'". This trigger enforces it at write-time.

CREATE OR REPLACE FUNCTION core.members_check_scope_types()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_type core.scope_type;
BEGIN
  SELECT scope_type INTO v_type FROM core.scopes WHERE id = NEW.batch_scope_id;
  IF v_type IS DISTINCT FROM 'batch' THEN
    RAISE EXCEPTION 'members.batch_scope_id must reference a batch scope (got %)', COALESCE(v_type::text, 'null')
      USING ERRCODE = '23514';
  END IF;

  SELECT scope_type INTO v_type FROM core.scopes WHERE id = NEW.house_scope_id;
  IF v_type IS DISTINCT FROM 'house' THEN
    RAISE EXCEPTION 'members.house_scope_id must reference a house scope (got %)', COALESCE(v_type::text, 'null')
      USING ERRCODE = '23514';
  END IF;

  SELECT scope_type INTO v_type FROM core.scopes WHERE id = NEW.sector_scope_id;
  IF v_type IS DISTINCT FROM 'sector' THEN
    RAISE EXCEPTION 'members.sector_scope_id must reference a sector scope (got %)', COALESCE(v_type::text, 'null')
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER members_scope_types_check
  BEFORE INSERT OR UPDATE OF batch_scope_id, house_scope_id, sector_scope_id
  ON core.members
  FOR EACH ROW EXECUTE FUNCTION core.members_check_scope_types();

COMMENT ON FUNCTION core.members_check_scope_types IS
  'BEFORE trigger: enforces batch/house/sector FK columns reference scopes of the correct scope_type. Postgres CHECK can''t run a subquery so this trigger is the canonical enforcement.';

-------------------------------------------------------------------------------
-- 4. Indexes — dominated by duplicate-detection lookups
-------------------------------------------------------------------------------

-- Case-insensitive email lookup. Duplicate detection compares
-- LOWER(email) against a candidate's LOWER(email).
CREATE INDEX members_lower_email_idx ON core.members (LOWER(email));

-- Phone is stored as-entered — an operator may normalize before insert
-- but we don't force a shape here (Cameroon supports MTN + Orange with
-- different formats). Plain B-tree serves exact-match dedup.
CREATE INDEX members_phone_idx ON core.members (phone);

-- Full-name-in-batch dedup (spec: "same full_name + batch" is a
-- duplicate signal). Composite works for both this and the plain
-- full-name lookup because Postgres uses the prefix (full_name alone).
CREATE INDEX members_fullname_batch_idx
  ON core.members (full_name, batch_scope_id);

-- Attribute filtering — every "members in Branch X" or "members in
-- Batch 2010" query hits these.
CREATE INDEX members_house_scope_id_idx  ON core.members (house_scope_id);
CREATE INDEX members_sector_scope_id_idx ON core.members (sector_scope_id);

-- Life-cycle filtering — most reads are "active members only".
CREATE INDEX members_status_idx ON core.members (member_status);

-------------------------------------------------------------------------------
-- 5. RLS — enable with NO policies (real policies land two migrations down)
-------------------------------------------------------------------------------

ALTER TABLE core.members ENABLE ROW LEVEL SECURITY;

-- Grant DATA-API access to the roles that need it (real filtering
-- happens in RLS below in the rls_members migration). Without USAGE +
-- table grants, even the RLS policy would fail because PostgREST
-- checks role privileges before RLS.
GRANT SELECT, INSERT, UPDATE ON core.members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.members TO service_role;
