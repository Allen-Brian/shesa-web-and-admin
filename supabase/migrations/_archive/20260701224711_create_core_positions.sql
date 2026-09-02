-- Migration: create_core_positions
--
-- Phase 1 §3.9 + §3.10 — position catalog + position assignments.
--
-- Positions in Shesa are **badges, not permissions**. Being President
-- of a branch is a public-facing title (surfaced in Exco UI + audit)
-- but does NOT grant any authority. The functional roles + permission
-- flags from E1.1 are the only source of authority; assigning a
-- President title to someone who lacks the Admin role produces an
-- in-app prompt suggesting the grant (via the president trigger
-- below) — that decision is deliberately left to the human operator.
--
-- Design decisions locked in the plan:
--
--   1. **Catalog is per-scope-type.** A single "President" catalog row
--      per (mainstream/branch/chapter/batch) type. Assignments join
--      catalog id + a target scope; the scope's `scope_type` must
--      match the catalog row's `scope_type` (enforced by trigger).
--
--   2. **One active assignment per (member, scope, position).** A
--      person can be President of two different scopes, or have two
--      distinct positions at the same scope, but not two active
--      "President of Branch X" rows. Enforced by a partial unique
--      index that ignores removed rows.
--
--   3. **President in-app prompt.** After an assignment lands, if the
--      catalog name matches President (case-insensitive) and the
--      assigned member holds no active admin role at the scope, we
--      enqueue an `notification_events` row addressed to the
--      assigning admin with severity=info. No email/SMS delivery is
--      created — the dispatch-notifications pipeline treats this
--      event as "in-app inbox only" per the last session's channel
--      decision. See ADR-0035 §Consequences.

-------------------------------------------------------------------------------
-- 1. core.position_catalog
-------------------------------------------------------------------------------

CREATE TABLE core.position_catalog (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  scope_type    core.scope_type NOT NULL,

  name          TEXT NOT NULL,
  description   TEXT,

  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Positions only make sense on scope_types that hold Exco: mainstream,
  -- branch, chapter, batch. Houses and sectors don't have positions
  -- in Phase 1.
  CONSTRAINT position_catalog_scope_type_valid
    CHECK (scope_type IN ('mainstream', 'branch', 'chapter', 'batch'))
);

-- One position name per scope_type — "President" appears once for
-- Branch, once for Batch, etc.
CREATE UNIQUE INDEX position_catalog_scope_type_name_unique
  ON core.position_catalog (scope_type, LOWER(name));

CREATE INDEX position_catalog_scope_type_active_idx
  ON core.position_catalog (scope_type, is_active);

CREATE TRIGGER position_catalog_set_updated_at
  BEFORE UPDATE ON core.position_catalog
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

COMMENT ON TABLE core.position_catalog IS
  'Catalog of position titles per scope_type (§2.19). Positions are badges only — no permissions attached.';

-------------------------------------------------------------------------------
-- 2. Seed the catalog per §2.19
-------------------------------------------------------------------------------
-- Duplicated in supabase/seed.sql for local db:reset; landing here
-- covers staging/prod.

INSERT INTO core.position_catalog (scope_type, name, description, sort_order) VALUES
  -- Mainstream / Branch / Chapter share the same set (§2.19).
  ('mainstream', 'President',           'Chief executive of Mainstream.',            10),
  ('mainstream', 'Vice President',      'Deputy to the President.',                  20),
  ('mainstream', 'Secretary',           'Records + correspondence.',                 30),
  ('mainstream', 'Secretary General',   'Chief administrative officer.',             40),
  ('mainstream', 'Treasurer',           'Custodian of funds.',                       50),
  ('mainstream', 'Financial Secretary', 'Financial books + dues collection.',        60),
  ('mainstream', 'PRO',                 'Public relations officer.',                 70),
  ('mainstream', 'Adviser',             'Ex-officio guidance role.',                 80),

  ('branch', 'President',           'Chief executive of the Branch.',                10),
  ('branch', 'Vice President',      'Deputy to the Branch President.',               20),
  ('branch', 'Secretary',           'Branch secretary.',                             30),
  ('branch', 'Secretary General',   'Branch secretary-general.',                     40),
  ('branch', 'Treasurer',           'Branch treasurer.',                             50),
  ('branch', 'Financial Secretary', 'Branch financial secretary.',                   60),
  ('branch', 'PRO',                 'Branch PRO.',                                   70),
  ('branch', 'Adviser',             'Branch adviser.',                               80),

  ('chapter', 'President',           'Chief executive of an autonomous chapter.',    10),
  ('chapter', 'Vice President',      'Deputy of an autonomous chapter president.',   20),
  ('chapter', 'Secretary',           'Chapter secretary.',                           30),
  ('chapter', 'Secretary General',   'Chapter secretary-general.',                   40),
  ('chapter', 'Treasurer',           'Chapter treasurer.',                           50),
  ('chapter', 'Financial Secretary', 'Chapter financial secretary.',                 60),
  ('chapter', 'PRO',                 'Chapter PRO.',                                 70),
  ('chapter', 'Adviser',             'Chapter adviser.',                             80),

  ('batch', 'President',           'Batch president.',                               10),
  ('batch', 'Coordinator',         'Batch coordinator.',                             20),
  ('batch', 'Secretary',           'Batch secretary.',                               30),
  ('batch', 'Financial Secretary', 'Batch financial secretary.',                     40),
  ('batch', 'PRO',                 'Batch PRO.',                                     50),
  ('batch', 'Adviser',             'Batch adviser.',                                 60)
ON CONFLICT (scope_type, LOWER(name)) DO NOTHING;

-------------------------------------------------------------------------------
-- 3. core.position_assignments
-------------------------------------------------------------------------------

CREATE TABLE core.position_assignments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  member_id             UUID NOT NULL REFERENCES core.members(id) ON DELETE CASCADE,
  scope_id              UUID NOT NULL REFERENCES core.scopes(id) ON DELETE RESTRICT,
  position_catalog_id   UUID NOT NULL REFERENCES core.position_catalog(id) ON DELETE RESTRICT,

  -- Optional local override — "Interim President", "Acting Treasurer".
  custom_title          TEXT,

  starts_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at               TIMESTAMPTZ,

  assigned_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  removed_at            TIMESTAMPTZ,
  removed_by            UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT position_assignments_remove_consistent
    CHECK (
      (removed_at IS NULL AND removed_by IS NULL)
      OR (removed_at IS NOT NULL AND removed_by IS NOT NULL)
    ),

  CONSTRAINT position_assignments_end_after_start
    CHECK (ends_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX position_assignments_member_idx  ON core.position_assignments (member_id);
CREATE INDEX position_assignments_scope_idx   ON core.position_assignments (scope_id);
CREATE INDEX position_assignments_catalog_idx ON core.position_assignments (position_catalog_id);

-- One active assignment per (member, scope, position). Removal frees
-- the slot; a re-assignment after removal is fine.
CREATE UNIQUE INDEX position_assignments_one_active_per_member_scope_position
  ON core.position_assignments (member_id, scope_id, position_catalog_id)
  WHERE removed_at IS NULL;

-------------------------------------------------------------------------------
-- 4. Scope-type match trigger
-------------------------------------------------------------------------------
-- The catalog row's scope_type must equal the assignment's scope's
-- scope_type. A "Branch President" position can't be assigned to a
-- chapter, and vice versa.

CREATE OR REPLACE FUNCTION core.position_assignments_check_scope_type()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_catalog_scope_type core.scope_type;
  v_scope_scope_type   core.scope_type;
BEGIN
  SELECT scope_type INTO v_catalog_scope_type
  FROM core.position_catalog WHERE id = NEW.position_catalog_id;

  SELECT scope_type INTO v_scope_scope_type
  FROM core.scopes WHERE id = NEW.scope_id;

  IF v_catalog_scope_type IS NULL THEN
    RAISE EXCEPTION 'position_catalog % not found', NEW.position_catalog_id
      USING ERRCODE = '23503';
  END IF;
  IF v_scope_scope_type IS NULL THEN
    RAISE EXCEPTION 'scope % not found', NEW.scope_id
      USING ERRCODE = '23503';
  END IF;
  IF v_catalog_scope_type IS DISTINCT FROM v_scope_scope_type THEN
    RAISE EXCEPTION 'position catalog scope_type % does not match scope scope_type %',
      v_catalog_scope_type, v_scope_scope_type
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER position_assignments_scope_type_check
  BEFORE INSERT OR UPDATE OF position_catalog_id, scope_id
  ON core.position_assignments
  FOR EACH ROW EXECUTE FUNCTION core.position_assignments_check_scope_type();

-------------------------------------------------------------------------------
-- 5. President → admin-role in-app prompt
-------------------------------------------------------------------------------
-- Whenever a President-titled position is assigned to a member who
-- lacks an active admin role at the scope, enqueue an in-app
-- notification addressed to the assigning admin. NO auto-grant —
-- the human operator decides.
--
-- The trigger fires AFTER INSERT so the row already exists (and any
-- CHECK/trigger failure has already rolled back). recipient_user_id
-- is set to `assigned_by` — the person who just made the assignment,
-- so they see the prompt on their next in-app inbox refresh.
--
-- No delivery row is created here → dispatch-notifications ignores
-- this event; it exists only in the in-app inbox query.

CREATE OR REPLACE FUNCTION core.position_president_prompt()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_position_name TEXT;
  v_has_admin     BOOLEAN;
BEGIN
  SELECT name INTO v_position_name
  FROM core.position_catalog WHERE id = NEW.position_catalog_id;

  -- Only fires for President-titled positions.
  IF v_position_name IS NULL OR v_position_name NOT ILIKE 'President%' THEN
    RETURN NEW;
  END IF;

  -- Nothing to prompt if we don't know who to notify.
  IF NEW.assigned_by IS NULL THEN
    RETURN NEW;
  END IF;

  -- Does the assigned member already hold an active admin role at
  -- the scope (or a non-autonomous ancestor)? If so, no prompt.
  SELECT EXISTS (
    SELECT 1
    FROM core.role_assignments ra
    INNER JOIN core.roles r ON r.id = ra.role_id
    INNER JOIN core.member_accounts ma ON ma.auth_user_id = ra.user_id
    WHERE ma.member_id = NEW.member_id
      AND ma.claim_status = 'claimed'
      AND r.key IN ('mainstream_admin', 'branch_admin', 'batch_admin')
      AND ra.revoked_at IS NULL
      AND ra.starts_at <= NOW()
      AND (ra.ends_at IS NULL OR ra.ends_at > NOW())
      -- Direct or via NULL scope (global admin — unlikely, but safe).
      AND (ra.scope_id IS NULL OR ra.scope_id = NEW.scope_id)
  ) INTO v_has_admin;

  IF v_has_admin THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications.notification_events (
    event_type,
    severity,
    recipient_user_id,
    scope_id,
    payload
  ) VALUES (
    'position.president_needs_admin',
    'info',
    NEW.assigned_by,
    NEW.scope_id,
    jsonb_build_object(
      'member_id',            NEW.member_id,
      'position_assignment_id', NEW.id,
      'position_name',        v_position_name,
      'channel',              'in_app',
      'hint',                 'This president has no Admin role at this scope. Consider granting.'
    )
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER position_assignments_president_prompt
  AFTER INSERT ON core.position_assignments
  FOR EACH ROW EXECUTE FUNCTION core.position_president_prompt();

COMMENT ON FUNCTION core.position_president_prompt IS
  'AFTER INSERT trigger: if a President-titled position is assigned to a member without an active admin role at the scope, enqueue an in-app notification for the assigning admin. No auto-grant. No email/SMS delivery row created — dispatch-notifications ignores this event class.';

-------------------------------------------------------------------------------
-- 6. RLS — enable with NO policies (real policies land next migration)
-------------------------------------------------------------------------------

ALTER TABLE core.position_catalog     ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.position_assignments ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON core.position_catalog     TO authenticated;
GRANT SELECT, INSERT, UPDATE ON core.position_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.position_catalog     TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.position_assignments TO service_role;
