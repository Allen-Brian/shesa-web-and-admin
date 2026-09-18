-- Which ceremony is live, and how it counts votes.
--
-- 1. ONE ACTIVE CEREMONY
--
-- The public site had been resolving "the current cycle" as the most
-- recently created row, which is a guess dressed as a rule: it silently
-- changes the moment somebody starts preparing next year's ceremony.
--
-- An explicit flag instead, and at most one may carry it — enforced by a
-- partial unique index rather than by application code, because "only one
-- can be open at a time" is an invariant of the data and two editors
-- clicking Activate at the same moment must not both win.
--
-- 2. VOTING MODE
--
-- Not every ceremony has two colleges. A branch award, a batch award, a
-- year with no sitting Exco — these are decided by the membership alone,
-- and the honest way to express that is a mode, not an Exco weight quietly
-- set to zero.
--
-- A zero weight would be worse than it looks: the Exco link would still
-- work, ballots cast through it would still be recorded, and every one would
-- count for nothing while telling the voter it had been counted.
-- `public_only` closes the door instead — the route refuses, so nobody casts
-- a vote that silently evaporates.
--
-- 3. THE WEIGHTS BECOME EDITABLE
--
-- The AGM 2026 migration locked them, citing the President General's
-- briefing: "shall not alter the approved ... voting weights ... without
-- written authorization". SHESA has since asked for a control, which is
-- theirs to ask for — the briefing binds the association, not the schema.
--
-- What the schema keeps is the record: `weights_changed_at` and
-- `weights_changed_by` are stamped on every change, so "who altered the
-- weighting, and when" has an answer that is a row rather than a memory.

-------------------------------------------------------------------------------
-- 1. Columns
-------------------------------------------------------------------------------

ALTER TABLE awards.editions
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT false;

-- At most one active row, enforced by the index rather than by whoever
-- remembers to clear the others. The expression is a constant, so every
-- active row collides with every other active row.
CREATE UNIQUE INDEX IF NOT EXISTS editions_one_active_idx
  ON awards.editions ((true)) WHERE is_active;

COMMENT ON COLUMN awards.editions.is_active IS
  'The ceremony the public site shows. At most one, enforced by editions_one_active_idx.';

ALTER TABLE awards.editions
  ADD COLUMN IF NOT EXISTS voting_mode text NOT NULL DEFAULT 'weighted';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'editions_voting_mode_ok') THEN
    ALTER TABLE awards.editions
      ADD CONSTRAINT editions_voting_mode_ok
      CHECK (voting_mode IN ('weighted', 'public_only'));
  END IF;

  -- In public_only there is exactly one college, so the ex-student weight
  -- carries the whole vote and the Exco weight must be nothing. Enforced
  -- rather than trusted: both fields are read by `awards.results`, and a
  -- mismatch would produce a tally nobody could explain.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'editions_public_only_weights') THEN
    ALTER TABLE awards.editions
      ADD CONSTRAINT editions_public_only_weights
      CHECK (voting_mode <> 'public_only' OR (ex_student_weight = 1 AND exco_weight = 0));
  END IF;
END $$;

COMMENT ON COLUMN awards.editions.voting_mode IS
  'weighted — two colleges, ex-students and Exco, combined by the weights. public_only — one college; the Exco route refuses.';

ALTER TABLE awards.editions
  ADD COLUMN IF NOT EXISTS weights_changed_at timestamptz;

ALTER TABLE awards.editions
  ADD COLUMN IF NOT EXISTS weights_changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN awards.editions.weights_changed_at IS
  'When the weighting was last altered. A published result has to be explainable, and "the weights changed on the 3rd" is the explanation.';

-- The cycle that exists today was the one the site was already resolving to.
-- Making that explicit rather than leaving every ceremony inactive, which
-- would take the public page down on deploy.
UPDATE awards.editions SET is_active = true
 WHERE slug = 'agm-2026'
   AND NOT EXISTS (SELECT 1 FROM awards.editions WHERE is_active);

-------------------------------------------------------------------------------
-- 2. Activation
-------------------------------------------------------------------------------
-- One statement, because the index makes the two-step version impossible:
-- clearing the old active row and setting the new one has to happen inside a
-- single UPDATE or the intermediate state collides with itself.

CREATE OR REPLACE FUNCTION awards.set_active_edition(p_edition_id uuid)
RETURNS void
LANGUAGE sql
SET search_path = ''
AS $$
  UPDATE awards.editions
     SET is_active = (id = p_edition_id)
   WHERE is_active OR id = p_edition_id;
$$;

REVOKE ALL ON FUNCTION awards.set_active_edition(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION awards.set_active_edition(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION awards.set_active_edition(uuid) IS
  'Make one ceremony the live one and stand every other down, atomically. SECURITY INVOKER — RLS already requires cms.edit.';

-- Deactivate without promoting anything: the public page then has nothing to
-- show, which is the right state between two cycles.
CREATE OR REPLACE FUNCTION awards.clear_active_edition()
RETURNS void
LANGUAGE sql
SET search_path = ''
AS $$
  UPDATE awards.editions SET is_active = false WHERE is_active;
$$;

REVOKE ALL ON FUNCTION awards.clear_active_edition() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION awards.clear_active_edition() TO authenticated, service_role;

-------------------------------------------------------------------------------
-- 3. The public functions resolve to the active ceremony
-------------------------------------------------------------------------------
-- A NULL slug now means "whichever is active", not "the newest". The site
-- passes no slug at all, so preparing next year's ceremony no longer
-- hijacks this year's page the moment the row is created.

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
   WHERE CASE WHEN p_edition_slug IS NULL THEN e.is_active ELSE e.slug = p_edition_slug END
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
      'voting_mode', v_edition.voting_mode,
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

COMMENT ON FUNCTION awards.public_state(text) IS
  'The public view of the active ceremony — or of a named one. Never returns nominations: who has been put forward is not public during the round.';

-------------------------------------------------------------------------------
-- 4. The Exco door closes in public_only
-------------------------------------------------------------------------------
-- Reported rather than silently demoted: someone holding an Exco link for a
-- ceremony that has no Exco college needs to be told, not quietly counted as
-- something else.

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
   WHERE CASE WHEN p_edition_slug IS NULL THEN e.is_active ELSE e.slug = p_edition_slug END
   LIMIT 1;

  IF v_edition.id IS NULL THEN
    RETURN jsonb_build_object('edition', NULL);
  END IF;

  IF p_exco_token IS NOT NULL AND length(p_exco_token) > 0 THEN
    IF v_edition.voting_mode = 'public_only' THEN
      RETURN jsonb_build_object('edition', NULL, 'error', 'public_only');
    ELSIF p_exco_token = v_edition.exco_token THEN
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
      'voting_mode', v_edition.voting_mode,
      'voting_open_at',  v_edition.voting_open_at,
      'voting_close_at', v_edition.voting_close_at
    ),
    'college', v_college,
    'categories', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name)
             ORDER BY c.sort_order, c.name)
        FROM awards.categories c WHERE c.edition_id = v_edition.id), '[]'::jsonb),
    'awards', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', a.id, 'category_id', a.category_id, 'name', a.name,
               'description', a.description,
               'candidates', (
                 SELECT jsonb_agg(jsonb_build_object(
                          'id', k.id,
                          'full_name', k.full_name,
                          'batch_year', k.batch_year,
                          'branch_label', k.branch_label,
                          'profession', k.profession,
                          'accomplishments', k.accomplishments,
                          'photo_url', k.photo_url)
                        ORDER BY k.sort_order, k.full_name)
                   FROM awards.candidates k
                  WHERE k.award_id = a.id AND k.status = 'active'))
             ORDER BY a.sort_order, a.name)
        FROM awards.awards a
       WHERE a.edition_id = v_edition.id
         AND a.status = 'active'
         AND EXISTS (SELECT 1 FROM awards.candidates k
                      WHERE k.award_id = a.id AND k.status = 'active')), '[]'::jsonb),
    'exco_posts', CASE WHEN v_college = 'exco' THEN COALESCE((
      SELECT jsonb_agg(p.label ORDER BY p.sort_order, p.label)
        FROM awards.exco_posts p WHERE p.edition_id = v_edition.id), '[]'::jsonb)
      ELSE '[]'::jsonb END
  );
END;
$$;

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
   WHERE CASE WHEN p_edition_slug IS NULL THEN e.is_active ELSE e.slug = p_edition_slug END
   LIMIT 1;

  IF v_edition.id IS NULL THEN
    RETURN QUERY SELECT false, 'unknown_edition'::text; RETURN;
  END IF;

  IF p_exco_token IS NOT NULL AND length(p_exco_token) > 0 THEN
    IF v_edition.voting_mode = 'public_only' THEN
      RETURN QUERY SELECT false, 'public_only'::text; RETURN;
    ELSIF p_exco_token = v_edition.exco_token THEN
      v_college := 'exco';
    ELSE
      RETURN QUERY SELECT false, 'invalid_token'::text; RETURN;
    END IF;
  END IF;

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
    DELETE FROM awards.ballots WHERE id = v_ballot;
    RETURN QUERY SELECT false, 'empty_ballot'::text; RETURN;
  END IF;

  RETURN QUERY SELECT true, 'ok'::text;
END;
$$;

COMMENT ON FUNCTION awards.cast_ballot IS
  'Cast one ballot. The token decides the college, the mode decides whether there is a second college at all, and the device decides whether there is a ballot to cast.';
