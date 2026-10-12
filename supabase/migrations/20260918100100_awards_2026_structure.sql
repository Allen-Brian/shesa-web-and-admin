-- The AGM 2026 cycle and its approved award structure.
--
-- Transcribed from the President General's briefing of 10 September 2026
-- (SHESA/PG/AGM2026/ACCESS/001), which states:
--
--   "The technical team shall not alter the approved categories, eligibility
--    requirements, voting weights or deadlines without written authorization
--    from the appropriate SHESA authority."
--
-- So the list lives in a migration rather than being typed into a form: it is
-- reviewable in git, and a change to it leaves a commit with a name on it.
--
-- Idempotent throughout — re-running changes nothing, and an editor's later
-- corrections through the Voting screen are not overwritten.
--
-- Category D's five batch awards are deliberately absent. The briefing
-- reserves five decade awards whose ranges SHESA has not yet named, and an
-- invented decade on a live ballot is worse than a category that is visibly
-- still being filled. The editor adds them once the ranges arrive.

DO $$
DECLARE
  v_edition uuid;
  v_professional uuid;
  v_batch uuid;
  v_name text;
  v_i integer := 0;
BEGIN
  -- 1. The cycle -------------------------------------------------------------
  --
  -- Voting runs 25 September to 25 October 2026 as the briefing directs.
  -- Nominations take the week before it: the briefing was issued on the 10th
  -- and the ballot has to be built from what comes in, so the round is short
  -- by arithmetic rather than by choice. Times carry an explicit +01 offset
  -- — SHESA runs on WAT and a deadline is meaningless in the server's zone.
  INSERT INTO awards.editions (
    slug, name, description,
    nominations_open_at, nominations_close_at,
    voting_open_at, voting_close_at)
  VALUES (
    'agm-2026',
    'SHESA Leadership Awards 2026',
    'Recognising ex-students whose work has distinguished them in their field, '
      || 'and the branches, chapters and batches that have led by example. '
      || 'Nominated by the membership, elected by a weighted vote, presented at AGM 2026.',
    timestamptz '2026-09-18 12:00:00+01',
    timestamptz '2026-09-24 23:59:59+01',
    timestamptz '2026-09-25 00:00:00+01',
    timestamptz '2026-10-25 23:59:59+01')
  ON CONFLICT (slug) DO NOTHING;

  SELECT id INTO v_edition FROM awards.editions WHERE slug = 'agm-2026';

  -- 2. Categories ------------------------------------------------------------
  INSERT INTO awards.categories (edition_id, name, description, sort_order)
  SELECT v_edition, c.name, c.description, c.sort_order
    FROM (VALUES
      ('Professional Leadership Awards',
       'Twelve fields in which an ex-student has led, built or served with distinction.', 1),
      ('Batch Leadership Awards',
       'The batches whose collective contribution has carried the association forward.', 4)
    ) AS c(name, description, sort_order)
   WHERE NOT EXISTS (
     SELECT 1 FROM awards.categories x
      WHERE x.edition_id = v_edition AND x.name = c.name);

  SELECT id INTO v_professional
    FROM awards.categories
   WHERE edition_id = v_edition AND name = 'Professional Leadership Awards';

  SELECT id INTO v_batch
    FROM awards.categories
   WHERE edition_id = v_edition AND name = 'Batch Leadership Awards';

  -- 3. Category A — the twelve professional awards ---------------------------
  --
  -- Ordered as the briefing lists them, not alphabetically: the document is
  -- the reference the secretariat will read the ballot against.
  FOREACH v_name IN ARRAY ARRAY[
    'Education',
    'Agriculture',
    'Media and Telecommunications',
    'Information and Communication Technology',
    'Health',
    'Finance',
    'Politics and Public Service',
    'Religion',
    'Engineering',
    'Civil Society',
    'Legal Profession',
    'Security'
  ]
  LOOP
    v_i := v_i + 1;
    INSERT INTO awards.awards (edition_id, category_id, name, description, sort_order)
    SELECT v_edition, v_professional,
           v_name || ' Leadership Award',
           'For outstanding leadership and service in ' || v_name || '.',
           v_i
     WHERE NOT EXISTS (
       SELECT 1 FROM awards.awards a
        WHERE a.edition_id = v_edition AND a.name = v_name || ' Leadership Award');
  END LOOP;

  -- 4. Categories B and C — standalone -----------------------------------------
  --
  -- No parent heading: each is a single award, and a category of one is a
  -- heading the reader has to open to find one thing underneath it.
  INSERT INTO awards.awards (edition_id, category_id, name, description, sort_order)
  SELECT v_edition, NULL, a.name, a.description, a.sort_order
    FROM (VALUES
      ('SHESA Branch Leadership Award',
       'For the branch whose activity, cohesion and contribution has set the standard this year.',
       100),
      ('SHESA Country Chapter Leadership Award',
       'For the country chapter that has best carried SHESA beyond Cameroon.',
       101)
    ) AS a(name, description, sort_order)
   WHERE NOT EXISTS (
     SELECT 1 FROM awards.awards x
      WHERE x.edition_id = v_edition AND x.name = a.name);

  -- Category D stays empty until the decades are named. See the header.
  PERFORM v_batch;
END $$;
