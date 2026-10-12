-- Migration: cms_projects_seed
--
-- Seeds the 7 categories + 10 projects that used to ship as static
-- data in apps/web. Structured children (milestones + impact stats)
-- go into the JSONB columns as ordered arrays. Fixed UUIDs + ON
-- CONFLICT DO NOTHING → safe to re-run.

-- ── 1. Categories ──────────────────────────────────────────────────

INSERT INTO cms.project_categories (id, name, sort_order) VALUES
  ('cccc1111-0000-0000-0000-000000000001', 'Education',      10),
  ('cccc1111-0000-0000-0000-000000000002', 'Health',         20),
  ('cccc1111-0000-0000-0000-000000000003', 'Infrastructure', 30),
  ('cccc1111-0000-0000-0000-000000000004', 'Community',      40),
  ('cccc1111-0000-0000-0000-000000000005', 'Finance',        50),
  ('cccc1111-0000-0000-0000-000000000006', 'Career',         60),
  ('cccc1111-0000-0000-0000-000000000007', 'Culture',        70)
ON CONFLICT (id) DO NOTHING;

-- ── 2. Projects ────────────────────────────────────────────────────

INSERT INTO cms.projects
  (id, slug, title, short_description, description_html, banner_url,
   status, started_on, location, lead, is_featured,
   funding_raised, funding_target, funding_currency,
   milestones, impact_stats)
VALUES
  -- Endowment Fund (Finance, Fundraising, featured)
  ('cccc2222-0000-0000-0000-000000000001', 'endowment-fund',
   'SHESA Endowment Fund',
   'Building a permanent capital base to fund SHESA missions in perpetuity.',
   '<p>The Endowment Fund is the association''s long-horizon answer to short-term fundraising fatigue. Instead of raising money project-by-project, we build a permanent capital base and fund every future initiative from the income it generates.</p>'
   || '<p>The target is XAF 500 million by the end of 2028. Every gift, however small, is invested in a diversified low-volatility portfolio managed by an independent trustee committee.</p>'
   || '<p>Contributors receive an annual statement of the fund''s performance, along with a breakdown of the missions it funded that year. Full transparency is not negotiable.</p>',
   '/hero_two.jpg',
   'Fundraising', 'January 2024', 'National', 'Mrs. Tanyi Bih, Treasurer', TRUE,
   178000000, 500000000, 'XAF',
   '[
     {"date":"Jan 2024","title":"Fund constituted","body":"Trust deed signed. Independent trustees appointed.","done":true},
     {"date":"Jun 2024","title":"First XAF 100M crossed","body":"Milestone marked with a donor recognition dinner in Yaoundé.","done":true},
     {"date":"Nov 2024","title":"Diaspora giving activated","body":"Online giving channel launched for USA, Canada, UK, and EU donors.","done":true},
     {"date":"Nov 2026","title":"XAF 300M target","body":"The AGM-year milestone. Announcement scheduled for the Yaoundé assembly."},
     {"date":"Dec 2028","title":"Full XAF 500M target","body":"The endowment fund is self-sustaining and closed to further fundraising."}
   ]'::jsonb,
   '[
     {"value":"35%","label":"To goal"},
     {"value":"820+","label":"Contributors"},
     {"value":"12","label":"Diaspora chapters giving"}
   ]'::jsonb),

  -- Alumni Scholarship Programme (Education, Active)
  ('cccc2222-0000-0000-0000-000000000002', 'scholarship-programme',
   'Alumni Scholarship Programme',
   'Sending the brightest students to school on the shoulders of alumni who came before.',
   '<p>The scholarship programme underwrites tuition, boarding, and books for high-performing SHESA-aligned students whose families cannot fully bear the cost. Awards range from partial to full, depending on need.</p>'
   || '<p>Selection is handled by the Programs Committee against strict academic and character criteria. The programme is fully anonymised — donors do not choose recipients, and recipients do not know their donors unless both parties opt in.</p>'
   || '<p>Since its formal launch in 2016, the programme has grown from 8 awards a year to 38 in 2024 — the largest cohort to date.</p>',
   '/hero_three.jpg',
   'Active', 'September 2016', 'National + diaspora', 'Dr. Chi Emmanuel, Programs Secretary', TRUE,
   NULL, NULL, NULL,
   '[
     {"date":"Sep 2016","title":"Programme launched","body":"First cohort of 8 recipients.","done":true},
     {"date":"2020","title":"20 awards a year milestone","done":true},
     {"date":"2024","title":"38-award record cohort","done":true},
     {"date":"2028","title":"Expand to 60 awards / year","body":"Linked to endowment fund performance."}
   ]'::jsonb,
   '[
     {"value":"1,850+","label":"Scholarships awarded"},
     {"value":"38","label":"2024 cohort"},
     {"value":"92%","label":"University matriculation rate"}
   ]'::jsonb),

  -- School Infrastructure Renewal (Infrastructure, Ongoing)
  ('cccc2222-0000-0000-0000-000000000003', 'infrastructure-renewal',
   'School Infrastructure Renewal',
   'Restoring the halls, labs, and libraries that shaped generations of SHESA scholars.',
   '<p>A rolling programme to restore, repair, and modernise the physical fabric of Sacred Heart College — with the school''s Board and the parent-teacher association as full partners.</p>'
   || '<p>The pipeline includes classroom blocks, the science laboratories, the library, staff quarters, and the sports pitches. Each intervention is scoped, quoted, and audited independently.</p>'
   || '<p>The most recent completed project was the restoration of the West Wing classroom block — funded by two diaspora chapters and matched by the endowment income for the year.</p>',
   '/hero_four.jpg',
   'Ongoing', 'March 2019', 'Sacred Heart College, Mankon', 'Eng. Foncha Blaise, Bafoussam Branch', FALSE,
   NULL, NULL, NULL,
   '[
     {"date":"2019","title":"West Dorm restoration","done":true},
     {"date":"2021","title":"Chapel repairs","done":true},
     {"date":"2023","title":"Science labs upgrade","done":true},
     {"date":"2024","title":"West Wing classroom block","done":true},
     {"date":"2026","title":"Library modernisation","body":"Fundraising in progress."},
     {"date":"2028","title":"Sports facilities"}
   ]'::jsonb,
   '[
     {"value":"4","label":"Blocks restored"},
     {"value":"XAF 220M","label":"Deployed"},
     {"value":"3,400+","label":"Students impacted"}
   ]'::jsonb),

  -- Community Health Outreach (Health, Active)
  ('cccc2222-0000-0000-0000-000000000004', 'health-outreach',
   'Community Health Outreach',
   'Free consultations, screenings, and specialist care in underserved communities.',
   '<p>A rolling programme of medical outreach drives coordinated by the Welfare Portfolio in partnership with alumni doctors, nurses, and pharmacists.</p>'
   || '<p>Each drive lasts three to five days and includes general consultations, chronic-disease screenings (hypertension, diabetes, glaucoma), and specialist referrals for cases beyond primary-care scope.</p>'
   || '<p>Since 2021 the programme has served over 12,000 residents across six regions. Bamenda alone has been visited three times.</p>',
   '/hero_five.jpg',
   'Active', 'March 2021', 'Rotating (Bamenda, Buea, Kumba, Ndop)', 'Mrs. Nkeng Josephine, Welfare Secretary', TRUE,
   NULL, NULL, NULL,
   '[
     {"date":"Mar 2021","title":"First drive · Bamenda","body":"The template for everything that followed.","done":true},
     {"date":"2022–2024","title":"Regional expansion","body":"Buea, Kumba, Ndop added to the rotation.","done":true},
     {"date":"Dec 2026","title":"Bamenda return","body":"The Q4 drive."},
     {"date":"2027","title":"Specialist wing pilot","body":"Adding vision and dental care."}
   ]'::jsonb,
   '[
     {"value":"12,300+","label":"Consultations delivered"},
     {"value":"15","label":"Alumni volunteers per drive"},
     {"value":"6","label":"Regions reached"}
   ]'::jsonb),

  -- Digital Library Initiative (Education, Planning)
  ('cccc2222-0000-0000-0000-000000000005', 'digital-library',
   'Digital Library Initiative',
   'A global digital archive of SHESA academic resources — open to students everywhere.',
   '<p>A long-planned initiative to digitise every academic resource ever printed by or for SHESA students — from past exam papers to lecture notes, from staff-produced handbooks to the college magazine archive.</p>'
   || '<p>Full-text search, subject filters, and download. Access is free for SHESA students and alumni; a modest subscription supports upkeep and scanning for non-alumni users.</p>'
   || '<p>Design and scope work is complete. The build phase is fundraising-dependent.</p>',
   '/hero_one.jpg',
   'Planning', 'Planning · Q3 2025', 'Cloud-hosted', 'Mr. Fru Wilson, Communications Secretary', FALSE,
   NULL, NULL, NULL,
   '[
     {"date":"Q3 2025","title":"Design + scope","done":true},
     {"date":"Q4 2025","title":"Fundraising launched"},
     {"date":"Q2 2026","title":"Digitisation begins"},
     {"date":"Q4 2026","title":"Public beta"},
     {"date":"Q1 2027","title":"Full launch"}
   ]'::jsonb,
   '[
     {"value":"~40k","label":"Documents identified"},
     {"value":"6","label":"Decades of coverage"}
   ]'::jsonb),

  -- Career Mentorship Platform (Career, Ongoing)
  ('cccc2222-0000-0000-0000-000000000006', 'mentorship-platform',
   'Career Mentorship Platform',
   'Connecting graduating scholars with alumni mentors across industries and continents.',
   '<p>A structured mentorship pairing between graduating scholars and mid- to senior-career alumni. Each pairing runs for 12 months and includes a monthly check-in, one professional introduction, and access to the alumni knowledge base.</p>'
   || '<p>Pairings are made by the Programs Committee based on the mentee''s stated interests, the mentor''s expertise, and geography where relevant.</p>'
   || '<p>The platform launched in beta in 2023 and has since seen 320 successful pairings.</p>',
   '/hero_two.jpg',
   'Ongoing', 'August 2023', 'National + diaspora', 'Mr. Tanyi Peter, Youth Coordinator', FALSE,
   NULL, NULL, NULL,
   '[
     {"date":"Aug 2023","title":"Beta launch","done":true},
     {"date":"Jun 2024","title":"200 pairings","done":true},
     {"date":"Feb 2025","title":"Full platform launch"},
     {"date":"Q4 2026","title":"500 pairings target"}
   ]'::jsonb,
   '[
     {"value":"320+","label":"Mentorship pairings"},
     {"value":"87%","label":"Programme completion rate"},
     {"value":"45+","label":"Industries represented"}
   ]'::jsonb),

  -- Girls' School Renovation (Infrastructure, Completed)
  ('cccc2222-0000-0000-0000-000000000007', 'girls-school-renovation',
   'Girls'' School Renovation',
   'A joint SHESA-Community project — two classroom blocks and a small library, restored end to end.',
   '<p>Rehabilitation of two classroom blocks and the establishment of the Sister Mary Library at St. Bernadette Girls'' School — a joint project of SHESA, the school''s parent-teacher association, and the local council.</p>'
   || '<p>The project was funded by contributions from three diaspora chapters and matched by the Community Investment Fund. Total spend: XAF 42 million over 14 months.</p>'
   || '<p>A formal handover ceremony took place in February 2026. The library has since become the primary study space for over 300 students.</p>',
   '/hero_three.jpg',
   'Completed', 'December 2024', 'St. Bernadette Girls'' School', 'Diaspora Coordination', FALSE,
   NULL, NULL, NULL,
   '[
     {"date":"Dec 2024","title":"Project scoped + funded","done":true},
     {"date":"Sep 2025","title":"Construction complete","done":true},
     {"date":"Feb 2026","title":"Handover ceremony","done":true}
   ]'::jsonb,
   '[
     {"value":"2","label":"Classroom blocks"},
     {"value":"1","label":"Library established"},
     {"value":"300+","label":"Students now served"}
   ]'::jsonb),

  -- Alumni Business Incubator (Career, Planning)
  ('cccc2222-0000-0000-0000-000000000008', 'business-incubator',
   'Alumni Business Incubator',
   'A structured incubator for early-stage founders in the SHESA network.',
   '<p>A structured incubator for early-stage founders — pre-seed to seed — who are alumni of the college. The programme includes 12 weeks of workshops, weekly office hours with experienced founders, and access to a pool of angel checks contributed by senior alumni.</p>'
   || '<p>Each cohort will accept 8 founders. The first cohort is planned to launch in early 2027.</p>',
   '/hero_four.jpg',
   'Planning', 'Design · Q1 2026', 'Douala (in person)', 'Alumni Business Forum', FALSE,
   NULL, NULL, NULL,
   '[
     {"date":"Q1 2026","title":"Curriculum + partner network","done":true},
     {"date":"Q3 2026","title":"Angel pool constituted"},
     {"date":"Q1 2027","title":"Cohort 1 launches"}
   ]'::jsonb,
   '[
     {"value":"8","label":"Founders per cohort (planned)"}
   ]'::jsonb),

  -- Cultural Preservation Fund (Culture, Fundraising)
  ('cccc2222-0000-0000-0000-000000000009', 'cultural-preservation',
   'Cultural Preservation Fund',
   'Preserving the songs, traditions, and folklore of the SHESA experience.',
   '<p>A dedicated fund to record, archive, and reissue the songs, chants, and traditions that make up the SHESA cultural inheritance — from the anthems that still ring in every reunion to the parade chants only certain classes remember.</p>'
   || '<p>The fund also supports the annual Cultural Night at each AGM, and underwrites the traditional dance troupes and choral groups that appear at official events.</p>',
   '/hero_five.jpg',
   'Fundraising', 'October 2025', 'National', 'Mr. Achu Jean, Publicity Secretary', FALSE,
   12500000, 60000000, 'XAF',
   '[
     {"date":"Oct 2025","title":"Fund constituted","done":true},
     {"date":"2026","title":"First 25 songs recorded + released"},
     {"date":"2027","title":"Public archive launched"}
   ]'::jsonb,
   '[
     {"value":"18","label":"Songs archived so far"},
     {"value":"4","label":"Traditions documented"}
   ]'::jsonb),

  -- Emergency Relief Fund (Community, Active)
  ('cccc2222-0000-0000-0000-000000000010', 'emergency-relief',
   'Emergency Relief Fund',
   'Rapid financial and material support for alumni and their families in crisis.',
   '<p>A standing fund that can be deployed within 48 hours for confirmed cases of medical emergency, natural disaster, or acute loss affecting Shesans and their immediate family.</p>'
   || '<p>Requests are triaged by a small standing committee. Disbursements are capped per case and recorded transparently in the annual welfare report.</p>'
   || '<p>Since its constitution in 2022 the fund has responded to 47 confirmed cases.</p>',
   '/hero_one.jpg',
   'Active', 'April 2022', 'National + diaspora', 'Welfare Portfolio', FALSE,
   NULL, NULL, NULL,
   '[
     {"date":"Apr 2022","title":"Fund constituted","done":true},
     {"date":"Dec 2024","title":"25th disbursement","done":true},
     {"date":"Nov 2025","title":"47th disbursement","done":true}
   ]'::jsonb,
   '[
     {"value":"47","label":"Cases supported"},
     {"value":"48 hrs","label":"Median response"}
   ]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ── 3. Category assignments (single primary category per project) ───

INSERT INTO cms.project_categories_map (project_id, category_id) VALUES
  ('cccc2222-0000-0000-0000-000000000001', 'cccc1111-0000-0000-0000-000000000005'), -- Endowment    → Finance
  ('cccc2222-0000-0000-0000-000000000002', 'cccc1111-0000-0000-0000-000000000001'), -- Scholarships → Education
  ('cccc2222-0000-0000-0000-000000000003', 'cccc1111-0000-0000-0000-000000000003'), -- Infra        → Infrastructure
  ('cccc2222-0000-0000-0000-000000000004', 'cccc1111-0000-0000-0000-000000000002'), -- Health       → Health
  ('cccc2222-0000-0000-0000-000000000005', 'cccc1111-0000-0000-0000-000000000001'), -- DigLib       → Education
  ('cccc2222-0000-0000-0000-000000000006', 'cccc1111-0000-0000-0000-000000000006'), -- Mentorship   → Career
  ('cccc2222-0000-0000-0000-000000000007', 'cccc1111-0000-0000-0000-000000000003'), -- Girls        → Infrastructure
  ('cccc2222-0000-0000-0000-000000000008', 'cccc1111-0000-0000-0000-000000000006'), -- Incubator    → Career
  ('cccc2222-0000-0000-0000-000000000009', 'cccc1111-0000-0000-0000-000000000007'), -- Culture      → Culture
  ('cccc2222-0000-0000-0000-000000000010', 'cccc1111-0000-0000-0000-000000000004')  -- Emergency    → Community
ON CONFLICT DO NOTHING;
