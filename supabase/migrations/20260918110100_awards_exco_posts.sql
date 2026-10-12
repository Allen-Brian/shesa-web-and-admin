-- The posts an Exco voter picks from before casting.
--
-- Seeded rather than left empty because the Exco ballot is the one the
-- secretariat reviews by hand, and a free-text post field would give them
-- "Treasurer", "treasurer" and "Nat. Treasurer" to reconcile. Editable in
-- the Voting screen afterwards — this is a starting list, not a schema.
--
-- Branch President and Country Chapter President are single entries rather
-- than one per branch: the voter types their own name beside the post, and
-- that is what identifies them.

DO $$
DECLARE
  v_edition uuid;
  v_label text;
  v_i integer := 0;
BEGIN
  SELECT id INTO v_edition FROM awards.editions WHERE slug = 'agm-2026';
  IF v_edition IS NULL THEN RETURN; END IF;

  FOREACH v_label IN ARRAY ARRAY[
    'President General',
    'Vice President General',
    'Secretary General',
    'Assistant Secretary General',
    'Treasurer General',
    'Financial Secretary',
    'Auditor',
    'Public Relations Officer',
    'Assistant Public Relations Officer',
    'Legal Adviser',
    'Provost',
    'Chaplain',
    'Director of Socials',
    'Director of Sports',
    'Director of Projects',
    'Welfare Officer',
    'Ex-Officio',
    'Branch President',
    'Country Chapter President'
  ]
  LOOP
    v_i := v_i + 1;
    INSERT INTO awards.exco_posts (edition_id, label, sort_order)
    SELECT v_edition, v_label, v_i
     WHERE NOT EXISTS (
       SELECT 1 FROM awards.exco_posts p
        WHERE p.edition_id = v_edition AND lower(btrim(p.label)) = lower(v_label));
  END LOOP;
END $$;
