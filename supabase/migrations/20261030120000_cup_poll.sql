-- Quartier 2026 — the closing poll on the trailer.
--
-- The last slide of /cup/2026 asks "who lifts it?" and offers the four
-- zones. Until now the tally was sample data held in localStorage and the
-- slide said so on screen. This makes it real.
--
-- ONE VOTE PER DEVICE. The device is a random id this browser generated and
-- kept in localStorage (`shesa:visitor-id`, shared with the likes counter
-- and the awards ballot). A private window or a second phone is a second
-- vote, and that is accepted: this is a bit of fun on an advert, not an
-- election, and the alternative is asking a stranger to create an account
-- before they can tap a team.
--
-- IP IS HASHED AND USED ONLY TO RATE-LIMIT, NEVER TO IDENTIFY A VOTER OR TO
-- BLOCK ONE. That follows the reasoning already written into
-- `20260918110000_awards_voting.sql`: carrier NAT in Cameroon puts whole
-- networks behind a single address, so blocking on IP would shut out far
-- more real people than it would stop. The limit here is deliberately loose
-- — it exists to stop a script, not a family sharing a router.
--
-- THE TEAM LIST LIVES IN TYPESCRIPT, NOT HERE. `cup-content.ts` is the one
-- file the trailer's content is edited in, and the zone names have already
-- been renamed once ("The Rock" became "Rocky Mountains"). So the valid
-- names are passed in by the server action on every call rather than seeded
-- into a table that would silently drift out of date. The browser never
-- supplies them: the action reads them from the compiled content.

-------------------------------------------------------------------------------
-- 1. The votes
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cms.cup_votes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The tournament this vote belongs to, so 2027 starts a clean tally
  -- without a migration.
  edition    text NOT NULL,
  team       text NOT NULL,

  device_id  text NOT NULL,
  ip_hash    text,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT cup_votes_edition_len CHECK (length(btrim(edition)) BETWEEN 1 AND 32),
  CONSTRAINT cup_votes_team_len    CHECK (length(btrim(team)) BETWEEN 1 AND 80),
  CONSTRAINT cup_votes_device_len  CHECK (length(device_id) BETWEEN 8 AND 64)
);

-- The whole mechanism: one row per device per edition. A second vote from
-- the same browser conflicts here and is turned into a change of mind
-- rather than an error — see `cast_cup_vote`.
CREATE UNIQUE INDEX IF NOT EXISTS cup_votes_device_idx
  ON cms.cup_votes (edition, device_id);

CREATE INDEX IF NOT EXISTS cup_votes_tally_idx
  ON cms.cup_votes (edition, team);

COMMENT ON TABLE cms.cup_votes IS
  'One row per device per tournament edition. Written only through cast_cup_vote(); anon has no direct access.';

-------------------------------------------------------------------------------
-- 2. Lock the table down
-------------------------------------------------------------------------------
-- Nothing reaches this table directly. Both functions below are SECURITY
-- DEFINER, which is what lets an anonymous visitor vote without the table
-- itself ever being anon-writable. This codebase has shipped an
-- anon-writable endpoint before and it is not doing it again.

-- Already granted in the baseline, repeated so this migration does not
-- depend on that having happened: without USAGE on the schema, EXECUTE on
-- the functions below is not enough and an anonymous visitor gets
-- "permission denied for schema cms" instead of a vote.
GRANT USAGE ON SCHEMA cms TO anon, authenticated, service_role;

ALTER TABLE cms.cup_votes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON cms.cup_votes FROM anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'cms' AND tablename = 'cup_votes' AND policyname = 'cup_votes_staff_read'
  ) THEN
    -- Signed-in staff can read the raw rows for review. Still no anon access.
    CREATE POLICY cup_votes_staff_read ON cms.cup_votes
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

GRANT SELECT ON cms.cup_votes TO authenticated;

-------------------------------------------------------------------------------
-- 3. Reading the tally
-------------------------------------------------------------------------------
-- Returns a row per team in `p_teams`, zero-filled, plus the total. Zero
-- filling matters: the slide draws four bars from the first frame and a
-- team nobody has voted for yet must come back as 0, not as a missing key.
--
-- Votes for a team not in `p_teams` — which can only exist if a zone was
-- renamed after votes were cast — are counted in neither the rows nor the
-- total. That is deliberate: the percentages on screen have to add to 100.

CREATE OR REPLACE FUNCTION cms.cup_poll_results(
  p_edition text,
  p_teams   text[]
)
RETURNS TABLE (team text, votes bigint, total bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = cms, public
AS $$
  WITH wanted AS (
    SELECT DISTINCT btrim(t) AS team
    FROM unnest(coalesce(p_teams, ARRAY[]::text[])) AS t
    WHERE btrim(t) <> ''
  ),
  tally AS (
    SELECT w.team, count(v.id) AS votes
    FROM wanted w
    LEFT JOIN cms.cup_votes v
      ON v.edition = btrim(p_edition)
     AND v.team = w.team
    GROUP BY w.team
  )
  SELECT t.team, t.votes, (sum(t.votes) OVER ())::bigint AS total
  FROM tally t
  ORDER BY t.team;
$$;

GRANT EXECUTE ON FUNCTION cms.cup_poll_results(text, text[]) TO anon, authenticated, service_role;

-------------------------------------------------------------------------------
-- 4. Casting one
-------------------------------------------------------------------------------
-- Returns the outcome and the fresh tally in one round trip, so the slide
-- never has to ask twice and can animate straight to the result.
--
-- A device that votes again changes its vote. That is the honest reading of
-- a tap on a different bar, and refusing it would leave the slide showing a
-- selection the tally does not agree with.

CREATE OR REPLACE FUNCTION cms.cast_cup_vote(
  p_edition   text,
  p_team      text,
  p_device_id text,
  p_teams     text[],
  p_ip_hash   text DEFAULT NULL
)
RETURNS TABLE (ok boolean, reason text)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = cms, public
AS $$
DECLARE
  v_edition text := btrim(coalesce(p_edition, ''));
  v_team    text := btrim(coalesce(p_team, ''));
BEGIN
  IF v_edition = '' OR length(v_edition) > 32 THEN
    RETURN QUERY SELECT false, 'bad_edition'::text; RETURN;
  END IF;

  IF p_device_id IS NULL OR length(p_device_id) NOT BETWEEN 8 AND 64 THEN
    RETURN QUERY SELECT false, 'bad_device'::text; RETURN;
  END IF;

  -- The team must be one the caller declared valid. The browser does not
  -- get to invent a fifth zone and have it appear in the results.
  IF v_team = '' OR NOT (v_team = ANY (
    SELECT btrim(t) FROM unnest(coalesce(p_teams, ARRAY[]::text[])) AS t
  )) THEN
    RETURN QUERY SELECT false, 'unknown_team'::text; RETURN;
  END IF;

  -- Loose on purpose — see the header. Thirty changes of mind a day from
  -- one address is a script, not a household.
  IF p_ip_hash IS NOT NULL
     AND NOT cms.consume_submission_slot('cupvote:' || p_ip_hash, 30, 86400) THEN
    RETURN QUERY SELECT false, 'rate_limited'::text; RETURN;
  END IF;

  INSERT INTO cms.cup_votes (edition, team, device_id, ip_hash)
  VALUES (v_edition, v_team, p_device_id, p_ip_hash)
  ON CONFLICT (edition, device_id) DO UPDATE
    SET team = EXCLUDED.team,
        ip_hash = coalesce(EXCLUDED.ip_hash, cup_votes.ip_hash),
        created_at = now();

  RETURN QUERY SELECT true, 'ok'::text;
END;
$$;

GRANT EXECUTE ON FUNCTION cms.cast_cup_vote(text, text, text, text[], text)
  TO anon, authenticated, service_role;
