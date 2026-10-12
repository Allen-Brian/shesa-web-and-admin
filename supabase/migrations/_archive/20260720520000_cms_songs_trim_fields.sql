-- Migration: cms_songs_trim_fields
--
-- Trims `cms.songs` down to the fields the Editor and the public
-- Songs page actually use. Subtitle / composer / released_year turned
-- out to be noise once we started listing real songs — the performer
-- + description already carry the story, and the year is either in
-- the title or irrelevant for anthems.

ALTER TABLE cms.songs
  DROP COLUMN IF EXISTS subtitle,
  DROP COLUMN IF EXISTS composer,
  DROP COLUMN IF EXISTS released_year;
