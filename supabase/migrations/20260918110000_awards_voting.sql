-- SHESA Leadership Awards — the ballot.
--
-- The second half of the cycle. Nominations are in; the secretariat draws a
-- shortlist from them, and the membership elects the awardees from that
-- shortlist under the weighting the President General's briefing approved:
-- 60% ex-students, 40% Executive Committee.
--
-- TWO DOORS, ONE BALLOT BOX
--
-- There are no accounts, so a voter's college cannot be looked up — it has
-- to be declared by the route they arrived through. The public link is
-- shared everywhere; the Exco link carries a secret token, is not reachable
-- from any page on the site, is absent from the sitemap and disallowed in
-- robots.txt, and is handed out internally.
--
-- That link will leak eventually. Three things answer that, and none of
-- them is pretending otherwise: an Exco voter must pick their post and type
-- their name, so the register can be read by people who know who actually
-- sits on the Exco; any ballot can be voided, which removes it from the
-- tally; and under raw weighted counts a single Exco ballot is worth 0.4, so
-- a leak dilutes rather than decides.
--
-- ONE BALLOT PER DEVICE PER EDITION, whichever door it came through. SHESA
-- accepted this knowingly: a private window or a second phone is a second
-- vote, and the answer is that results are sealed and reviewable rather than
-- that the door is sealed. IP is recorded as a salted hash for review and
-- is deliberately NOT used to block — carrier NAT in Cameroon puts whole
-- networks behind one address, so an IP block would disenfranchise far more
-- people than it would stop.

-------------------------------------------------------------------------------
-- 1. The Exco door
-------------------------------------------------------------------------------

-- 64 hex characters from two v4 UUIDs. `gen_random_bytes` would read
-- better, but it lives in pgcrypto and this database does not have it —
-- `gen_random_uuid` is core, and two of them carry ~244 bits of randomness,
-- which is far more than a URL segment needs.
ALTER TABLE awards.editions
  ADD COLUMN IF NOT EXISTS exco_token text NOT NULL
    DEFAULT replace(gen_random_uuid()::text, '-', '')
         || replace(gen_random_uuid()::text, '-', '');

CREATE UNIQUE INDEX IF NOT EXISTS editions_exco_token_idx
  ON awards.editions (exco_token);

COMMENT ON COLUMN awards.editions.exco_token IS
  'Secret path segment for the Exco ballot. Regenerating it invalidates every copy of the old link at once — which is the point, and why it is a column and not a constant.';

-------------------------------------------------------------------------------
-- 2. Candidates
-------------------------------------------------------------------------------
-- The shortlist. A candidate usually begins as a nomination and keeps the
-- link back to it, so "why is this person on the ballot?" has an answer that
-- is a row rather than somebody's memory. The link is optional: the
-- secretariat may add a name nobody nominated, and the briefing does not
-- forbid it.

CREATE TABLE IF NOT EXISTS awards.candidates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  award_id      uuid NOT NULL REFERENCES awards.awards(id) ON DELETE CASCADE,
  nomination_id uuid REFERENCES awards.nominations(id) ON DELETE SET NULL,

  full_name     text NOT NULL,
  batch_year    integer,
  branch_label  text,
  description   text,
  photo_url     text,

  sort_order    integer NOT NULL DEFAULT 0,
  status        text NOT NULL DEFAULT 'active',

  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT candidates_name_len  CHECK (length(btrim(full_name)) BETWEEN 2 AND 200),
  CONSTRAINT candidates_status_ok CHECK (status IN ('active', 'withdrawn')),
  CONSTRAINT candidates_batch_ok  CHECK (batch_year IS NULL OR batch_year BETWEEN 1953 AND 2026)
);

-- The same person cannot appear twice on one award's ballot.
CREATE UNIQUE INDEX IF NOT EXISTS candidates_once_idx
  ON awards.candidates (award_id, lower(btrim(full_name)));

CREATE INDEX IF NOT EXISTS candidates_award_idx
  ON awards.candidates (award_id, sort_order);

-- The other end of the promotion, so the review screen can show at a glance
-- which nominations made the ballot.
ALTER TABLE awards.nominations
  ADD COLUMN IF NOT EXISTS candidate_id uuid
    REFERENCES awards.candidates(id) ON DELETE SET NULL;

-------------------------------------------------------------------------------
-- 3. Exco posts
-------------------------------------------------------------------------------
-- What an Exco voter picks from. Editor-managed rather than an enum: the
-- Exco is seventeen posts plus the branch and chapter presidents, and that
-- list changes between cycles without a migration being anybody's idea of
-- the right tool.

CREATE TABLE IF NOT EXISTS awards.exco_posts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id uuid NOT NULL REFERENCES awards.editions(id) ON DELETE CASCADE,
  label      text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT exco_posts_label_len CHECK (length(btrim(label)) BETWEEN 2 AND 160)
);

CREATE UNIQUE INDEX IF NOT EXISTS exco_posts_once_idx
  ON awards.exco_posts (edition_id, lower(btrim(label)));

-------------------------------------------------------------------------------
-- 4. Ballots
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS awards.ballots (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  edition_id        uuid NOT NULL REFERENCES awards.editions(id) ON DELETE CASCADE,

  college           text NOT NULL,

  -- Asked of every voter before the ballot opens. Not verified — there is
  -- nothing to verify against — but it is what the turnout report is built
  -- from, and what makes an implausible run of ballots visible.
  voter_batch_year  integer,
  voter_branch_label text,

  -- Exco only, and required there by the CHECK below. This is the review
  -- mechanism SHESA asked for: few enough people sit on the Exco that a
  -- fabricated post-and-name pair is recognisable to the secretariat.
  exco_post         text,
  exco_name         text,

  device_id         text NOT NULL,
  ip_hash           text,
  submitted_at      timestamptz NOT NULL DEFAULT now(),

  -- A voided ballot is struck from the tally and kept on the record. An
  -- election that deletes ballots cannot explain its own result.
  voided_at         timestamptz,
  voided_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  void_reason       text,

  CONSTRAINT ballots_college_ok CHECK (college IN ('ex_student', 'exco')),
  CONSTRAINT ballots_device_len CHECK (length(device_id) BETWEEN 8 AND 64),
  CONSTRAINT ballots_batch_ok   CHECK (
    voter_batch_year IS NULL OR voter_batch_year BETWEEN 1953 AND 2026),
  CONSTRAINT ballots_exco_identified CHECK (
    college <> 'exco'
    OR (btrim(coalesce(exco_post, '')) <> '' AND btrim(coalesce(exco_name, '')) <> ''))
);

-- One ballot per device per edition, whichever door it used. A device that
-- has voted publicly cannot vote again through the Exco link: it is refused,
-- not re-coloured, because silently upgrading a cast ballot would let anyone
-- holding the link promote their own earlier vote.
CREATE UNIQUE INDEX IF NOT EXISTS ballots_device_idx
  ON awards.ballots (edition_id, device_id);

CREATE INDEX IF NOT EXISTS ballots_review_idx
  ON awards.ballots (edition_id, college, submitted_at DESC);

CREATE TABLE IF NOT EXISTS awards.ballot_votes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ballot_id    uuid NOT NULL REFERENCES awards.ballots(id) ON DELETE CASCADE,
  award_id     uuid NOT NULL REFERENCES awards.awards(id) ON DELETE CASCADE,
  candidate_id uuid NOT NULL REFERENCES awards.candidates(id) ON DELETE CASCADE
);

-- At most one choice per award per ballot. A voter may skip awards they have
-- no view on; abstention is not spoilage.
CREATE UNIQUE INDEX IF NOT EXISTS ballot_votes_once_idx
  ON awards.ballot_votes (ballot_id, award_id);

CREATE INDEX IF NOT EXISTS ballot_votes_tally_idx
  ON awards.ballot_votes (award_id, candidate_id);

-------------------------------------------------------------------------------
-- 5. RLS
-------------------------------------------------------------------------------
-- Same posture as the nomination round: the editor reads and writes
-- everything, anon holds no grant, and the public reaches the ballot only
-- through the two functions below.

ALTER TABLE awards.candidates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE awards.exco_posts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE awards.ballots      ENABLE ROW LEVEL SECURITY;
ALTER TABLE awards.ballot_votes ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['candidates', 'exco_posts', 'ballots', 'ballot_votes']
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
  ON awards.candidates, awards.exco_posts, awards.ballots, awards.ballot_votes
  TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger tg
      JOIN pg_class c ON c.oid = tg.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'awards' AND c.relname = 'candidates'
       AND tg.tgname = 'candidates_set_updated_at'
  ) THEN
    CREATE TRIGGER candidates_set_updated_at BEFORE UPDATE ON awards.candidates
      FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
  END IF;
END $$;

-------------------------------------------------------------------------------
-- 6. The ballot paper
-------------------------------------------------------------------------------

-- Everything the voting page renders, in one call.
--
-- The token decides the college. A wrong token is reported as such rather
-- than quietly demoted to a public ballot: someone who was given the Exco
-- link and mistyped it needs to know, not to cast a 0.6 vote believing it
-- was a 0.4 one.
CREATE OR REPLACE FUNCTION awards.public_ballot(
  p_edition_slug text DEFAULT NULL,
  p_exco_token   text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_edition awards.editions;
  v_college text := 'ex_student';
BEGIN
  SELECT * INTO v_edition
    FROM awards.editions e
   WHERE (p_edition_slug IS NULL OR e.slug = p_edition_slug)
   ORDER BY e.created_at DESC
   LIMIT 1;

  IF v_edition.id IS NULL THEN
    RETURN jsonb_build_object('edition', NULL);
  END IF;

  IF p_exco_token IS NOT NULL AND length(p_exco_token) > 0 THEN
    IF p_exco_token = v_edition.exco_token THEN
      v_college := 'exco';
    ELSE
      RETURN jsonb_build_object('edition', NULL, 'error', 'invalid_token');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'edition', jsonb_build_object(
      'id', v_edition.id,
      'slug', v_edition.slug,
      'name', v_edition.name,
      'description', v_edition.description,
      'phase', awards.phase(v_edition),
      'voting_open_at',  v_edition.voting_open_at,
      'voting_close_at', v_edition.voting_close_at
    ),
    'college', v_college,
    'categories', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name)
             ORDER BY c.sort_order, c.name)
        FROM awards.categories c WHERE c.edition_id = v_edition.id), '[]'::jsonb),
    -- Awards with no candidate are omitted entirely. An award nobody was
    -- shortlisted for is a heading over an empty box, and on a ballot of
    -- nineteen that is nineteen chances to think the page is broken.
    'awards', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', a.id, 'category_id', a.category_id, 'name', a.name,
               'description', a.description,
               'candidates', (
                 SELECT jsonb_agg(jsonb_build_object(
                          'id', k.id, 'full_name', k.full_name,
                          'batch_year', k.batch_year, 'branch_label', k.branch_label,
                          'description', k.description, 'photo_url', k.photo_url)
                        ORDER BY k.sort_order, k.full_name)
                   FROM awards.candidates k
                  WHERE k.award_id = a.id AND k.status = 'active'))
             ORDER BY a.sort_order, a.name)
        FROM awards.awards a
       WHERE a.edition_id = v_edition.id
         AND a.status = 'active'
         AND EXISTS (SELECT 1 FROM awards.candidates k
                      WHERE k.award_id = a.id AND k.status = 'active')), '[]'::jsonb),
    -- Only sent through the Exco door, so the post list is not a thing the
    -- public page could leak by accident.
    'exco_posts', CASE WHEN v_college = 'exco' THEN COALESCE((
      SELECT jsonb_agg(p.label ORDER BY p.sort_order, p.label)
        FROM awards.exco_posts p WHERE p.edition_id = v_edition.id), '[]'::jsonb)
      ELSE '[]'::jsonb END
  );
END;
$$;

REVOKE ALL ON FUNCTION awards.public_ballot(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION awards.public_ballot(text, text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION awards.public_ballot(text, text) IS
  'The ballot paper: awards that have candidates, their candidates, and the college the caller''s link puts them in. Never returns a tally.';

-------------------------------------------------------------------------------
-- 7. Casting
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION awards.cast_ballot(
  p_edition_slug text,
  p_device_id    text,
  p_choices      jsonb,
  p_batch_year   integer DEFAULT NULL,
  p_branch_label text    DEFAULT NULL,
  p_exco_token   text    DEFAULT NULL,
  p_exco_post    text    DEFAULT NULL,
  p_exco_name    text    DEFAULT NULL,
  p_ip_hash      text    DEFAULT NULL
)
RETURNS TABLE (ok boolean, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_edition awards.editions;
  v_college text := 'ex_student';
  v_ballot  uuid;
  v_kept    integer;
BEGIN
  SELECT * INTO v_edition
    FROM awards.editions e
   WHERE (p_edition_slug IS NULL OR e.slug = p_edition_slug)
   ORDER BY e.created_at DESC
   LIMIT 1;

  IF v_edition.id IS NULL THEN
    RETURN QUERY SELECT false, 'unknown_edition'::text; RETURN;
  END IF;

  IF p_exco_token IS NOT NULL AND length(p_exco_token) > 0 THEN
    IF p_exco_token = v_edition.exco_token THEN
      v_college := 'exco';
    ELSE
      RETURN QUERY SELECT false, 'invalid_token'::text; RETURN;
    END IF;
  END IF;

  -- The window, from the clock rather than from a flag somebody sets.
  IF awards.phase(v_edition) <> 'voting' THEN
    RETURN QUERY SELECT false,
      CASE WHEN v_edition.voting_open_at IS NOT NULL
             AND pg_catalog.now() < v_edition.voting_open_at
           THEN 'not_open_yet' ELSE 'closed' END;
    RETURN;
  END IF;

  IF p_device_id IS NULL OR length(p_device_id) NOT BETWEEN 8 AND 64 THEN
    RETURN QUERY SELECT false, 'bad_device'::text; RETURN;
  END IF;

  IF v_college = 'exco'
     AND (btrim(coalesce(p_exco_post, '')) = '' OR btrim(coalesce(p_exco_name, '')) = '') THEN
    RETURN QUERY SELECT false, 'exco_identity_required'::text; RETURN;
  END IF;

  IF p_batch_year IS NOT NULL AND p_batch_year NOT BETWEEN 1953 AND 2026 THEN
    RETURN QUERY SELECT false, 'bad_batch_year'::text; RETURN;
  END IF;

  IF p_choices IS NULL OR jsonb_typeof(p_choices) <> 'array'
     OR jsonb_array_length(p_choices) = 0 THEN
    RETURN QUERY SELECT false, 'empty_ballot'::text; RETURN;
  END IF;

  IF p_ip_hash IS NOT NULL
     AND NOT cms.consume_submission_slot('awardvote:' || p_ip_hash, 20, 86400) THEN
    RETURN QUERY SELECT false, 'throttled'::text; RETURN;
  END IF;

  BEGIN
    INSERT INTO awards.ballots (
      edition_id, college, voter_batch_year, voter_branch_label,
      exco_post, exco_name, device_id, ip_hash)
    VALUES (
      v_edition.id, v_college, p_batch_year,
      NULLIF(btrim(coalesce(p_branch_label, '')), ''),
      CASE WHEN v_college = 'exco' THEN btrim(p_exco_post) END,
      CASE WHEN v_college = 'exco' THEN btrim(p_exco_name) END,
      p_device_id, p_ip_hash)
    RETURNING id INTO v_ballot;
  EXCEPTION
    WHEN unique_violation THEN
      RETURN QUERY SELECT false, 'already_voted'::text; RETURN;
  END;

  -- Only choices that survive every join are kept: the candidate must exist,
  -- be active, sit on the named award, and that award must belong to this
  -- edition. A forged pair is dropped rather than raising — the rest of an
  -- honest voter's ballot should not be lost to one bad row, and a caller
  -- who sent nothing valid is told so below.
  INSERT INTO awards.ballot_votes (ballot_id, award_id, candidate_id)
  SELECT DISTINCT ON (a.id) v_ballot, a.id, k.id
    FROM jsonb_array_elements(p_choices) AS c
    JOIN awards.awards a
      ON a.id = (c ->> 'award_id')::uuid
     AND a.edition_id = v_edition.id
     AND a.status = 'active'
    JOIN awards.candidates k
      ON k.id = (c ->> 'candidate_id')::uuid
     AND k.award_id = a.id
     AND k.status = 'active'
   ORDER BY a.id;

  GET DIAGNOSTICS v_kept = ROW_COUNT;

  IF v_kept = 0 THEN
    -- Nothing valid in the whole submission. Roll the ballot back so the
    -- device is not burned on an empty vote it cannot retry.
    DELETE FROM awards.ballots WHERE id = v_ballot;
    RETURN QUERY SELECT false, 'empty_ballot'::text; RETURN;
  END IF;

  RETURN QUERY SELECT true, 'ok'::text;
END;
$$;

REVOKE ALL ON FUNCTION awards.cast_ballot(text, text, jsonb, integer, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION awards.cast_ballot(text, text, jsonb, integer, text, text, text, text, text)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION awards.cast_ballot IS
  'Cast one ballot. The token decides the college; the device decides whether there is one to cast at all.';

-------------------------------------------------------------------------------
-- 8. The tally
-------------------------------------------------------------------------------
-- SECURITY INVOKER, unlike everything above it. These read through the
-- caller's own RLS, so the editor policy is the only thing that admits
-- anyone — there is no definer function anywhere that could be persuaded to
-- hand a tally to `anon`. Results are sealed; that is what sealed means.

CREATE OR REPLACE FUNCTION awards.results(p_edition_id uuid)
RETURNS TABLE (
  award_id         uuid,
  award_name       text,
  category_name    text,
  candidate_id     uuid,
  candidate_name   text,
  ex_student_votes bigint,
  exco_votes       bigint,
  score            numeric,
  -- Not `position`: that is a SQL keyword, and a column named after one is a
  -- parse error waiting for whoever writes the next query against this.
  place            bigint
)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  WITH ed AS (
    SELECT * FROM awards.editions WHERE id = p_edition_id
  ),
  -- Voided ballots are excluded here and nowhere else, so every figure
  -- below — counts, shares, ranks — agrees by construction.
  counted AS (
    SELECT bv.award_id, bv.candidate_id, b.college
      FROM awards.ballot_votes bv
      JOIN awards.ballots b ON b.id = bv.ballot_id
     WHERE b.edition_id = p_edition_id AND b.voided_at IS NULL
  ),
  tally AS (
    SELECT k.award_id, k.id AS candidate_id,
           count(*) FILTER (WHERE c.college = 'ex_student') AS ex_votes,
           count(*) FILTER (WHERE c.college = 'exco')       AS exco_votes
      FROM awards.candidates k
      LEFT JOIN counted c ON c.candidate_id = k.id
     WHERE k.award_id IN (SELECT id FROM awards.awards WHERE edition_id = p_edition_id)
     GROUP BY k.award_id, k.id
  ),
  -- Turnout per award per college, for the share-based method. Zero stays
  -- zero rather than dividing by it.
  turnout AS (
    SELECT t.award_id,
           NULLIF(sum(t.ex_votes), 0)   AS ex_total,
           NULLIF(sum(t.exco_votes), 0) AS exco_total
      FROM tally t GROUP BY t.award_id
  ),
  scored AS (
    SELECT t.award_id, t.candidate_id, t.ex_votes, t.exco_votes,
           CASE ed.weighting_method
             -- SHESA's choice. Weights each BALLOT, which with ~20 Exco
             -- voters against several hundred ex-students does not deliver a
             -- 40% Exco share. That was raised in writing before the vote
             -- opened and confirmed; switching is a value change here.
             WHEN 'college_share' THEN
               ed.ex_student_weight * (t.ex_votes::numeric / COALESCE(tn.ex_total, 1))
               + ed.exco_weight     * (t.exco_votes::numeric / COALESCE(tn.exco_total, 1))
             ELSE
               ed.ex_student_weight * t.ex_votes + ed.exco_weight * t.exco_votes
           END AS score
      FROM tally t
      JOIN turnout tn ON tn.award_id = t.award_id
      CROSS JOIN ed
  )
  SELECT a.id, a.name, c.name, s.candidate_id, k.full_name,
         s.ex_votes, s.exco_votes, round(s.score, 4),
         rank() OVER (PARTITION BY a.id ORDER BY s.score DESC, k.full_name)
    FROM scored s
    JOIN awards.awards a ON a.id = s.award_id
    JOIN awards.candidates k ON k.id = s.candidate_id
    LEFT JOIN awards.categories c ON c.id = a.category_id
   ORDER BY a.sort_order, a.name, s.score DESC, k.full_name;
$$;

REVOKE ALL ON FUNCTION awards.results(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION awards.results(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION awards.results(uuid) IS
  'The weighted tally, voided ballots excluded. SECURITY INVOKER: readable only by someone whose own RLS admits them to the ballot tables.';

-- Who voted, in aggregate. Feeds the turnout charts; says nothing about how
-- anyone voted.
CREATE OR REPLACE FUNCTION awards.turnout(p_edition_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'ex_student', (SELECT count(*) FROM awards.ballots
                    WHERE edition_id = p_edition_id AND voided_at IS NULL
                      AND college = 'ex_student'),
    'exco',       (SELECT count(*) FROM awards.ballots
                    WHERE edition_id = p_edition_id AND voided_at IS NULL
                      AND college = 'exco'),
    'voided',     (SELECT count(*) FROM awards.ballots
                    WHERE edition_id = p_edition_id AND voided_at IS NOT NULL),
    -- Each of these groups in an inner query and builds the JSON outside
    -- it. Building the object in the grouped SELECT puts the count() inside
    -- the expression that GROUP BY 1 then points at, which Postgres rejects.
    'by_day', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('day', s.day, 'count', s.n) ORDER BY s.day)
        FROM (SELECT (submitted_at AT TIME ZONE 'Africa/Lagos')::date AS day,
                     count(*) AS n
                FROM awards.ballots
               WHERE edition_id = p_edition_id AND voided_at IS NULL
               GROUP BY 1) s), '[]'::jsonb),
    'by_decade', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('decade', s.decade, 'count', s.n) ORDER BY s.decade)
        FROM (SELECT ((voter_batch_year / 10) * 10)::text || 's' AS decade,
                     count(*) AS n
                FROM awards.ballots
               WHERE edition_id = p_edition_id AND voided_at IS NULL
                 AND voter_batch_year IS NOT NULL
               GROUP BY 1) s), '[]'::jsonb),
    'by_branch', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('branch', s.branch, 'count', s.n) ORDER BY s.n DESC)
        FROM (SELECT COALESCE(NULLIF(btrim(voter_branch_label), ''), 'Not given') AS branch,
                     count(*) AS n
                FROM awards.ballots
               WHERE edition_id = p_edition_id AND voided_at IS NULL
               GROUP BY 1) s), '[]'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION awards.turnout(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION awards.turnout(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION awards.turnout(uuid) IS
  'Ballot counts by college, day, batch decade and branch. Aggregate only — no link from a voter to a choice.';
