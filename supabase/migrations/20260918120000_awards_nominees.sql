-- Nominees: one row per person, above the nominations that name them.
--
-- THE PROBLEM
--
-- `awards.nominations` is one row per act of nominating, which is right —
-- five people putting John Doe forward for Health is five citations, and the
-- secretariat reads all five. But to know that John Doe leads that award
-- somebody has to tally by hand, across nineteen awards, in the week between
-- nominations closing and voting opening.
--
-- And the rows will not agree. "Fru John Doe Che", "Fru John Che", "John Doe
-- Fru" and a plain typo are four spellings of one man, and a count that
-- treats them as four people is wrong in a way nobody notices.
--
-- THE SHAPE OF THE ANSWER
--
-- A bucket per person per award. Nominations point at a bucket; the count is
-- how many point at it. Nothing about a nomination changes — it keeps its
-- citation, its nominator and its place in the record — it just gains a
-- nullable pointer. NULL means "not yet aggregated", which is the pile a
-- reviewer works through.
--
-- The count is NOT stored anywhere. A stored counter is a second source of
-- truth that goes stale the moment two buckets are merged or a nomination is
-- reassigned, and a count that is quietly wrong is worse than counting by
-- hand, because it gets believed.
--
-- WHAT THE MACHINE DECIDES AND WHAT A PERSON DECIDES
--
-- Identical after normalisation goes in the same bucket automatically: that
-- is not a judgement, it is the same string. Everything beyond that —
-- reordered names, dropped middle names, misspellings — is only ever
-- *proposed*. Silently fusing two real people who share a surname is the one
-- failure this must not have, so the fuzzy pass returns suggestions and a
-- human presses the button.

-------------------------------------------------------------------------------
-- 1. Normalisation
-------------------------------------------------------------------------------

-- The comparison key. Case, punctuation and doubled spaces carry no
-- information about who a person is, so they are removed before two names
-- are called the same.
CREATE OR REPLACE FUNCTION awards.normalise_name(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT pg_catalog.btrim(
           pg_catalog.regexp_replace(
             pg_catalog.regexp_replace(
               -- `coalesce` is unqualified because it is a SQL construct
               -- rather than a pg_catalog function; qualifying it is a
               -- 42883. The genuine functions around it still are.
               pg_catalog.lower(pg_catalog.btrim(coalesce(p_name, ''))),
               '[^a-z0-9 ]', ' ', 'g'),
             ' +', ' ', 'g'));
$$;

COMMENT ON FUNCTION awards.normalise_name(text) IS
  'Comparison key for a person''s name: lowercased, punctuation stripped, whitespace collapsed. Word ORDER is preserved — reordering is a human judgement, not a normalisation.';

-------------------------------------------------------------------------------
-- 2. The bucket
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS awards.nominees (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  award_id     uuid NOT NULL REFERENCES awards.awards(id) ON DELETE CASCADE,

  -- What the secretariat decides this person is called. Editable, because
  -- the first spelling to arrive is not necessarily the right one.
  display_name text NOT NULL,

  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT nominees_name_len CHECK (length(btrim(display_name)) BETWEEN 2 AND 200)
);

-- Per award, not per edition. The count that matters is "how many people put
-- John Doe forward for Health"; the same man nominated for ICT is a separate
-- question with a separate ballot.
CREATE UNIQUE INDEX IF NOT EXISTS nominees_once_idx
  ON awards.nominees (award_id, awards.normalise_name(display_name));

CREATE INDEX IF NOT EXISTS nominees_award_idx ON awards.nominees (award_id);

COMMENT ON TABLE awards.nominees IS
  'One person, per award — the bucket the nominations naming them point at. Counting is done by counting pointers; no total is stored.';

-- The pointer. Nullable on purpose: NULL is the "not yet aggregated" pile,
-- and ON DELETE SET NULL means dissolving a bucket returns its nominations
-- to that pile rather than destroying them.
ALTER TABLE awards.nominations
  ADD COLUMN IF NOT EXISTS nominee_id uuid
    REFERENCES awards.nominees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS nominations_nominee_idx ON awards.nominations (nominee_id);

-------------------------------------------------------------------------------
-- 3. The candidate profile
-------------------------------------------------------------------------------
-- A nomination is what a member wrote in a hurry on their phone. A candidacy
-- is what SHESA publishes on a ballot, and the Executive Committee supplies
-- it properly: name, batch, branch, profession, what they have actually done
-- in the field the award is for, and a photograph.
--
-- `description` becomes `accomplishments` rather than gaining a sibling. Two
-- free-text fields with overlapping meanings is how a form ends up with the
-- real content in whichever one the last editor happened to use.

ALTER TABLE awards.candidates
  ADD COLUMN IF NOT EXISTS profession text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'awards' AND table_name = 'candidates'
       AND column_name = 'description'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'awards' AND table_name = 'candidates'
       AND column_name = 'accomplishments'
  ) THEN
    ALTER TABLE awards.candidates RENAME COLUMN description TO accomplishments;
  END IF;
END $$;

COMMENT ON COLUMN awards.candidates.accomplishments IS
  'Works accomplished, relevant to this award. Pre-filled from the nominations for reference and then rewritten by the secretariat — this is what a voter reads.';

-- Which bucket this candidacy came from, so a candidate on the ballot can be
-- traced back to every citation written about them.
ALTER TABLE awards.candidates
  ADD COLUMN IF NOT EXISTS nominee_id uuid
    REFERENCES awards.nominees(id) ON DELETE SET NULL;

-------------------------------------------------------------------------------
-- 4. RLS
-------------------------------------------------------------------------------

ALTER TABLE awards.nominees ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'awards' AND tablename = 'nominees'
       AND policyname = 'nominees_editor_all'
  ) THEN
    CREATE POLICY nominees_editor_all ON awards.nominees FOR ALL TO authenticated
      USING (core.has_permission_at_any_scope(auth.uid(), 'cms.edit'))
      WITH CHECK (core.has_permission_at_any_scope(auth.uid(), 'cms.edit'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger tg
      JOIN pg_class c ON c.oid = tg.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'awards' AND c.relname = 'nominees'
       AND tg.tgname = 'nominees_set_updated_at'
  ) THEN
    CREATE TRIGGER nominees_set_updated_at BEFORE UPDATE ON awards.nominees
      FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON awards.nominees TO authenticated;

-- Nothing for anon. The suggestion RPC below is the only public reach.

-------------------------------------------------------------------------------
-- 5. Name suggestions for the public form
-------------------------------------------------------------------------------
-- Stops the variants being created in the first place, which is worth more
-- than any amount of reconciling afterwards.
--
-- WHAT THIS DISCLOSES, DELIBERATELY: that a name has been put forward
-- somewhere in this cycle. Not for which award, not by whom, and above all
-- NOT HOW MANY TIMES — a count would turn the nomination round into a
-- campaign, with people piling onto whoever is visibly ahead. SHESA agreed
-- to names only on that basis.
--
-- Two characters minimum and a hard cap of eight, so the list cannot be
-- walked by typing single letters.
CREATE OR REPLACE FUNCTION awards.suggest_nominees(
  p_query        text,
  p_edition_slug text DEFAULT NULL
)
RETURNS TABLE (name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_edition uuid;
  v_q       text;
BEGIN
  v_q := awards.normalise_name(p_query);
  IF length(v_q) < 2 THEN RETURN; END IF;

  SELECT e.id INTO v_edition
    FROM awards.editions e
   WHERE (p_edition_slug IS NULL OR e.slug = p_edition_slug)
   ORDER BY e.created_at DESC
   LIMIT 1;

  IF v_edition IS NULL THEN RETURN; END IF;

  -- Across the whole edition, not just the award being nominated for: the
  -- spelling problem is edition-wide, and someone already put forward for
  -- Health should autocomplete when a different member nominates them for
  -- ICT. Buckets rank above raw nominations because a bucket's display name
  -- is the spelling the secretariat has settled on.
  RETURN QUERY
  WITH pool AS (
    SELECT n.display_name AS nm, 0 AS tier
      FROM awards.nominees n
      JOIN awards.awards a ON a.id = n.award_id
     WHERE a.edition_id = v_edition
    UNION ALL
    SELECT nom.nominee_name, 1
      FROM awards.nominations nom
      JOIN awards.awards a ON a.id = nom.award_id
     WHERE a.edition_id = v_edition
       AND nom.status <> 'rejected'
  ),
  ranked AS (
    SELECT DISTINCT ON (awards.normalise_name(p.nm))
           p.nm, p.tier,
           -- A name starting with what was typed beats one merely containing
           -- it: typing "jo" wants John before Bejong.
           CASE WHEN awards.normalise_name(p.nm) LIKE v_q || '%' THEN 0 ELSE 1 END AS hit
      FROM pool p
     WHERE awards.normalise_name(p.nm) LIKE '%' || v_q || '%'
     ORDER BY awards.normalise_name(p.nm), p.tier
  )
  SELECT r.nm FROM ranked r
   ORDER BY r.hit, length(r.nm), r.nm
   LIMIT 8;
END;
$$;

REVOKE ALL ON FUNCTION awards.suggest_nominees(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION awards.suggest_nominees(text, text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION awards.suggest_nominees(text, text) IS
  'Names already put forward this cycle, for the nomination form''s autocomplete. Names only — never counts, never awards, never nominators. Minimum two characters, at most eight results.';

-------------------------------------------------------------------------------
-- 6. Aggregation
-------------------------------------------------------------------------------

-- The button. Sweeps every not-yet-aggregated nomination for one award into
-- a bucket keyed on its normalised name, creating buckets as needed.
--
-- Exact matches only. This is the safe half of the job: it never merges two
-- different spellings, so it can run unattended and cannot be wrong. What it
-- leaves behind — one bucket per spelling — is what the suggestion function
-- below proposes merging.
CREATE OR REPLACE FUNCTION awards.aggregate_nominations(p_award_id uuid)
RETURNS TABLE (buckets_created integer, nominations_assigned integer)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_created  integer := 0;
  v_assigned integer := 0;
BEGIN
  -- SECURITY INVOKER: RLS on nominations and nominees already requires
  -- cms.edit, so an unprivileged caller sees no rows and changes nothing.
  INSERT INTO awards.nominees (award_id, display_name)
  SELECT DISTINCT ON (awards.normalise_name(n.nominee_name))
         n.award_id, btrim(n.nominee_name)
    FROM awards.nominations n
   WHERE n.award_id = p_award_id
     AND n.nominee_id IS NULL
     AND NOT EXISTS (
       SELECT 1 FROM awards.nominees x
        WHERE x.award_id = n.award_id
          AND awards.normalise_name(x.display_name)
              = awards.normalise_name(n.nominee_name))
   ORDER BY awards.normalise_name(n.nominee_name), n.created_at;

  GET DIAGNOSTICS v_created = ROW_COUNT;

  UPDATE awards.nominations n
     SET nominee_id = b.id
    FROM awards.nominees b
   WHERE n.award_id = p_award_id
     AND n.nominee_id IS NULL
     AND b.award_id = n.award_id
     AND awards.normalise_name(b.display_name) = awards.normalise_name(n.nominee_name);

  GET DIAGNOSTICS v_assigned = ROW_COUNT;

  RETURN QUERY SELECT v_created, v_assigned;
END;
$$;

REVOKE ALL ON FUNCTION awards.aggregate_nominations(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION awards.aggregate_nominations(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION awards.aggregate_nominations(uuid) IS
  'Sweep un-aggregated nominations for one award into buckets by exact normalised name. Never merges different spellings — that is a human decision.';

-- Pairs of buckets that might be one person.
--
-- Word-set overlap rather than edit distance, because the failure mode here
-- is reordered and dropped names — "Fru John Doe Che" against "John Doe Fru"
-- shares three words out of four but is a long way apart character by
-- character. Short words are kept: dropping them would make "John Ade" and
-- "John Obi" look identical.
--
-- Returns suggestions and changes NOTHING. Two real people who share a
-- surname must never be fused by a background job.
CREATE OR REPLACE FUNCTION awards.merge_suggestions(p_award_id uuid)
RETURNS TABLE (
  left_id    uuid,
  left_name  text,
  left_count bigint,
  right_id   uuid,
  right_name text,
  right_count bigint,
  overlap    numeric
)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  WITH words AS (
    SELECT b.id, b.display_name,
           (SELECT array_agg(DISTINCT w)
              FROM unnest(string_to_array(awards.normalise_name(b.display_name), ' ')) AS w
             WHERE length(w) > 0) AS ws
      FROM awards.nominees b
     WHERE b.award_id = p_award_id
  ),
  counts AS (
    SELECT nominee_id, count(*) AS n
      FROM awards.nominations
     WHERE nominee_id IS NOT NULL
     GROUP BY nominee_id
  ),
  pairs AS (
    SELECT a.id AS aid, a.display_name AS an, b.id AS bid, b.display_name AS bn,
           cardinality(ARRAY(SELECT unnest(a.ws) INTERSECT SELECT unnest(b.ws)))::numeric
             / GREATEST(LEAST(cardinality(a.ws), cardinality(b.ws)), 1) AS ov
      FROM words a
      JOIN words b ON b.id > a.id
     WHERE a.ws IS NOT NULL AND b.ws IS NOT NULL
  )
  -- Every word of the shorter name appearing in the longer one is the signal
  -- worth surfacing; anything weaker produces more noise than a reviewer
  -- will read, and they can still merge by hand.
  SELECT p.aid, p.an, COALESCE(ca.n, 0), p.bid, p.bn, COALESCE(cb.n, 0), round(p.ov, 2)
    FROM pairs p
    LEFT JOIN counts ca ON ca.nominee_id = p.aid
    LEFT JOIN counts cb ON cb.nominee_id = p.bid
   WHERE p.ov >= 0.999
   ORDER BY p.ov DESC, p.an;
$$;

REVOKE ALL ON FUNCTION awards.merge_suggestions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION awards.merge_suggestions(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION awards.merge_suggestions(uuid) IS
  'Buckets that may be the same person, by word overlap. Proposals only — merging is always a human action.';

-- Fold one bucket into another. Every nomination follows, and the emptied
-- bucket goes. Reversible by splitting a nomination back out, because the
-- first pass over a list of names always gets some of them wrong.
CREATE OR REPLACE FUNCTION awards.merge_nominees(p_keep uuid, p_absorb uuid)
RETURNS integer
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_moved integer := 0;
BEGIN
  IF p_keep = p_absorb THEN RETURN 0; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM awards.nominees a JOIN awards.nominees b ON b.award_id = a.award_id
     WHERE a.id = p_keep AND b.id = p_absorb
  ) THEN
    RAISE EXCEPTION 'Those two nominees belong to different awards.';
  END IF;

  UPDATE awards.nominations SET nominee_id = p_keep WHERE nominee_id = p_absorb;
  GET DIAGNOSTICS v_moved = ROW_COUNT;

  UPDATE awards.candidates SET nominee_id = p_keep WHERE nominee_id = p_absorb;
  DELETE FROM awards.nominees WHERE id = p_absorb;

  RETURN v_moved;
END;
$$;

REVOKE ALL ON FUNCTION awards.merge_nominees(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION awards.merge_nominees(uuid, uuid) TO authenticated, service_role;

COMMENT ON FUNCTION awards.merge_nominees(uuid, uuid) IS
  'Fold the second nominee into the first. Nominations and any candidacy follow; the absorbed bucket is deleted.';
