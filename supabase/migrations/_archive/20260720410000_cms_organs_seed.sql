-- Migration: cms_organs_seed
--
-- Seed 4 sectors + a starter set of organs so the public page renders
-- something on a fresh install. The Editor fills in the rest via the
-- admin UI. Fixed UUIDs + ON CONFLICT DO NOTHING → safe to re-run.

-- ── 1. Sectors ─────────────────────────────────────────────────────

INSERT INTO cms.organ_sectors (id, name, slug, description, sort_order) VALUES
  ('ffff1111-0000-0000-0000-000000000001', 'National (Cameroon)', 'national-cameroon',
    'The national body and the regional branches inside Cameroon.', 10),
  ('ffff1111-0000-0000-0000-000000000002', 'West Africa', 'west-africa',
    'SHESA chapters across the West-African diaspora.', 20),
  ('ffff1111-0000-0000-0000-000000000003', 'Europe', 'europe',
    'European chapters — from Berlin to Paris to London.', 30),
  ('ffff1111-0000-0000-0000-000000000004', 'North America', 'north-america',
    'US and Canadian chapters.', 40)
ON CONFLICT (id) DO NOTHING;

-- ── 2. Organs ─────────────────────────────────────────────────────

INSERT INTO cms.organs
  (id, sector_id, slug, name, short_name, location, country, founded_year,
   member_count, description, contact_email, sort_order)
VALUES
  -- National (Cameroon)
  ('ffff2222-0000-0000-0000-000000000001',
   'ffff1111-0000-0000-0000-000000000001',
   'shesa-national', 'SHESA National', 'National',
   'Yaoundé', 'Cameroon', 1998, 1240,
   'The national body — coordinates the branches across Cameroon and represents SHESA at every AGM.',
   'national@shesaconnect.com', 10),

  ('ffff2222-0000-0000-0000-000000000002',
   'ffff1111-0000-0000-0000-000000000001',
   'branch-bamenda', 'Bamenda Branch', 'Bamenda',
   'Bamenda', 'Cameroon', 2001, 320,
   'The North-West chapter — home to Foundation Day 2023 and the health-outreach programme.',
   'bamenda@shesaconnect.com', 20),

  ('ffff2222-0000-0000-0000-000000000003',
   'ffff1111-0000-0000-0000-000000000001',
   'branch-douala', 'Douala Branch', 'Douala',
   'Douala', 'Cameroon', 2000, 415,
   'The Littoral chapter — largest of the Cameroon regional bodies.',
   'douala@shesaconnect.com', 30),

  ('ffff2222-0000-0000-0000-000000000004',
   'ffff1111-0000-0000-0000-000000000001',
   'branch-yaounde', 'Yaoundé Branch', 'Yaoundé',
   'Yaoundé', 'Cameroon', 2001, 380,
   'The Centre chapter — the AGM 2026 host branch.',
   'yaounde@shesaconnect.com', 40),

  -- Europe
  ('ffff2222-0000-0000-0000-000000000005',
   'ffff1111-0000-0000-0000-000000000003',
   'chapter-berlin', 'Berlin Chapter', 'Berlin',
   'Berlin', 'Germany', 2010, 62,
   'The oldest European chapter — organises the annual Cultural Weekend in June.',
   'berlin@shesaconnect.com', 10),

  ('ffff2222-0000-0000-0000-000000000006',
   'ffff1111-0000-0000-0000-000000000003',
   'chapter-london', 'London Chapter', 'London',
   'London', 'United Kingdom', 2014, 48,
   'The UK chapter — anchors the Homecoming fundraiser drives.',
   'london@shesaconnect.com', 20),

  -- North America
  ('ffff2222-0000-0000-0000-000000000007',
   'ffff1111-0000-0000-0000-000000000004',
   'chapter-usa', 'USA Chapter', 'USA',
   'Washington DC', 'United States', 2012, 84,
   'The US-wide chapter — coordinates the North-American Homecoming events.',
   'usa@shesaconnect.com', 10),

  ('ffff2222-0000-0000-0000-000000000008',
   'ffff1111-0000-0000-0000-000000000004',
   'chapter-canada', 'Canada Chapter', 'Canada',
   'Toronto', 'Canada', 2016, 36,
   'The Canadian chapter — Toronto-based, growing on the West Coast.',
   'canada@shesaconnect.com', 20)
ON CONFLICT (id) DO NOTHING;
