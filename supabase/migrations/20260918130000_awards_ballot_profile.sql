-- Put the candidate profile on the ballot paper.
--
-- `awards.candidates.description` became `accomplishments` and gained
-- `profession` in the previous migration. PostgreSQL rewrites column
-- references inside views on a rename, but NOT inside function bodies —
-- plpgsql is parsed when it runs — so `awards.public_ballot` was left
-- selecting a column that no longer exists and would have failed at the
-- first request after voting opened. Replaced here.
--
-- The shape also changes: a voter now sees what the Executive Committee
-- published about a candidate rather than the sentence a member typed on
-- their phone, because that is what the briefing asks the Exco to supply.

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

  -- A wrong token is reported as such rather than quietly demoted to a
  -- public ballot: someone given the Exco link and mistyping it needs to
  -- know, not to cast a 0.6 vote believing it was a 0.4 one.
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
    -- Only sent through the Exco door, so the post list is not a thing the
    -- public page could leak by accident.
    'exco_posts', CASE WHEN v_college = 'exco' THEN COALESCE((
      SELECT jsonb_agg(p.label ORDER BY p.sort_order, p.label)
        FROM awards.exco_posts p WHERE p.edition_id = v_edition.id), '[]'::jsonb)
      ELSE '[]'::jsonb END
  );
END;
$$;

COMMENT ON FUNCTION awards.public_ballot(text, text) IS
  'The ballot paper: awards that have candidates, each candidate''s published profile, and the college the caller''s link puts them in. Never returns a tally.';
