-- Migration: cms_songs_seed
--
-- Seed 3 groups + a starter set of 4 songs. Audio URLs point at a
-- public CDN sample so the player is exercisable on a fresh install;
-- the Editor swaps them for real uploads via the admin UI.
-- Fixed UUIDs + ON CONFLICT DO NOTHING → safe to re-run.

INSERT INTO cms.song_groups (id, name, slug, description, sort_order) VALUES
  ('aaab1111-0000-0000-0000-000000000001', 'Anthems',      'anthems',
   'The SHESA anthems — sung at every AGM, every Homecoming.', 10),
  ('aaab1111-0000-0000-0000-000000000002', 'Chapter Songs', 'chapter-songs',
   'Songs written by individual chapters, from Bamenda to Berlin.', 20),
  ('aaab1111-0000-0000-0000-000000000003', 'Cultural',      'cultural',
   'Cultural pieces that anchor the annual Cultural Weekend.', 30)
ON CONFLICT (id) DO NOTHING;

-- Placeholder audio: a well-cached public MP3. Replace with self-hosted
-- uploads via the Editor UI.
INSERT INTO cms.songs
  (id, group_id, slug, title, subtitle, composer, performer, description,
   audio_url, duration_seconds, released_year, sort_order)
VALUES
  ('aaab2222-0000-0000-0000-000000000001',
   'aaab1111-0000-0000-0000-000000000001',
   'the-shesa-anthem', 'The SHESA Anthem',
   'The one every alum knows by heart',
   'SHESA Foundation Choir', 'National Choir',
   'The founding anthem — sung standing, hand on heart, at every gathering.',
   'https://cdn.pixabay.com/download/audio/2022/03/15/audio_1e6bafbbdc.mp3',
   180, 1998, 10),

  ('aaab2222-0000-0000-0000-000000000002',
   'aaab1111-0000-0000-0000-000000000001',
   'homecoming-hymn', 'Homecoming Hymn',
   'For the ones who came back',
   'B. Ngufor', 'National Choir',
   'The hymn the Homecoming committee opens each reunion weekend with.',
   'https://cdn.pixabay.com/download/audio/2022/10/25/audio_d0c7c6b1c8.mp3',
   215, 2005, 20),

  ('aaab2222-0000-0000-0000-000000000003',
   'aaab1111-0000-0000-0000-000000000002',
   'bamenda-branch-song', 'Bamenda, We Rise',
   'The Bamenda branch song',
   'Bamenda Cultural Group', 'Bamenda Chapter',
   'Written for the 2001 launch of the Bamenda branch; still sung at every Foundation Day.',
   'https://cdn.pixabay.com/download/audio/2023/04/13/audio_49a94dd7f0.mp3',
   238, 2001, 10),

  ('aaab2222-0000-0000-0000-000000000004',
   'aaab1111-0000-0000-0000-000000000003',
   'ndolo-la-manyaka', 'Ndolo la Manyaka',
   'A cultural weekend staple',
   'Traditional', 'Douala Chapter',
   'A Duala-language piece performed at the annual Cultural Weekend.',
   'https://cdn.pixabay.com/download/audio/2022/03/24/audio_5906fb7ab9.mp3',
   260, NULL, 10)
ON CONFLICT (id) DO NOTHING;
