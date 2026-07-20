-- Migration: cms_site_events_seed
--
-- Seeds the 6 starter categories + 4 flagship site events picked from
-- the static array the web app used to serve (AGM 2026 featured plus
-- two other upcoming + one past). Rest can be added by the Editor via
-- the admin UI. Fixed UUIDs + ON CONFLICT DO NOTHING → safe to re-run.

-- ── 1. Categories ──────────────────────────────────────────────────

INSERT INTO cms.site_event_categories (id, name, sort_order) VALUES
  ('dddd1111-0000-0000-0000-000000000001', 'Reunion',      10),
  ('dddd1111-0000-0000-0000-000000000002', 'Ceremony',     20),
  ('dddd1111-0000-0000-0000-000000000003', 'Community',    30),
  ('dddd1111-0000-0000-0000-000000000004', 'Cultural',     40),
  ('dddd1111-0000-0000-0000-000000000005', 'Fundraising',  50),
  ('dddd1111-0000-0000-0000-000000000006', 'Career',       60)
ON CONFLICT (id) DO NOTHING;

-- ── 2. Events ──────────────────────────────────────────────────────

INSERT INTO cms.site_events
  (id, slug, title, short_description, description_html, banner_url,
   starts_at, ends_at, location, city,
   is_featured, has_ticketing, ticket_url, ticket_price, ticket_currency,
   flyers, program, album_slug)
VALUES
  -- AGM 2026 · The Yaoundé Assembly (Reunion, FEATURED)
  ('dddd2222-0000-0000-0000-000000000001', 'agm-2026',
   'AGM 2026 · The Yaoundé Assembly',
   'The 2026 Annual General Meeting — an AGM like never before. Reunions, honours, the unveiling of Vision 2030, and the Cultural Night to close.',
   '<p>The 2026 Annual General Meeting is set for Saturday, November 21 at Palais des Congrès, Yaoundé. Every branch, every diaspora chapter, every batch — one hall.</p>'
   || '<p>Vision 2030 will be unveiled, endorsed, and set in motion. Honours will be conferred on those whose service earned them the association''s highest recognition. And the Cultural Night will close out proceedings the way only a SHESA assembly can.</p>',
   '/hero_one.jpg',
   '2026-11-21T08:00:00Z', '2026-11-21T22:00:00Z',
   'Palais des Congrès', 'Yaoundé, Cameroon',
   TRUE, TRUE, 'https://tickets.example.com/agm-2026', 15000, 'XAF',
   '["/hero_two.jpg","/hero_three.jpg","/hero_four.jpg"]'::jsonb,
   '[
     {"time":"08:00","title":"Registration & Opening Prayers","description":"Delegates check in, collect programme booklets and lanyards. Opening prayer led by the Chaplain."},
     {"time":"09:00","title":"Welcome Address","description":"Dr. Etonge Ambe, National President, opens the assembly."},
     {"time":"10:00","title":"Chapter Reports","description":"Branch and diaspora chairs present the state of their chapters for the year past."},
     {"time":"12:30","title":"Lunch & Fellowship","description":"Two hours to eat, reconnect, and set up meetings for the afternoon breakouts."},
     {"time":"14:30","title":"Vision 2030 · The Unveiling","description":"A working session to present, debate, and endorse the roadmap for the next four years."},
     {"time":"16:00","title":"Awards Ceremony","description":"Honouring lifelong service, professional excellence, and this year''s rising Shesans."},
     {"time":"18:00","title":"Family Photograph & Recess","description":"Delegates step outside for the annual group photograph, then break to change for the evening."},
     {"time":"19:30","title":"Cultural Night","description":"Formal dinner, live music, traditional dance troupes, and remarks from the honoured guests."}
   ]'::jsonb,
   NULL),

  -- Homecoming 2027 (Reunion, upcoming)
  ('dddd2222-0000-0000-0000-000000000002', 'homecoming-2027',
   'Homecoming Weekend 2027 · Roots & Wings',
   'Back to the hill for the reunion of a generation. Three days, ten thousand memories, one weekend home.',
   '<p>The 2027 Homecoming Weekend takes over Sacred Heart College for three full days of reunion, celebration, and remembrance. Every batch, every corner of the diaspora, one long weekend on the hill.</p>'
   || '<p>Registration opens six months out. Watch this space for the batch coordinator list.</p>',
   '/hero_two.jpg',
   '2027-08-13T14:00:00Z', '2027-08-15T22:00:00Z',
   'Sacred Heart College', 'Mankon · Bamenda',
   FALSE, FALSE, NULL, NULL, NULL,
   '[]'::jsonb, '[]'::jsonb, NULL),

  -- Diaspora Alumni Forum 2026 (Career, upcoming, ticketed)
  ('dddd2222-0000-0000-0000-000000000003', 'diaspora-forum-2026',
   'Diaspora Alumni Forum · Toronto 2026',
   'A cross-chapter forum for diaspora professionals — one full day of career, mentorship, and network-building.',
   '<p>The inaugural Diaspora Alumni Forum brings together senior professionals from every diaspora chapter for a day of talks, panels, and structured mentorship pairings.</p>',
   '/hero_three.jpg',
   '2026-09-19T09:00:00Z', '2026-09-19T20:00:00Z',
   'Metro Toronto Convention Centre', 'Toronto · Canada',
   FALSE, TRUE, 'https://tickets.example.com/diaspora-forum-2026', 120, 'CAD',
   '[]'::jsonb, '[]'::jsonb, NULL),

  -- Foundation Day 2023 (Ceremony, past, has gallery album)
  ('dddd2222-0000-0000-0000-000000000004', 'foundation-day-2023',
   'Foundation Day 2023',
   'Honouring the roots that hold us all — the annual Mass, the wreath at the tomb, and the alumni assembly on the hill.',
   '<p>Every February 11 we return. The morning Mass. The wreath at the founder''s tomb. The alumni assembly on the college quad. And the private lunch that closes the day.</p>',
   '/hero_five.jpg',
   '2023-02-11T08:00:00Z', '2023-02-11T18:00:00Z',
   'Sacred Heart College', 'Mankon · Bamenda',
   FALSE, FALSE, NULL, NULL, NULL,
   '[]'::jsonb, '[]'::jsonb, 'foundation-day-2023')
ON CONFLICT (id) DO NOTHING;

-- ── 3. Category assignments ────────────────────────────────────────

INSERT INTO cms.site_event_categories_map (event_id, category_id) VALUES
  ('dddd2222-0000-0000-0000-000000000001', 'dddd1111-0000-0000-0000-000000000001'), -- AGM         → Reunion
  ('dddd2222-0000-0000-0000-000000000002', 'dddd1111-0000-0000-0000-000000000001'), -- Homecoming  → Reunion
  ('dddd2222-0000-0000-0000-000000000003', 'dddd1111-0000-0000-0000-000000000006'), -- Diaspora    → Career
  ('dddd2222-0000-0000-0000-000000000004', 'dddd1111-0000-0000-0000-000000000002')  -- Foundation  → Ceremony
ON CONFLICT DO NOTHING;
