-- SHESA Leadership Awards — the nomination round.
--
-- Commissioned by the President General's briefing of 10 September 2026
-- (SHESA/PG/AGM2026/ACCESS/001). Awardees were chosen by the Executive
-- Committee alone; they are now nominated by the membership, shortlisted by
-- the secretariat, and elected by a weighted vote.
--
-- This migration carries the first half: the cycle, its award structure, and
-- the names the membership puts forward. Ballots, the 60/40 tally and the
-- Exco compartment follow in their own migration — the nomination round has
-- to be open and collecting before any of that matters.
--
-- WHY A SCHEMA OF ITS OWN
--
-- An election is a temporary institution. When the awards have been presented
-- the whole apparatus should leave in one statement:
--
--     DROP SCHEMA awards CASCADE;
--
-- Scattered through `cms` it would have to be picked out by prefix a year
-- from now, by someone hoping nothing had come to depend on it. So it lives
-- apart and borrows rather than copies: `cms.consume_submission_slot` for
-- rate limiting, `core.scopes` for the branch list, and
-- `core.has_permission_at_any_scope` for the editor gate.
--
-- WHO MAY NOMINATE
--
-- Anyone, while the window is open. The site has no accounts and SHESA
-- accepted a browser-level identity knowingly: the same `shesa:visitor-id`
-- the songbook stores, plus a salted hash of the caller's address. That is
-- enough to stop the same person putting one name forward twice for one
-- award, and it is not claimed to be more. A nomination is a suggestion —
-- nothing here reaches a ballot until the secretariat approves it, which is
-- the real control.

-------------------------------------------------------------------------------
-- 0. The schema
-------------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS awards;

COMMENT ON SCHEMA awards IS
  'SHESA Leadership Awards: the award structure, nominations, and later the ballots and tally. Self-contained so a finished cycle can be dropped whole.';

GRANT USAGE ON SCHEMA awards TO anon, authenticated, service_role;

-------------------------------------------------------------------------------
-- 1. The cycle
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS awards.editions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                 text NOT NULL UNIQUE,
  name                 text NOT NULL,
  description          text,

  -- Two windows over one structure. Both are optional while an edition is
  -- being prepared; the phase below reads them rather than a status somebody
  -- has to remember to flip at midnight.
  nominations_open_at  timestamptz,
  nominations_close_at timestamptz,
  voting_open_at       timestamptz,
  voting_close_at      timestamptz,

  -- The approved 60/40 split, held as data rather than as a constant in the
  -- app: the briefing forbids altering the weights without written authority,
  -- so a change should be a recorded edit to a row, not a code deploy.
  ex_student_weight    numeric(4,3) NOT NULL DEFAULT 0.600,
  exco_weight          numeric(4,3) NOT NULL DEFAULT 0.400,

  -- 'raw_weighted'  — 0.6 x (ex-student ballots) + 0.4 x (Exco ballots)
  -- 'college_share' — each college's share of its own turnout, then weighted
  --
  -- SHESA chose raw_weighted. Recorded here so a published result stays
  -- reproducible and revisiting the method is a value change, not a rewrite.
  weighting_method     text NOT NULL DEFAULT 'raw_weighted',

  results_published_at timestamptz,

  created_by           uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT editions_slug_shape  CHECK (slug ~ '^[a-z0-9][a-z0-9-]{0,60}$'),
  CONSTRAINT editions_name_len    CHECK (length(btrim(name)) BETWEEN 2 AND 200),
  CONSTRAINT editions_method_ok   CHECK (weighting_method IN ('raw_weighted', 'college_share')),
  CONSTRAINT editions_weights_ok  CHECK (
    ex_student_weight >= 0 AND exco_weight >= 0 AND (ex_student_weight + exco_weight) > 0),
  -- A window that shuts before it opens would silently accept nothing.
  CONSTRAINT editions_nom_window  CHECK (
    nominations_open_at IS NULL OR nominations_close_at IS NULL
    OR nominations_close_at > nominations_open_at),
  CONSTRAINT editions_vote_window CHECK (
    voting_open_at IS NULL OR voting_close_at IS NULL
    OR voting_close_at > voting_open_at)
);

COMMENT ON TABLE awards.editions IS
  'One awards cycle and its two windows. Times are timestamptz; SHESA runs on WAT (UTC+1) and the apps format accordingly.';

-------------------------------------------------------------------------------
-- 2. Categories and awards
-------------------------------------------------------------------------------
-- The briefing groups twelve professional awards under one heading, names
-- Branch and Country Chapter on their own, and reserves five batch awards
-- whose decades are still to be named. A category is therefore optional: an
-- award either sits inside one or stands alone.

CREATE TABLE IF NOT EXISTS awards.categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id  uuid NOT NULL REFERENCES awards.editions(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  sort_order  integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_name_len CHECK (length(btrim(name)) BETWEEN 2 AND 160)
);

CREATE INDEX IF NOT EXISTS categories_edition_idx
  ON awards.categories (edition_id, sort_order);

CREATE TABLE IF NOT EXISTS awards.awards (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id  uuid NOT NULL REFERENCES awards.editions(id) ON DELETE CASCADE,
  category_id uuid REFERENCES awards.categories(id) ON DELETE SET NULL,
  name        text NOT NULL,
  description text,
  sort_order  integer NOT NULL DEFAULT 0,
  status      text NOT NULL DEFAULT 'active',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT awards_name_len  CHECK (length(btrim(name)) BETWEEN 2 AND 160),
  CONSTRAINT awards_status_ok CHECK (status IN ('active', 'hidden'))
);

COMMENT ON COLUMN awards.awards.category_id IS
  'NULL means the award stands alone — Branch Leadership and Country Chapter Leadership have no parent heading.';

CREATE INDEX IF NOT EXISTS awards_edition_idx ON awards.awards (edition_id, sort_order);

-------------------------------------------------------------------------------
-- 3. Nominations
-------------------------------------------------------------------------------
-- What the membership submits. Kept apart from the candidate list that will
-- follow, on purpose: a nomination is a claim by a member, a candidacy is a
-- decision by the secretariat, and the first must survive the second so a
-- rejection can be explained afterwards.

CREATE TABLE IF NOT EXISTS awards.nominations (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  award_id               uuid NOT NULL REFERENCES awards.awards(id) ON DELETE CASCADE,

  nominee_name           text NOT NULL,
  nominee_batch_year     integer,
  nominee_branch_label   text,
  nominee_contact        text,
  -- Why this person. The only field besides the name that is required: it is
  -- what makes a nomination reviewable, and it is the reason a serious one
  -- costs more effort than a frivolous one.
  citation               text NOT NULL,

  -- Everything about the nominator is optional. A form that demands the
  -- sender's particulars before it will take a name is a form fewer people
  -- finish, and the secretariat's judgement does not turn on who suggested.
  nominator_name         text,
  nominator_batch_year   integer,
  nominator_branch_label text,
  nominator_contact      text,

  device_id              text NOT NULL,
  ip_hash                text,

  status                 text NOT NULL DEFAULT 'pending',
  review_note            text,
  reviewed_by            uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at            timestamptz,

  created_at             timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT nominations_nominee_len   CHECK (length(btrim(nominee_name)) BETWEEN 2 AND 200),
  CONSTRAINT nominations_citation_len  CHECK (length(btrim(citation)) BETWEEN 10 AND 2000),
  CONSTRAINT nominations_status_ok     CHECK (status IN ('pending', 'approved', 'rejected')),
  CONSTRAINT nominations_device_len    CHECK (length(device_id) BETWEEN 8 AND 64),
  CONSTRAINT nominations_batch_ok      CHECK (
    nominee_batch_year IS NULL OR nominee_batch_year BETWEEN 1953 AND 2026),
  CONSTRAINT nominations_nomr_batch_ok CHECK (
    nominator_batch_year IS NULL OR nominator_batch_year BETWEEN 1953 AND 2026)
);

COMMENT ON TABLE awards.nominations IS
  'Names put forward by the membership. A rejected nomination is marked, never deleted: the record of what was proposed is what lets a shortlist be defended.';

-- One device may nominate for many awards and may put several names forward
-- for one award, but not the same name twice. Compared case- and
-- space-insensitively, because "Peter  NDIFON" and "peter ndifon" are one
-- nomination however they were typed.
CREATE UNIQUE INDEX IF NOT EXISTS nominations_once_idx
  ON awards.nominations (award_id, device_id, lower(btrim(nominee_name)));

CREATE INDEX IF NOT EXISTS nominations_review_idx
  ON awards.nominations (award_id, status, created_at DESC);

-------------------------------------------------------------------------------
-- 4. RLS
-------------------------------------------------------------------------------
-- The editor reads and writes everything. Anon holds no grant on any table
-- here and reaches the nomination round only through the functions below —
-- including the award list itself, because this same table carries awards
-- still hidden from the public.

ALTER TABLE awards.editions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE awards.categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE awards.awards      ENABLE ROW LEVEL SECURITY;
ALTER TABLE awards.nominations ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['editions', 'categories', 'awards', 'nominations']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
       WHERE schemaname = 'awards' AND tablename = t AND policyname = t || '_editor_all'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON awards.%I FOR ALL TO authenticated
           USING (core.has_permission_at_any_scope(auth.uid(), ''cms.edit''))
           WITH CHECK (core.has_permission_at_any_scope(auth.uid(), ''cms.edit''))',
        t || '_editor_all', t);
    END IF;
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON awards.editions, awards.categories, awards.awards, awards.nominations
  TO authenticated;

-- Nothing for anon. Every public interaction is a function call.

-- `updated_at` maintained by the house trigger rather than by each caller.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['editions', 'categories', 'awards']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger tg
        JOIN pg_class c ON c.oid = tg.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'awards' AND c.relname = t AND tg.tgname = t || '_set_updated_at'
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE UPDATE ON awards.%I
           FOR EACH ROW EXECUTE FUNCTION core.set_updated_at()',
        t || '_set_updated_at', t);
    END IF;
  END LOOP;
END $$;

-------------------------------------------------------------------------------
-- 5. The public surface
-------------------------------------------------------------------------------

-- Which phase is a cycle in, right now? Derived from the windows so the round
-- opens and shuts on time with nobody awake to do it.
CREATE OR REPLACE FUNCTION awards.phase(p_edition awards.editions)
RETURNS text
LANGUAGE sql
-- STABLE, not IMMUTABLE: it reads the clock. Marked immutable, the planner
-- would be entitled to fold one call's answer into a plan and keep it.
STABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_edition.voting_close_at      IS NOT NULL AND pg_catalog.now() >  p_edition.voting_close_at      THEN 'closed'
    WHEN p_edition.voting_open_at       IS NOT NULL AND pg_catalog.now() >= p_edition.voting_open_at       THEN 'voting'
    WHEN p_edition.nominations_close_at IS NOT NULL AND pg_catalog.now() >  p_edition.nominations_close_at THEN 'review'
    WHEN p_edition.nominations_open_at  IS NOT NULL AND pg_catalog.now() >= p_edition.nominations_open_at  THEN 'nominating'
    ELSE 'upcoming'
  END;
$$;

COMMENT ON FUNCTION awards.phase(awards.editions) IS
  'upcoming -> nominating -> review -> voting -> closed, computed from the two windows.';

-- The branch and chapter list for the nomination form.
--
-- SECURITY DEFINER because `core.scopes` grants SELECT to `authenticated`
-- only and must stay that way — it carries the whole organisational tree.
-- What this discloses is the name of an active branch, which the public
-- leadership page already shows.
--
-- Chapters come back alongside branches because the awards cover both, and
-- because a diaspora nominee has no branch to pick: production seeds five
-- Cameroonian branches and the chapter register is where everyone else is.
-- The form still offers "Ex-student (no branch)", which is neither.
CREATE OR REPLACE FUNCTION awards.branches()
RETURNS TABLE (scope_id uuid, name text, kind text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT s.id, s.name, s.scope_type::text
    FROM core.scopes s
   WHERE s.scope_type IN ('branch', 'chapter')
     AND s.status = 'active'
   ORDER BY s.scope_type::text, s.name;
$$;

REVOKE ALL ON FUNCTION awards.branches() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION awards.branches() TO anon, authenticated, service_role;

COMMENT ON FUNCTION awards.branches() IS
  'Active branches and country chapters for the nomination form. Names only — no fees, no contacts, no scope tree.';

-- Everything the public page renders, in one call.
CREATE OR REPLACE FUNCTION awards.public_state(p_edition_slug text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_edition awards.editions;
BEGIN
  SELECT * INTO v_edition
    FROM awards.editions e
   WHERE (p_edition_slug IS NULL OR e.slug = p_edition_slug)
   ORDER BY e.created_at DESC
   LIMIT 1;

  IF v_edition.id IS NULL THEN
    RETURN jsonb_build_object('edition', NULL);
  END IF;

  RETURN jsonb_build_object(
    'edition', jsonb_build_object(
      'id', v_edition.id,
      'slug', v_edition.slug,
      'name', v_edition.name,
      'description', v_edition.description,
      'phase', awards.phase(v_edition),
      'nominations_open_at',  v_edition.nominations_open_at,
      'nominations_close_at', v_edition.nominations_close_at,
      'voting_open_at',       v_edition.voting_open_at,
      'voting_close_at',      v_edition.voting_close_at
    ),
    'categories', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', c.id, 'name', c.name, 'description', c.description)
             ORDER BY c.sort_order, c.name)
        FROM awards.categories c WHERE c.edition_id = v_edition.id), '[]'::jsonb),
    'awards', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', a.id, 'category_id', a.category_id,
               'name', a.name, 'description', a.description)
             ORDER BY a.sort_order, a.name)
        FROM awards.awards a
       WHERE a.edition_id = v_edition.id AND a.status = 'active'), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION awards.public_state(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION awards.public_state(text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION awards.public_state(text) IS
  'The public view of a cycle: its phase, its categories and its active awards. Never returns nominations — who has been put forward is not public during the round.';

-- Put a name forward.
--
-- Returns a reason rather than raising, because each of these is something
-- the form has to say to a person: the window has shut, you already suggested
-- them, slow down.
CREATE OR REPLACE FUNCTION awards.submit_nomination(
  p_award_id               uuid,
  p_nominee_name           text,
  p_citation               text,
  p_device_id              text,
  p_nominee_batch_year     integer DEFAULT NULL,
  p_nominee_branch_label   text    DEFAULT NULL,
  p_nominee_contact        text    DEFAULT NULL,
  p_nominator_name         text    DEFAULT NULL,
  p_nominator_batch_year   integer DEFAULT NULL,
  p_nominator_branch_label text    DEFAULT NULL,
  p_nominator_contact      text    DEFAULT NULL,
  p_ip_hash                text    DEFAULT NULL
)
RETURNS TABLE (ok boolean, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_edition awards.editions;
BEGIN
  SELECT e.* INTO v_edition
    FROM awards.awards a
    JOIN awards.editions e ON e.id = a.edition_id
   WHERE a.id = p_award_id AND a.status = 'active';

  IF v_edition.id IS NULL THEN
    RETURN QUERY SELECT false, 'unknown_award'; RETURN;
  END IF;

  IF awards.phase(v_edition) <> 'nominating' THEN
    RETURN QUERY SELECT false, 'nominations_closed'; RETURN;
  END IF;

  IF p_device_id IS NULL OR length(p_device_id) NOT BETWEEN 8 AND 64 THEN
    RETURN QUERY SELECT false, 'bad_device'; RETURN;
  END IF;

  IF length(btrim(coalesce(p_nominee_name, ''))) < 2
     OR length(btrim(coalesce(p_citation, ''))) < 10 THEN
    RETURN QUERY SELECT false, 'incomplete'; RETURN;
  END IF;

  -- Thirty a day from one address. Generous on purpose: a branch meeting on
  -- one wifi connection is a real thing and must not read as a flood.
  IF p_ip_hash IS NOT NULL
     AND NOT cms.consume_submission_slot('awardnom:' || p_ip_hash, 30, 86400) THEN
    RETURN QUERY SELECT false, 'throttled'; RETURN;
  END IF;

  BEGIN
    INSERT INTO awards.nominations (
      award_id, nominee_name, nominee_batch_year, nominee_branch_label,
      nominee_contact, citation, nominator_name, nominator_batch_year,
      nominator_branch_label, nominator_contact, device_id, ip_hash)
    VALUES (
      p_award_id, btrim(p_nominee_name), p_nominee_batch_year,
      NULLIF(btrim(coalesce(p_nominee_branch_label, '')), ''),
      NULLIF(btrim(coalesce(p_nominee_contact, '')), ''),
      btrim(p_citation),
      NULLIF(btrim(coalesce(p_nominator_name, '')), ''), p_nominator_batch_year,
      NULLIF(btrim(coalesce(p_nominator_branch_label, '')), ''),
      NULLIF(btrim(coalesce(p_nominator_contact, '')), ''),
      p_device_id, p_ip_hash);
  EXCEPTION
    WHEN unique_violation THEN
      RETURN QUERY SELECT false, 'already_nominated'; RETURN;
  END;

  RETURN QUERY SELECT true, 'ok';
END;
$$;

REVOKE ALL ON FUNCTION awards.submit_nomination(uuid, text, text, text, integer, text, text, text, integer, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION awards.submit_nomination(uuid, text, text, text, integer, text, text, text, integer, text, text, text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION awards.submit_nomination IS
  'Record one nomination while the window is open. Nothing it accepts reaches a ballot until the secretariat approves it.';
