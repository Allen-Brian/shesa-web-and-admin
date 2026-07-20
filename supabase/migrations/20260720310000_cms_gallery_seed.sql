-- Migration: cms_gallery_seed
--
-- Seeds the 6 starter categories + 4 albums (with a handful of media
-- items each — real photo grids are added by the Editor in the admin
-- UI). One album is linked to the Foundation Day 2023 site event to
-- exercise the event↔album linkage.
-- Fixed UUIDs + ON CONFLICT DO NOTHING → safe to re-run.

-- ── 1. Categories ──────────────────────────────────────────────────

INSERT INTO cms.gallery_album_categories (id, name, sort_order) VALUES
  ('eeee1111-0000-0000-0000-000000000001', 'AGM',        10),
  ('eeee1111-0000-0000-0000-000000000002', 'Homecoming', 20),
  ('eeee1111-0000-0000-0000-000000000003', 'Ceremony',   30),
  ('eeee1111-0000-0000-0000-000000000004', 'Community',  40),
  ('eeee1111-0000-0000-0000-000000000005', 'Cultural',   50),
  ('eeee1111-0000-0000-0000-000000000006', 'Summit',     60)
ON CONFLICT (id) DO NOTHING;

-- ── 2. Albums ──────────────────────────────────────────────────────

INSERT INTO cms.gallery_albums
  (id, slug, title, date_label, location, description, cover_url,
   photographer, linked_event_id, sort_order)
VALUES
  ('eeee2222-0000-0000-0000-000000000001', 'agm-2024', 'AGM 2024',
   'November 2024', 'Ayaba Hotel · Bamenda',
   'The biggest AGM in a decade — and just the warm-up for what comes next in Yaoundé.',
   '/hero_three.jpg', 'Ndifon Peter', NULL, 10),

  ('eeee2222-0000-0000-0000-000000000002', 'homecoming-2024', 'Homecoming Weekend 2024',
   'August 2024', 'SHESA Campus · Buea',
   'Two decades of memories, one long, unforgettable weekend on the hill.',
   '/hero_one.jpg', 'The Media Team', NULL, 20),

  ('eeee2222-0000-0000-0000-000000000003', 'scholarship-gala-2023', 'Scholarship Gala 2023',
   'December 2023', 'Hilton Hotel · Yaoundé',
   'Honouring the next generation of Shesa scholars, and the donors behind them.',
   '/hero_five.jpg', NULL, NULL, 30),

  ('eeee2222-0000-0000-0000-000000000004', 'foundation-day-2023', 'Foundation Day 2023',
   'February 2023', 'Sacred Heart College · Mankon',
   'The day we honour the roots that hold us all — Mass, wreath, and the alumni assembly.',
   '/hero_two.jpg', NULL,
   'dddd2222-0000-0000-0000-000000000004', -- links to the Foundation Day 2023 site event
   40)
ON CONFLICT (id) DO NOTHING;

-- ── 3. Category assignments ────────────────────────────────────────

INSERT INTO cms.gallery_album_categories_map (album_id, category_id) VALUES
  ('eeee2222-0000-0000-0000-000000000001', 'eeee1111-0000-0000-0000-000000000001'), -- AGM
  ('eeee2222-0000-0000-0000-000000000002', 'eeee1111-0000-0000-0000-000000000002'), -- Homecoming
  ('eeee2222-0000-0000-0000-000000000003', 'eeee1111-0000-0000-0000-000000000003'), -- Ceremony
  ('eeee2222-0000-0000-0000-000000000004', 'eeee1111-0000-0000-0000-000000000003')  -- Ceremony
ON CONFLICT DO NOTHING;

-- ── 4. Media items — a handful of photos per album ────────────────
-- The real grids get populated by the Editor via the admin UI. A
-- small starter set makes the public grid non-empty on a fresh install.

INSERT INTO cms.gallery_media
  (id, album_id, kind, src, poster_url, alt, aspect, sort_order)
VALUES
  -- AGM 2024
  ('eeee3333-0000-0000-0000-000000000001', 'eeee2222-0000-0000-0000-000000000001', 'photo', '/hero_three.jpg', NULL, 'AGM 2024 · 1', '4/3',  10),
  ('eeee3333-0000-0000-0000-000000000002', 'eeee2222-0000-0000-0000-000000000001', 'photo', '/hero_one.jpg',   NULL, 'AGM 2024 · 2', '3/2',  20),
  ('eeee3333-0000-0000-0000-000000000003', 'eeee2222-0000-0000-0000-000000000001', 'photo', '/hero_two.jpg',   NULL, 'AGM 2024 · 3', '2/3',  30),
  ('eeee3333-0000-0000-0000-000000000004', 'eeee2222-0000-0000-0000-000000000001', 'photo', '/hero_four.jpg',  NULL, 'AGM 2024 · 4', '3/4',  40),
  -- Homecoming 2024
  ('eeee3333-0000-0000-0000-000000000005', 'eeee2222-0000-0000-0000-000000000002', 'photo', '/hero_one.jpg',   NULL, 'Homecoming 2024 · 1', '4/3', 10),
  ('eeee3333-0000-0000-0000-000000000006', 'eeee2222-0000-0000-0000-000000000002', 'photo', '/hero_five.jpg',  NULL, 'Homecoming 2024 · 2', '3/2', 20),
  ('eeee3333-0000-0000-0000-000000000007', 'eeee2222-0000-0000-0000-000000000002', 'photo', '/president_one.jpg', NULL, 'Homecoming 2024 · 3', '1/1', 30),
  -- Scholarship Gala 2023
  ('eeee3333-0000-0000-0000-000000000008', 'eeee2222-0000-0000-0000-000000000003', 'photo', '/hero_five.jpg',  NULL, 'Scholarship Gala · 1', '4/3', 10),
  ('eeee3333-0000-0000-0000-000000000009', 'eeee2222-0000-0000-0000-000000000003', 'photo', '/president_two.jpg', NULL, 'Scholarship Gala · 2', '1/1', 20),
  -- Foundation Day 2023
  ('eeee3333-0000-0000-0000-00000000000a', 'eeee2222-0000-0000-0000-000000000004', 'photo', '/hero_two.jpg',   NULL, 'Foundation Day · 1', '3/2', 10),
  ('eeee3333-0000-0000-0000-00000000000b', 'eeee2222-0000-0000-0000-000000000004', 'photo', '/hero_three.jpg', NULL, 'Foundation Day · 2', '3/4', 20)
ON CONFLICT (id) DO NOTHING;
