-- Migration: cms_leadership_seed
--
-- Seeds the four Leadership strips (4 sectors + 17 mainstream + 8
-- branches + 8 diaspora + 67 batches) that the public website's
-- Leadership page renders. Data mirrors the placeholder arrays that
-- lived in the web app before it started reading from the `cms`
-- schema. This migration is the one-shot inflation of those arrays
-- into the tables so the fresh-install experience matches what
-- visitors saw on the static build.
--
-- Photo paths reference `/president_one.jpg` and `/president_two.jpg`
-- shipped in both apps' public/ folders — Next.js resolves relative
-- URLs at each app's origin, so admin previews and the public site
-- both render without a bucket round-trip.
--
-- Idempotent via fixed UUIDs and ON CONFLICT DO NOTHING on every
-- INSERT; safe to re-run.

-- ── 1. Sectors ──────────────────────────────────────────────────────

INSERT INTO cms.mainstream_sectors (id, name, caption, sort_order) VALUES
  ('aaaa1111-0000-0000-0000-000000000001', 'The Executive',        'The office of the President',              10),
  ('aaaa1111-0000-0000-0000-000000000002', 'Council Portfolios',   'The working core of the association',     20),
  ('aaaa1111-0000-0000-0000-000000000003', 'Coordinators',         'Portfolios and programme leads',           30),
  ('aaaa1111-0000-0000-0000-000000000004', 'Advisory Council',     'Counsel, oversight, and stewardship',      40)
ON CONFLICT (id) DO NOTHING;

-- ── 2. Mainstream leaders (17 posts) ────────────────────────────────

INSERT INTO cms.mainstream_leaders (id, sector_id, position, name, location, photo_url, sort_order) VALUES
  -- The Executive (3)
  ('aaaa2222-0000-0000-0000-000000000001', 'aaaa1111-0000-0000-0000-000000000001', 'National President',       'Dr. Etonge Ambe',        'Yaoundé · Cameroon', '/president_one.jpg', 10),
  ('aaaa2222-0000-0000-0000-000000000002', 'aaaa1111-0000-0000-0000-000000000001', 'Vice President',           'Barr. Achu Nkeng',       'Buea · Cameroon',    '/president_two.jpg', 20),
  ('aaaa2222-0000-0000-0000-000000000003', 'aaaa1111-0000-0000-0000-000000000001', 'Secretary General',        'Eng. Ndifon Nkweta',     'Douala · Cameroon',  '/president_one.jpg', 30),
  -- Council Portfolios (4)
  ('aaaa2222-0000-0000-0000-000000000004', 'aaaa1111-0000-0000-0000-000000000002', 'Treasurer',                'Mrs. Tanyi Bih',         NULL, '/president_two.jpg', 10),
  ('aaaa2222-0000-0000-0000-000000000005', 'aaaa1111-0000-0000-0000-000000000002', 'Financial Secretary',      'Mr. Ngwa Divine',        NULL, '/president_one.jpg', 20),
  ('aaaa2222-0000-0000-0000-000000000006', 'aaaa1111-0000-0000-0000-000000000002', 'Asst. Secretary General',  'Mrs. Awasum Grace',      NULL, '/president_two.jpg', 30),
  ('aaaa2222-0000-0000-0000-000000000007', 'aaaa1111-0000-0000-0000-000000000002', 'Communications Secretary', 'Mr. Fru Wilson',         NULL, '/president_one.jpg', 40),
  -- Coordinators (5)
  ('aaaa2222-0000-0000-0000-000000000008', 'aaaa1111-0000-0000-0000-000000000003', 'Programs Secretary',       'Dr. Chi Emmanuel',       NULL, '/president_two.jpg', 10),
  ('aaaa2222-0000-0000-0000-000000000009', 'aaaa1111-0000-0000-0000-000000000003', 'Welfare Secretary',        'Mrs. Nkeng Josephine',   NULL, '/president_one.jpg', 20),
  ('aaaa2222-0000-0000-0000-00000000000a', 'aaaa1111-0000-0000-0000-000000000003', 'Publicity Secretary',      'Mr. Achu Jean',          NULL, '/president_two.jpg', 30),
  ('aaaa2222-0000-0000-0000-00000000000b', 'aaaa1111-0000-0000-0000-000000000003', 'Women''s Coordinator',     'Mrs. Fon Beatrice',      NULL, '/president_one.jpg', 40),
  ('aaaa2222-0000-0000-0000-00000000000c', 'aaaa1111-0000-0000-0000-000000000003', 'Youth Coordinator',        'Mr. Tanyi Peter',        NULL, '/president_two.jpg', 50),
  -- Advisory Council (5)
  ('aaaa2222-0000-0000-0000-00000000000d', 'aaaa1111-0000-0000-0000-000000000004', 'Legal Adviser',            'Barr. Ndifon George',    NULL, '/president_one.jpg', 10),
  ('aaaa2222-0000-0000-0000-00000000000e', 'aaaa1111-0000-0000-0000-000000000004', 'Chaplain',                 'Rev. Fr. Kwenti Anthony',NULL, '/president_two.jpg', 20),
  ('aaaa2222-0000-0000-0000-00000000000f', 'aaaa1111-0000-0000-0000-000000000004', 'Provost',                  'Mr. Bih Roland',         NULL, '/president_one.jpg', 30),
  ('aaaa2222-0000-0000-0000-000000000010', 'aaaa1111-0000-0000-0000-000000000004', 'Auditor',                  'Mr. Ngwa Charles',       NULL, '/president_two.jpg', 40),
  ('aaaa2222-0000-0000-0000-000000000011', 'aaaa1111-0000-0000-0000-000000000004', 'Immediate Past President', 'Dr. Achu Samuel',        NULL, '/president_one.jpg', 50)
ON CONFLICT (id) DO NOTHING;

-- ── 3. Branch presidents (8 rows) ───────────────────────────────────

INSERT INTO cms.branch_leaders (id, branch_name, name, region, photo_url, sort_order) VALUES
  ('aaaa3333-0000-0000-0000-000000000001', 'Yaoundé Branch',    'Mr. Neba Christian', 'Centre Region',      '/president_one.jpg', 10),
  ('aaaa3333-0000-0000-0000-000000000002', 'Douala Branch',     'Dr. Fon Emile',      'Littoral Region',    '/president_two.jpg', 20),
  ('aaaa3333-0000-0000-0000-000000000003', 'Buea Branch',       'Barr. Mbah Julius',  'South-West Region',  '/president_one.jpg', 30),
  ('aaaa3333-0000-0000-0000-000000000004', 'Bamenda Branch',    'Mr. Kum Divine',     'North-West Region',  '/president_two.jpg', 40),
  ('aaaa3333-0000-0000-0000-000000000005', 'Bafoussam Branch',  'Eng. Foncha Blaise', 'West Region',        '/president_one.jpg', 50),
  ('aaaa3333-0000-0000-0000-000000000006', 'Kumba Branch',      'Dr. Nchang Peter',   'South-West Region',  '/president_two.jpg', 60),
  ('aaaa3333-0000-0000-0000-000000000007', 'Limbe Branch',      'Mr. Fru Vincent',    'South-West Region',  '/president_one.jpg', 70),
  ('aaaa3333-0000-0000-0000-000000000008', 'Ngaoundéré Branch', 'Barr. Awasum Denis', 'Adamawa Region',     '/president_two.jpg', 80)
ON CONFLICT (id) DO NOTHING;

-- ── 4. Diaspora presidents (8 rows) ─────────────────────────────────

INSERT INTO cms.diaspora_leaders (id, branch_name, name, region, photo_url, sort_order) VALUES
  ('aaaa4444-0000-0000-0000-000000000001', 'USA Chapter',            'Dr. Chi Rodrigue',     'Washington DC · United States', '/president_one.jpg', 10),
  ('aaaa4444-0000-0000-0000-000000000002', 'Canada Chapter',         'Mr. Ndifon Blaise',    'Toronto · Canada',              '/president_two.jpg', 20),
  ('aaaa4444-0000-0000-0000-000000000003', 'United Kingdom Chapter', 'Mr. Ngwa Alfred',      'London · United Kingdom',       '/president_one.jpg', 30),
  ('aaaa4444-0000-0000-0000-000000000004', 'Germany Chapter',        'Eng. Fon Bertrand',    'Berlin · Germany',              '/president_two.jpg', 40),
  ('aaaa4444-0000-0000-0000-000000000005', 'France Chapter',         'Barr. Awasum Simon',   'Paris · France',                '/president_one.jpg', 50),
  ('aaaa4444-0000-0000-0000-000000000006', 'Belgium Chapter',        'Mr. Kum Emile',        'Brussels · Belgium',            '/president_two.jpg', 60),
  ('aaaa4444-0000-0000-0000-000000000007', 'Nigeria Chapter',        'Mr. Tanyi Michael',    'Abuja · Nigeria',               '/president_one.jpg', 70),
  ('aaaa4444-0000-0000-0000-000000000008', 'South Africa Chapter',   'Dr. Bih Christian',    'Johannesburg · South Africa',   '/president_two.jpg', 80)
ON CONFLICT (id) DO NOTHING;

-- ── 5. Batch chairs (1953-2019 = 67 rows) ───────────────────────────
-- Names are generated deterministically from the same TITLE / SURNAME /
-- GIVEN arrays that the web fallback used. Photo alternates by index.

DO $$
DECLARE
  v_titles  TEXT[]   := ARRAY['Mr.','Mr.','Dr.','Mr.','Barr.','Mr.','Eng.','Mr.'];
  v_surs    TEXT[]   := ARRAY['Ndifon','Achu','Tanyi','Fru','Kum','Ngwa','Fon','Chi',
                              'Neba','Foncha','Mbah','Nchang','Awasum','Bih','Kwenti','Nkeng'];
  v_givens  TEXT[]   := ARRAY['Peter','Julius','George','Emmanuel','Alfred','Emile',
                              'Vincent','Andrew','Christian','Herbert','Blaise','Simon',
                              'Denis','Reynolds','Michael','Bertrand','Roland','Cyrille'];
  v_year    INTEGER;
  v_i       INTEGER;
  v_uuid    UUID;
  v_name    TEXT;
  v_photo   TEXT;
BEGIN
  FOR v_year IN REVERSE 2019..1953 LOOP
    v_i     := 2019 - v_year;
    v_name  := v_titles[(v_i % 8) + 1] || ' ' ||
               v_surs  [(v_i % 16) + 1] || ' ' ||
               v_givens[((v_i * 3) % 18) + 1];
    v_photo := CASE WHEN v_i % 2 = 0 THEN '/president_one.jpg' ELSE '/president_two.jpg' END;
    -- Deterministic UUID keyed off the batch year — safe to re-run.
    v_uuid  := ('aaaa5555-0000-0000-0000-' || lpad(v_year::text, 12, '0'))::uuid;

    INSERT INTO cms.batch_leaders (id, batch, name, photo_url, sort_order)
    VALUES (v_uuid, v_year::text, v_name, v_photo, v_i * 10)
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END $$;
