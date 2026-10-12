-- Migration: cms_articles_seed
--
-- Seeds the 9 articles + 4 category tags from what the web app used
-- to serve statically. Runs after the articles schema migration
-- (20260719200000). Fixed UUIDs + ON CONFLICT DO NOTHING → safe to
-- re-run.
--
-- `publish_at` values are timed relative to NOW() so demo dates look
-- fresh on any test install; the seed writes concrete offsets (2d,
-- 5d, 1w, 2w, …) matching the "relativeDate" strings in the old
-- static data.

-- ── Categories (curated starter set) ────────────────────────────────

INSERT INTO cms.article_categories (id, name, sort_order) VALUES
  ('bbbb1111-0000-0000-0000-000000000001', 'News',         10),
  ('bbbb1111-0000-0000-0000-000000000002', 'Announcement', 20),
  ('bbbb1111-0000-0000-0000-000000000003', 'Diaspora',     30),
  ('bbbb1111-0000-0000-0000-000000000004', 'Community',    40)
ON CONFLICT (id) DO NOTHING;

-- ── Articles ────────────────────────────────────────────────────────
-- 3-paragraph body from the old static data joined into a single HTML
-- string (each paragraph wrapped in <p>). Line breaks kept via
-- concatenation for readability of the migration file itself.

INSERT INTO cms.articles
  (id, slug, title, excerpt, content_html, banner_url,
   author_name, author_title, author_photo_url,
   status, publish_at, is_featured)
VALUES
  ('bbbb2222-0000-0000-0000-000000000001',
   'agm-2026-yaounde',
   'AGM 2026: All roads lead to Palais des Congrès, Yaoundé',
   'The 2026 Annual General Meeting is set for November 21 at Palais des Congrès, Yaoundé — an AGM like never before.',
   '<p>The National Executive is pleased to formally announce that the 2026 Annual General Meeting will take place on Saturday, November 21, 2026, at Palais des Congrès, Yaoundé. This is a moment we have been building toward for years — a convening that draws every corner of the SHESA family to a single hall.</p>'
   || '<p>Registration opens August 1. Delegates from the branches, chapters, and diaspora are asked to file preliminary intentions with the Secretary General before June 30 so that logistics, accommodation, and the Cultural Night can be planned around the true numbers.</p>'
   || '<p>This AGM will not simply revisit resolutions — it will unveil the Vision 2030 roadmap, honour lifelong service, and welcome the largest cohort of new life members in a decade. All roads, quite literally, lead to Yaoundé.</p>',
   '/hero_one.jpg',
   'The National Secretariat', 'National Secretariat', '/president_one.jpg',
   'published', NOW() - INTERVAL '2 days', TRUE),

  ('bbbb2222-0000-0000-0000-000000000002',
   'scholarship-winners-2024',
   'Scholarship winners announced for the 2024 academic year',
   'Thirty-eight scholarships awarded to Shesan-aligned students this cycle — the largest cohort in the programme.',
   '<p>This year the Alumni Scholarship Programme awarded 38 full and partial scholarships — the largest cohort since the fund was constituted. Recipients were selected across all six graduating classes and represent every region in Cameroon.</p>'
   || '<p>Notably, three recipients are the direct wards of Shesan alumni whose own studies had been supported by the fund a generation earlier. The programme now spans two full generations.</p>'
   || '<p>A ceremony to honour recipients, donors, and the awarding committee will take place in Bamenda ahead of the AGM. Donors and mentors are being contacted individually with details.</p>',
   '/hero_two.jpg',
   'Programs Secretariat', 'Programs Secretariat', '/president_two.jpg',
   'published', NOW() - INTERVAL '5 days', TRUE),

  ('bbbb2222-0000-0000-0000-000000000003',
   'health-outreach-bamenda',
   'Health outreach reaches 5,000 in Bamenda',
   'Free consultations, screenings, and referrals — the March health drive served over 5,000 residents across Mankon and its outlying areas.',
   '<p>Coordinated by the Welfare Portfolio in partnership with the Bamenda branch, the March 2026 health outreach served over 5,000 residents across Mankon and its outlying areas. The three-day drive included free consultations, blood pressure and diabetes screenings, and specialist referrals.</p>'
   || '<p>Fifteen alumni — nine medical doctors and six nurses — volunteered their time. The Regional Hospital Bamenda hosted the closing clinic, and the Chief Medical Officer commended SHESA for what he described as ''the most organised alumni-led health drive we have seen''.</p>'
   || '<p>The team will move next to Ndop in Q3, with a similar structure. Volunteers, especially specialists, are invited to sign up with the Welfare Secretary.</p>',
   '/hero_three.jpg',
   'Welfare Portfolio', 'Welfare Portfolio', '/president_one.jpg',
   'published', NOW() - INTERVAL '7 days', FALSE),

  ('bbbb2222-0000-0000-0000-000000000004',
   'new-executive-sworn-in',
   'New National Executive sworn in for 2026–2028',
   'Dr. Etonge Ambe formally sworn in as National President alongside a 17-member executive committee.',
   '<p>On February 22, at a ceremony held in Yaoundé, the incoming National Executive was formally sworn in for the 2026–2028 term. Dr. Etonge Ambe takes over as National President from Dr. Achu Samuel, who now serves as Immediate Past President.</p>'
   || '<p>The full 17-member committee spans the Executive, Council Portfolios, Coordinators, and Advisory Council. Details are published on the Leadership page.</p>'
   || '<p>The new executive has committed to a first-100-days plan focused on branch reactivation, scholarship pipeline strengthening, and preparations for the 2026 AGM.</p>',
   '/hero_four.jpg',
   'The National Secretariat', 'National Secretariat', '/president_two.jpg',
   'published', NOW() - INTERVAL '14 days', FALSE),

  ('bbbb2222-0000-0000-0000-000000000005',
   'homecoming-2024-recap',
   'Homecoming weekend 2024: a recap in numbers',
   'Two decades of memories, one long weekend — and 1,200 alumni back on the hill for it.',
   '<p>1,200 alumni. 47 batches represented. 8 diaspora chapters flying in. The 2024 Homecoming Weekend broke every prior attendance record and set a new benchmark for what the reunion can be.</p>'
   || '<p>Highlights included the intergenerational football match (the class of 1998 finally lifting the trophy), the alumni market showcase, and the candlelight vigil at the founder''s tomb.</p>'
   || '<p>Plans for Homecoming 2027 are already underway — the theme, per the Programs Secretariat, will be "Roots and Wings".</p>',
   '/hero_five.jpg',
   'Communications Secretariat', 'Communications Secretariat', '/president_one.jpg',
   'published', NOW() - INTERVAL '21 days', TRUE),

  ('bbbb2222-0000-0000-0000-000000000006',
   'toronto-chapter-launched',
   'Toronto chapter formally launched',
   'The Canada chapter now has an active hub in Toronto, joining Ottawa and Montréal.',
   '<p>Coordinated by the interim Canada Chapter Executive, the Toronto hub was formally inaugurated at a ceremony on February 3 attended by 40 alumni currently resident in the Greater Toronto Area.</p>'
   || '<p>Mr. Ndifon Blaise, who serves as the Canada Chapter President, presided over the swearing-in of the hub officers. The hub joins the existing Ottawa and Montréal groups under the Canada Chapter umbrella.</p>'
   || '<p>Alumni across Ontario are encouraged to register their presence via the Diaspora Coordinator.</p>',
   '/hero_one.jpg',
   'Diaspora Coordination', 'Diaspora Coordination', '/president_two.jpg',
   'published', NOW() - INTERVAL '30 days', FALSE),

  ('bbbb2222-0000-0000-0000-000000000007',
   'girls-school-renovation',
   'Community project: Girls'' School renovation complete',
   'A joint SHESA-Community project restores two dilapidated classroom blocks and a small library.',
   '<p>The renovation of St. Bernadette Girls'' School classroom blocks A and B is complete, along with the newly established Sister Mary Library — a joint project of SHESA, the school''s parent-teacher association, and the local council.</p>'
   || '<p>The project was funded by contributions from three diaspora chapters and matched by the Community Investment Fund. Total spend: 42 million XAF over 14 months.</p>'
   || '<p>A handover ceremony took place on February 2. Photographs are being uploaded to the gallery this week.</p>',
   '/hero_two.jpg',
   'Programs Secretariat', 'Programs Secretariat', '/president_one.jpg',
   'published', NOW() - INTERVAL '35 days', FALSE),

  ('bbbb2222-0000-0000-0000-000000000008',
   'global-summit-2027',
   'Save the date: 2027 Global Alumni Summit',
   'The next Global Summit is confirmed for October 2027 in Lagos, Nigeria.',
   '<p>Following the successful 2023 summit, the National Executive has confirmed that the 2027 Global Alumni Summit will convene in Lagos, Nigeria, from October 8–10, 2027, at the Eko Convention Centre.</p>'
   || '<p>The summit is a biennial gathering distinct from the AGM, focused on cross-chapter learning, thematic sessions, and Africa-wide policy conversations.</p>'
   || '<p>A steering committee is being constituted. Chapter presidents will receive detailed correspondence in due course.</p>',
   '/hero_three.jpg',
   'The National Secretariat', 'National Secretariat', '/president_two.jpg',
   'published', NOW() - INTERVAL '38 days', FALSE),

  ('bbbb2222-0000-0000-0000-000000000009',
   'legal-adviser-appointed',
   'Legal Adviser appointed to the National Committee',
   'Barr. Ndifon George formally joins the Advisory Council as Legal Adviser.',
   '<p>The National Executive is pleased to announce the appointment of Barr. Ndifon George as Legal Adviser to the National Committee, filling the vacancy left following the retirement of Barr. Emeritus Achu Vincent.</p>'
   || '<p>Barr. Ndifon brings over two decades of practice at the Cameroon Bar and has served the association informally for many years.</p>'
   || '<p>He assumes his role with immediate effect.</p>',
   '/hero_four.jpg',
   'The National Secretariat', 'National Secretariat', '/president_one.jpg',
   'published', NOW() - INTERVAL '45 days', FALSE)
ON CONFLICT (id) DO NOTHING;

-- ── Category maps ───────────────────────────────────────────────────

INSERT INTO cms.article_categories_map (article_id, category_id) VALUES
  ('bbbb2222-0000-0000-0000-000000000001', 'bbbb1111-0000-0000-0000-000000000002'), -- AGM → Announcement
  ('bbbb2222-0000-0000-0000-000000000002', 'bbbb1111-0000-0000-0000-000000000001'), -- Scholarships → News
  ('bbbb2222-0000-0000-0000-000000000003', 'bbbb1111-0000-0000-0000-000000000001'), -- Health → News
  ('bbbb2222-0000-0000-0000-000000000003', 'bbbb1111-0000-0000-0000-000000000004'), -- Health → Community
  ('bbbb2222-0000-0000-0000-000000000004', 'bbbb1111-0000-0000-0000-000000000002'), -- Executive → Announcement
  ('bbbb2222-0000-0000-0000-000000000005', 'bbbb1111-0000-0000-0000-000000000001'), -- Homecoming → News
  ('bbbb2222-0000-0000-0000-000000000006', 'bbbb1111-0000-0000-0000-000000000003'), -- Toronto → Diaspora
  ('bbbb2222-0000-0000-0000-000000000006', 'bbbb1111-0000-0000-0000-000000000002'), -- Toronto → Announcement
  ('bbbb2222-0000-0000-0000-000000000007', 'bbbb1111-0000-0000-0000-000000000001'), -- Girls School → News
  ('bbbb2222-0000-0000-0000-000000000007', 'bbbb1111-0000-0000-0000-000000000004'), -- Girls School → Community
  ('bbbb2222-0000-0000-0000-000000000008', 'bbbb1111-0000-0000-0000-000000000002'), -- Global Summit → Announcement
  ('bbbb2222-0000-0000-0000-000000000009', 'bbbb1111-0000-0000-0000-000000000002')  -- Legal → Announcement
ON CONFLICT DO NOTHING;
