-- Leader profiles, branch profiles, and branch albums.
--
-- Driven by the Highlight Series call for submissions, which asks each
-- branch for: full name, branch, profession, current member count, group
-- pictures, top three achievements over two years, and a short bio of the
-- Branch President.
--
-- That list is two records wearing one coat. Profession, bio and name
-- describe a *person*; member count, pictures and achievements describe a
-- *branch*. They are split accordingly, because the president is already
-- on the site once — the Leadership page renders them — and a second copy
-- of their biography stored on the branch would be a second copy to keep
-- correct. `organ_id` links the two instead.
--
--   cms.branch_leaders.organ_id  → cms.organs.id
--   cms.gallery_albums.linked_organ_id → cms.organs.id
--
-- The album link mirrors `linked_event_id`, which already does exactly
-- this job for site events. Reusing albums means the group pictures get
-- ordering, captions, covers and the existing Gallery editor for free,
-- rather than a second uploader that would have to grow all of it again.

-------------------------------------------------------------------------------
-- 1. Person: the profile behind a name on the Leadership page
-------------------------------------------------------------------------------
-- All four leader tables, not just branches. They are rendered by the same
-- page through the same card, and a profile that exists for a branch
-- president but not for the Secretary General would be an odd gap to
-- explain later.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'mainstream_leaders', 'branch_leaders', 'diaspora_leaders', 'batch_leaders'
  ] LOOP
    EXECUTE format('ALTER TABLE cms.%I ADD COLUMN IF NOT EXISTS profession text', t);
    EXECUTE format('ALTER TABLE cms.%I ADD COLUMN IF NOT EXISTS bio text', t);
    EXECUTE format('ALTER TABLE cms.%I ADD COLUMN IF NOT EXISTS email text', t);
    EXECUTE format('ALTER TABLE cms.%I ADD COLUMN IF NOT EXISTS phone text', t);

    -- Bounded so a public-facing text column cannot be used as storage.
    -- 4000 is a long biography and a short essay; nothing legitimate here
    -- reaches it.
    EXECUTE format(
      'ALTER TABLE cms.%I DROP CONSTRAINT IF EXISTS %I',
      t, t || '_bio_len'
    );
    EXECUTE format(
      'ALTER TABLE cms.%I ADD CONSTRAINT %I CHECK (char_length(bio) <= 4000)',
      t, t || '_bio_len'
    );
  END LOOP;
END $$;

COMMENT ON COLUMN cms.branch_leaders.bio IS
  'Short profile shown in the leader modal on the public Leadership page, and on the branch page.';
COMMENT ON COLUMN cms.branch_leaders.email IS
  'Published publicly. Only fill this in where the holder has agreed to it being on an open page.';

-------------------------------------------------------------------------------
-- 2. Branch: who leads it
-------------------------------------------------------------------------------
-- An explicit foreign key rather than matching `branch_name` against
-- `organs.name`. The two are typed by different editors on different
-- screens and already disagree in case and punctuation ("Buea Branch" vs
-- "Buea"), so a join on text would work until the day it quietly did not.
--
-- SET NULL rather than CASCADE: deleting a branch should not delete the
-- record of the person who led it.

ALTER TABLE cms.branch_leaders
  ADD COLUMN IF NOT EXISTS organ_id uuid;
ALTER TABLE cms.diaspora_leaders
  ADD COLUMN IF NOT EXISTS organ_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'branch_leaders_organ_id_fkey'
  ) THEN
    ALTER TABLE cms.branch_leaders
      ADD CONSTRAINT branch_leaders_organ_id_fkey
      FOREIGN KEY (organ_id) REFERENCES cms.organs(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'diaspora_leaders_organ_id_fkey'
  ) THEN
    ALTER TABLE cms.diaspora_leaders
      ADD CONSTRAINT diaspora_leaders_organ_id_fkey
      FOREIGN KEY (organ_id) REFERENCES cms.organs(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS branch_leaders_organ_idx   ON cms.branch_leaders (organ_id);
CREATE INDEX IF NOT EXISTS diaspora_leaders_organ_idx ON cms.diaspora_leaders (organ_id);

-------------------------------------------------------------------------------
-- 3. Branch: what it has done
-------------------------------------------------------------------------------
-- "Top 3 achievements" is an ordered short list, which is what an array
-- is. A child table would buy per-row editing and cost a join, an editor
-- screen and a sort column, for a list that is three lines long and
-- rewritten wholesale each time it changes.
--
-- The CHECK bounds the count and the total content, so the column cannot
-- become a dumping ground through a direct PostgREST write.
--
-- Total rather than per-entry because a CHECK may not contain a subquery,
-- and `unnest` needs one. `array_to_string` is immutable and gets to the
-- same place: ten entries inside five thousand characters is a highlight
-- list, and nothing longer is.

ALTER TABLE cms.organs
  ADD COLUMN IF NOT EXISTS achievements text[] NOT NULL DEFAULT '{}';

ALTER TABLE cms.organs DROP CONSTRAINT IF EXISTS organs_achievements_bounded;
ALTER TABLE cms.organs
  ADD CONSTRAINT organs_achievements_bounded CHECK (
    cardinality(achievements) <= 10
    AND char_length(array_to_string(achievements, '')) <= 5000
  );

COMMENT ON COLUMN cms.organs.achievements IS
  'Ordered highlights for the branch page. The Highlight Series asks for three; up to ten are allowed.';

-------------------------------------------------------------------------------
-- 4. Branch: its pictures
-------------------------------------------------------------------------------

ALTER TABLE cms.gallery_albums
  ADD COLUMN IF NOT EXISTS linked_organ_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gallery_albums_linked_organ_id_fkey'
  ) THEN
    ALTER TABLE cms.gallery_albums
      ADD CONSTRAINT gallery_albums_linked_organ_id_fkey
      FOREIGN KEY (linked_organ_id) REFERENCES cms.organs(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS gallery_albums_linked_organ_idx
  ON cms.gallery_albums (linked_organ_id)
  WHERE linked_organ_id IS NOT NULL;

COMMENT ON COLUMN cms.gallery_albums.linked_organ_id IS
  'Ties an album to a branch or chapter, so its page can show the group pictures. Mirrors linked_event_id.';
