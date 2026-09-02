-- =============================================================================
-- Shesa Connect — demo seed
-- =============================================================================
--
-- Everything the bootstrap seed deliberately leaves out, so a local or CI
-- database has something to look at and the pgTAP suite has fixtures.
--
-- ⚠ NEVER run this against production. It creates dev logins with published
--   passwords, fabricated members, and a year of invented payments.
--
-- Applied automatically on `supabase db reset` via config.toml's
-- `[db.seed] sql_paths`, which lists seed.sql first and this second.
-- Production takes `seed.sql` alone, by explicit psql — see
-- docs/runbooks/prod-database-reset.md.
--
-- Contents:
--   1. Networks — the five professional networks.
--   2. Sample chapters under Shesa Buea (one autonomous, one grouping).
--   3. Dev logins (@shesa.test) with global and branch-scoped grants.
--   4. Members, memberships, positions, transfers.
--   5. A year of finance activity — charges, obligations, payments.
--   6. Exco announcements and events.
--
-- ── Why networks are here and not in the bootstrap ──────────────────────────
-- The org chart is created through the Admin portal by decision, so the
-- bootstrap seeds no networks. But `core.members.network_scope_id` is
-- REQUIRED — a trigger rejects any member row without one. So a database with
-- no networks cannot hold a single member, and 16 of the pgTAP files could not
-- run. They live here so local and CI work.
--
--   ⚠ The same constraint applies in production: until someone creates
--     networks through the portal, no member can be created or imported.
--     Make it the first post-reset admin task.

-- =============================================================================
-- Section 0. Sample diaspora branch — Shesa DC
-- =============================================================================
--
-- The bootstrap seeds the five founding Cameroonian branches. This adds a
-- diaspora branch so local dev exercises the non-CM path: a different country,
-- a different currency posture, and the "is this branch autonomous?" question
-- the org tree turns on. The demo memberships below reference it.

INSERT INTO core.scopes (id, name, slug, scope_type, parent_scope_id, currency_code)
VALUES
  ('00000000-0000-0000-0000-000000000012', 'Shesa DC', 'shesa-dc', 'branch',
   '00000000-0000-0000-0000-000000000001', 'USD')
ON CONFLICT (id) DO NOTHING;

INSERT INTO core.branches (
  scope_id, country_code, region, city, nickname,
  description, registration_fee_required, registration_fee_amount, registration_fee_currency
) VALUES
  ('00000000-0000-0000-0000-000000000012', 'US', 'Maryland', 'Silver Spring', 'DMV',
   'Diaspora branch covering the DC / Maryland / Virginia corridor.', TRUE, 25.00, 'USD')
ON CONFLICT (scope_id) DO NOTHING;

INSERT INTO core.scope_capabilities (
  scope_id, can_manage_members, can_have_treasury, can_create_binding_dues,
  can_have_website_page, can_have_forum, can_label_active_passive
) VALUES
  ('00000000-0000-0000-0000-000000000012', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE)
ON CONFLICT (scope_id) DO NOTHING;

-- =============================================================================
-- Section 1. Networks
-- =============================================================================
-------------------------------------------------------------------------------
-- Five seeded networks — Shesa Legal / Santé / Tech / Gov / Education —
-- replaced the earlier "Other" safety-net. Import + create-member paths
-- now require a real network; there is no fallback. Mainstream Admin can
-- add more via the create-network Edge Function.
--
-- Two rows per network: the spine in core.scopes (name = "Shesa X") and
-- the detail in core.networks (short_name = "X", icon = lucide key,
-- color_hex, sort_order). Colors picked to stay legible on the app's
-- burgundy palette in both light + dark mode.

INSERT INTO core.scopes (
  id, name, slug, scope_type, parent_scope_id, currency_code
) VALUES
  ('44444444-0000-0000-0000-000000000001', 'Shesa Legal',     'shesa-legal',
   'network', '00000000-0000-0000-0000-000000000001', 'XAF'),
  ('44444444-0000-0000-0000-000000000002', 'Shesa Santé',     'shesa-sante',
   'network', '00000000-0000-0000-0000-000000000001', 'XAF'),
  ('44444444-0000-0000-0000-000000000003', 'Shesa Tech',      'shesa-tech',
   'network', '00000000-0000-0000-0000-000000000001', 'XAF'),
  ('44444444-0000-0000-0000-000000000004', 'Shesa Gov',       'shesa-gov',
   'network', '00000000-0000-0000-0000-000000000001', 'XAF'),
  ('44444444-0000-0000-0000-000000000005', 'Shesa Education', 'shesa-education',
   'network', '00000000-0000-0000-0000-000000000001', 'XAF')
ON CONFLICT (id) DO NOTHING;

INSERT INTO core.networks (
  scope_id, short_name, description, icon, color_hex, sort_order
) VALUES
  ('44444444-0000-0000-0000-000000000001', 'Legal',
   'Barristers, solicitors, magistrates and legal scholars.',
   'Scale',         '#7C3AED', 1),
  ('44444444-0000-0000-0000-000000000002', 'Santé',
   'Doctors, nurses, pharmacists and health workers.',
   'Stethoscope',   '#E11D48', 2),
  ('44444444-0000-0000-0000-000000000003', 'Tech',
   'Engineers, developers, designers and IT professionals.',
   'Cpu',           '#0284C7', 3),
  ('44444444-0000-0000-0000-000000000004', 'Gov',
   'Public service, ministries, agencies and administration.',
   'Landmark',      '#0F766E', 4),
  ('44444444-0000-0000-0000-000000000005', 'Education',
   'Teachers, lecturers, researchers and academic staff.',
   'GraduationCap', '#D97706', 5)
ON CONFLICT (scope_id) DO NOTHING;



-- =============================================================================
-- Section 2. Sample chapters under Shesa Buea
-- =============================================================================

INSERT INTO core.scopes (
  id, name, slug, scope_type, parent_scope_id, chapter_kind, currency_code
) VALUES
  ('00000000-0000-0000-0000-000000000020', 'Buea University Chapter', 'shesa-buea-uni',
   'chapter', '00000000-0000-0000-0000-000000000010', 'autonomous', 'XAF'),
  ('00000000-0000-0000-0000-000000000021', 'Molyko Neighbourhood',    'shesa-molyko',
   'chapter', '00000000-0000-0000-0000-000000000010', 'grouping',    'XAF')
ON CONFLICT (id) DO NOTHING;

INSERT INTO core.chapters (
  scope_id, country_code, region, city, description,
  registration_fee_required, registration_fee_amount, registration_fee_currency,
  contact_email
) VALUES
  -- Autonomous chapter — carries its own registration + contact
  ('00000000-0000-0000-0000-000000000020', 'CM', 'South-West', 'Buea',
   'The university-student chapter of Shesa Buea; runs its own registration.',
   TRUE, 2000, 'XAF', 'uni@shesaconnect.com'),
  -- Grouping chapter — bare row (finance/contact slots must stay NULL)
  ('00000000-0000-0000-0000-000000000021', 'CM', 'South-West', 'Buea',
   'A neighbourhood tag for Molyko-resident Buea branch members.',
   FALSE, NULL, NULL, NULL)
ON CONFLICT (scope_id) DO NOTHING;

INSERT INTO core.scope_capabilities (
  scope_id, can_manage_members, can_have_treasury, can_create_binding_dues,
  can_have_website_page, can_have_forum, can_label_active_passive
) VALUES
  -- Autonomous — full capability set
  ('00000000-0000-0000-0000-000000000020', TRUE,  TRUE,  TRUE,  TRUE,  TRUE, TRUE),
  -- Grouping — page + forum only (per resolveScopeCapabilities in packages/domain)
  ('00000000-0000-0000-0000-000000000021', FALSE, FALSE, FALSE, TRUE,  TRUE, FALSE)
ON CONFLICT (scope_id) DO NOTHING;



-- =============================================================================
-- Section 3. Dev logins
-- =============================================================================
-- 4.1 auth.users rows
-------------------------------------------------------------------------------

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at,
  recovery_token, recovery_sent_at, email_change_token_new, email_change,
  email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, created_at, updated_at, phone, phone_confirmed_at,
  phone_change, phone_change_token, phone_change_sent_at,
  email_change_token_current, email_change_confirm_status, banned_until,
  reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at,
  is_anonymous
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '55555555-0000-0000-0000-000000000001',
    'authenticated', 'authenticated',
    'admin@shesa.test',
    crypt('password', gen_salt('bf')),
    NOW(), NULL, '', NULL,
    '', NULL, '', '',
    NULL, NULL,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Global Admin"}'::jsonb,
    FALSE, NOW(), NOW(), NULL, NULL,
    '', '', NULL,
    '', 0, NULL,
    '', NULL, FALSE, NULL,
    FALSE
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '55555555-0000-0000-0000-000000000002',
    'authenticated', 'authenticated',
    'finance@shesa.test',
    crypt('password', gen_salt('bf')),
    NOW(), NULL, '', NULL,
    '', NULL, '', '',
    NULL, NULL,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Global Finance"}'::jsonb,
    FALSE, NOW(), NOW(), NULL, NULL,
    '', '', NULL,
    '', 0, NULL,
    '', NULL, FALSE, NULL,
    FALSE
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '55555555-0000-0000-0000-000000000010',
    'authenticated', 'authenticated',
    'buea-admin@shesa.test',
    crypt('password', gen_salt('bf')),
    NOW(), NULL, '', NULL,
    '', NULL, '', '',
    NULL, NULL,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Shesa Buea Admin"}'::jsonb,
    FALSE, NOW(), NOW(), NULL, NULL,
    '', '', NULL,
    '', 0, NULL,
    '', NULL, FALSE, NULL,
    FALSE
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '55555555-0000-0000-0000-000000000011',
    'authenticated', 'authenticated',
    'buea-finance@shesa.test',
    crypt('password', gen_salt('bf')),
    NOW(), NULL, '', NULL,
    '', NULL, '', '',
    NULL, NULL,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Shesa Buea Finance"}'::jsonb,
    FALSE, NOW(), NOW(), NULL, NULL,
    '', '', NULL,
    '', 0, NULL,
    '', NULL, FALSE, NULL,
    FALSE
  ),
  (
    -- Site editor — curates public-website content (Leadership,
    -- Announcements, Events copy). Single-scope role (Mainstream only)
    -- since the public site is one property.
    '00000000-0000-0000-0000-000000000000',
    '55555555-0000-0000-0000-000000000020',
    'authenticated', 'authenticated',
    'editor@shesa.test',
    crypt('password', gen_salt('bf')),
    NOW(), NULL, '', NULL,
    '', NULL, '', '',
    NULL, NULL,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Site Editor"}'::jsonb,
    FALSE, NOW(), NOW(), NULL, NULL,
    '', '', NULL,
    '', 0, NULL,
    '', NULL, FALSE, NULL,
    FALSE
  )
ON CONFLICT (id) DO NOTHING;

-------------------------------------------------------------------------------
-- 4.2 auth.identities rows — required by GoTrue's email-provider lookup
-------------------------------------------------------------------------------
-- `provider_id` is the identity's stable id from the provider — for the
-- email provider it's the user id itself (there's no external oauth sub).
-- Recent supabase-cli versions REQUIRE this column, so we set it explicitly.

INSERT INTO auth.identities (
  provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) VALUES
  (
    '55555555-0000-0000-0000-000000000001',
    '55555555-0000-0000-0000-000000000001',
    jsonb_build_object(
      'sub',   '55555555-0000-0000-0000-000000000001',
      'email', 'admin@shesa.test',
      'email_verified', true,
      'phone_verified', false
    ),
    'email', NOW(), NOW(), NOW()
  ),
  (
    '55555555-0000-0000-0000-000000000002',
    '55555555-0000-0000-0000-000000000002',
    jsonb_build_object(
      'sub',   '55555555-0000-0000-0000-000000000002',
      'email', 'finance@shesa.test',
      'email_verified', true,
      'phone_verified', false
    ),
    'email', NOW(), NOW(), NOW()
  ),
  (
    '55555555-0000-0000-0000-000000000010',
    '55555555-0000-0000-0000-000000000010',
    jsonb_build_object(
      'sub',   '55555555-0000-0000-0000-000000000010',
      'email', 'buea-admin@shesa.test',
      'email_verified', true,
      'phone_verified', false
    ),
    'email', NOW(), NOW(), NOW()
  ),
  (
    '55555555-0000-0000-0000-000000000011',
    '55555555-0000-0000-0000-000000000011',
    jsonb_build_object(
      'sub',   '55555555-0000-0000-0000-000000000011',
      'email', 'buea-finance@shesa.test',
      'email_verified', true,
      'phone_verified', false
    ),
    'email', NOW(), NOW(), NOW()
  ),
  (
    '55555555-0000-0000-0000-000000000020',
    '55555555-0000-0000-0000-000000000020',
    jsonb_build_object(
      'sub',   '55555555-0000-0000-0000-000000000020',
      'email', 'editor@shesa.test',
      'email_verified', true,
      'phone_verified', false
    ),
    'email', NOW(), NOW(), NOW()
  )
ON CONFLICT (provider, provider_id) DO NOTHING;

-------------------------------------------------------------------------------
-- 4.3 core.profiles mirrors — 1:1 with auth.users per the app's read path
-------------------------------------------------------------------------------

INSERT INTO core.profiles (id, display_name, email, preferred_persona)
VALUES
  ('55555555-0000-0000-0000-000000000001', 'Global Admin',       'admin@shesa.test',            'exco'),
  ('55555555-0000-0000-0000-000000000002', 'Global Finance',     'finance@shesa.test',          'finance'),
  ('55555555-0000-0000-0000-000000000010', 'Shesa Buea Admin',   'buea-admin@shesa.test',       'exco'),
  ('55555555-0000-0000-0000-000000000011', 'Shesa Buea Finance', 'buea-finance@shesa.test',     'finance'),
  ('55555555-0000-0000-0000-000000000020', 'Site Editor',        'editor@shesa.test',           'editor')
ON CONFLICT (id) DO NOTHING;

-------------------------------------------------------------------------------
-- 4.4 core.role_assignments — grant the two roles globally (scope_id = NULL)
-------------------------------------------------------------------------------
-- Global Admin + Global Finance are unconditional — they reach EVERY scope
-- including autonomous chapters. A scope-bound grant at the mainstream root
-- would be clipped by autonomy on the recursive-CTE walk (see 20260702200200);
-- NULL scope bypasses that walk in `has_permission` and is the canonical
-- shape for platform-wide superuser grants.

INSERT INTO core.role_assignments (user_id, scope_id, role_id, starts_at)
VALUES
  (
    '55555555-0000-0000-0000-000000000001',
    NULL,
    '11111111-0000-0000-0000-000000000001',  -- mainstream_admin
    NOW()
  ),
  (
    '55555555-0000-0000-0000-000000000002',
    NULL,
    '11111111-0000-0000-0000-000000000004',  -- finance
    NOW()
  ),
  (
    -- Shesa Buea Admin — scoped branch_admin at Shesa Buea
    '55555555-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000010',
    '11111111-0000-0000-0000-000000000002',  -- branch_admin
    NOW()
  ),
  (
    -- Shesa Buea Finance — scoped finance at Shesa Buea.
    -- Branch-scoped finance means all M4/M6/M7 permissions (charge.create,
    -- payment.record, expense.record, etc.) resolve only at Buea's tree.
    -- The global Finance user (finance@shesa.test) has the same role at
    -- NULL scope and reaches every finance-bearing body.
    '55555555-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000010',
    '11111111-0000-0000-0000-000000000004',  -- finance
    NOW()
  ),
  (
    -- Site Editor — unscoped editor grant. `cms.edit` at NULL scope
    -- means they can curate the public-website content on the CMS
    -- surfaces (Leadership tabs, etc.). No operational-membership
    -- reach — Site Editor never touches members or finance.
    '55555555-0000-0000-0000-000000000020',
    NULL,
    '11111111-0000-0000-0000-000000000005',  -- editor
    NOW()
  )
ON CONFLICT DO NOTHING;


-- =============================================================================
-- Section 4. Members, memberships, positions, transfers
-- =============================================================================
-- Populates enough member data to exercise every Memberships surface
-- (Members table across branch / autonomous chapter / batch scopes,
-- Requests queue on Buea, Transfers queue on Buea) so the platform is
-- clickable end-to-end.
--
-- Volume:
--   ~20 members per batch across eight graduated batches
--   (2012-2019) = 160 members total. Everyone from 2020+ is still in
--   school; the platform's members are alumni only for now.
--   Every member's `member_code` is auto-generated by the BEFORE
--   INSERT trigger from migration 20260705100000 in the shape
--   {batch_year}-{initials}-{4 digits} — the seed doesn't specify
--   codes explicitly.
--   ~60 memberships at Shesa Buea (active mix), plus scatter across
--   Douala and DC.
--   ~10 pending join requests targeting Shesa Buea.
--   ~5 pending transfers from Douala/DC → Buea.
--   ~7 chapter memberships (autonomous chapter Buea University).
--
-- All rows are pseudo-random but deterministic — we seed the generator
-- with a fixed value so `supabase db reset` produces the same set every
-- time.
--
-- Idempotent via ON CONFLICT DO NOTHING on the natural keys.

DO $$
DECLARE
  v_batch          RECORD;
  v_member_id      UUID;
  v_house_id       UUID;
  v_network_id     UUID;
  v_member_num     INTEGER;
  v_house_ids      UUID[] := ARRAY[
    '33333333-0000-0000-0000-000000000001'::uuid, -- St Thomas
    '33333333-0000-0000-0000-000000000002'::uuid, -- St Peter
    '33333333-0000-0000-0000-000000000003'::uuid, -- St Francis
    '33333333-0000-0000-0000-000000000004'::uuid  -- St John
  ];
  v_network_ids    UUID[];
  v_first_names    TEXT[] := ARRAY[
    'Ada','Bola','Chidi','Dele','Emeka','Femi','Gozie','Hauwa','Ifeanyi','Junaid',
    'Kemi','Lola','Mumbi','Ngozi','Obiora','Peter','Rita','Sade','Tunde','Uche',
    'Victor','Wale','Yemi','Zainab','Abel','Beatrice','Constance','Damaris','Eve','Faith'
  ];
  v_last_names     TEXT[] := ARRAY[
    'Achieng','Bekele','Cissé','Diallo','Effiong','Fokou','Gueye','Habimana','Iwuoha','Jama',
    'Kamau','Lumumba','Mbeki','Nkomo','Okafor','Petero','Quansah','Robi','Songha','Traoré',
    'Ubomba','Vieira','Wangui','Xoliswa','Yaw','Zulu','Achebe','Balogun','Chukwuma','Diop'
  ];
  v_countries      TEXT[] := ARRAY['CM','CM','CM','CM','US','GB','FR','NG','GH','ZA'];
  v_cities         TEXT[] := ARRAY['Buea','Douala','Yaoundé','Bamenda','New York','London','Paris','Lagos','Accra','Johannesburg'];
  v_regions        TEXT[] := ARRAY['South-West','Littoral','Centre','North-West','New York','England','Île-de-France','Lagos','Greater Accra','Gauteng'];
  v_buea_id        UUID := '00000000-0000-0000-0000-000000000010';
  v_douala_id      UUID := '00000000-0000-0000-0000-000000000011';
  v_dc_id          UUID := '00000000-0000-0000-0000-000000000012';
  v_buea_uni_id    UUID := '00000000-0000-0000-0000-000000000020';
  v_membership_id  UUID;
  v_pick           INTEGER;
  v_country_idx    INTEGER;
BEGIN
  -- Deterministic randomness
  PERFORM setseed(0.4242);

  -- Cache the seeded network ids in an array (5 networks in the seed).
  SELECT ARRAY(SELECT id FROM core.scopes WHERE scope_type = 'network' ORDER BY slug)
    INTO v_network_ids;

  -- Iterate eight graduated batches: 2012 through 2019.
  -- Batches 2020+ are still in school — they have batch scopes but no
  -- alumni members yet.
  FOR v_batch IN
    SELECT id, entry_year FROM core.scopes
    WHERE scope_type = 'batch' AND entry_year BETWEEN 2012 AND 2019
    ORDER BY entry_year
  LOOP
    FOR v_member_num IN 1..20 LOOP
      v_pick        := (v_member_num + v_batch.entry_year * 17) % 30 + 1;
      v_country_idx := (v_member_num + v_batch.entry_year) % 10 + 1;
      v_house_id    := v_house_ids[((v_member_num - 1) % 4) + 1];
      v_network_id  := v_network_ids[((v_member_num - 1) % array_length(v_network_ids, 1)) + 1];

      -- Build a deterministic UUID so ON CONFLICT is safe:
      -- 88888888-YYYY-NNNN-0000-000000000000 where YYYY = batch year,
      -- NNNN = zero-padded member number.
      v_member_id := ('88888888-' ||
                      lpad(v_batch.entry_year::text, 4, '0') || '-' ||
                      lpad(v_member_num::text, 4, '0') || '-0000-000000000000')::uuid;

      INSERT INTO core.members (
        id, full_name, email, phone,
        batch_scope_id, house_scope_id, network_scope_id,
        entry_year, exit_year,
        current_country, current_region_state, current_city
      ) VALUES (
        v_member_id,
        v_first_names[v_pick] || ' ' || v_last_names[v_pick],
        lower(v_first_names[v_pick]) || '.' || lower(v_last_names[v_pick]) ||
          '.' || v_batch.entry_year || '@shesa.test',
        '+237' || (100000 + (v_member_num * 137 + v_batch.entry_year) % 899999)::text,
        v_batch.id, v_house_id, v_network_id,
        v_batch.entry_year, v_batch.entry_year + 7,
        v_countries[v_country_idx],
        v_regions[v_country_idx],
        v_cities[v_country_idx]
      )
      ON CONFLICT (id) DO NOTHING;

      -- ── Membership distribution (based on member_num) ──
      -- 1-10:  active at Shesa Buea (60% of members)
      -- 11-13: active at Douala
      -- 14-15: active at DC
      -- 16-17: passive at Buea
      -- 18:    active at Buea University Chapter
      -- 19-20: no membership yet (candidate for join requests)
      v_membership_id := gen_random_uuid();

      IF v_member_num BETWEEN 1 AND 10 THEN
        INSERT INTO core.memberships (
          id, member_id, scope_id, membership_status, join_method, joined_at,
          approved_at, approved_by, engagement
        ) VALUES (
          v_membership_id, v_member_id, v_buea_id, 'active', 'admin_added',
          NOW() - (v_member_num || ' days')::interval,
          NOW() - (v_member_num || ' days')::interval,
          '55555555-0000-0000-0000-000000000001',
          -- Sprinkle every tier across the ten actives so the star badge
          -- renders all five variants in dev. Member 1 gets `pillar`
          -- (5⭐) per batch — a distinctive slot for the top tier.
          CASE v_member_num
            WHEN 1 THEN 'pillar'::core.engagement_tier
            WHEN 2 THEN 'committed'::core.engagement_tier
            WHEN 3 THEN 'engaged'::core.engagement_tier
            WHEN 4 THEN 'normal'::core.engagement_tier
            WHEN 5 THEN 'dormant'::core.engagement_tier
            WHEN 6 THEN 'committed'::core.engagement_tier
            WHEN 7 THEN 'engaged'::core.engagement_tier
            WHEN 8 THEN 'normal'::core.engagement_tier
            WHEN 9 THEN 'engaged'::core.engagement_tier
            ELSE        'committed'::core.engagement_tier
          END
        )
        ON CONFLICT DO NOTHING;
      ELSIF v_member_num BETWEEN 11 AND 13 THEN
        INSERT INTO core.memberships (
          id, member_id, scope_id, membership_status, join_method, joined_at,
          approved_at, approved_by, engagement
        ) VALUES (
          v_membership_id, v_member_id, v_douala_id, 'active', 'admin_added',
          NOW() - (v_member_num * 2 || ' days')::interval,
          NOW() - (v_member_num * 2 || ' days')::interval,
          '55555555-0000-0000-0000-000000000001',
          'normal'::core.engagement_tier
        )
        ON CONFLICT DO NOTHING;
      ELSIF v_member_num BETWEEN 14 AND 15 THEN
        INSERT INTO core.memberships (
          id, member_id, scope_id, membership_status, join_method, joined_at,
          approved_at, approved_by, engagement
        ) VALUES (
          v_membership_id, v_member_id, v_dc_id, 'active', 'admin_added',
          NOW() - (v_member_num * 3 || ' days')::interval,
          NOW() - (v_member_num * 3 || ' days')::interval,
          '55555555-0000-0000-0000-000000000001',
          CASE (v_member_num % 2) WHEN 0 THEN 'engaged'::core.engagement_tier ELSE 'normal'::core.engagement_tier END
        )
        ON CONFLICT DO NOTHING;
      ELSIF v_member_num BETWEEN 16 AND 17 THEN
        INSERT INTO core.memberships (
          id, member_id, scope_id, membership_status, join_method, joined_at,
          approved_at, approved_by, engagement
        ) VALUES (
          v_membership_id, v_member_id, v_buea_id, 'passive', 'admin_added',
          NOW() - '60 days'::interval,
          NOW() - '60 days'::interval,
          '55555555-0000-0000-0000-000000000001',
          'dormant'::core.engagement_tier
        )
        ON CONFLICT DO NOTHING;
      ELSIF v_member_num = 18 THEN
        INSERT INTO core.memberships (
          id, member_id, scope_id, membership_status, join_method, joined_at,
          approved_at, approved_by, engagement
        ) VALUES (
          v_membership_id, v_member_id, v_buea_uni_id, 'active', 'admin_added',
          NOW() - '30 days'::interval,
          NOW() - '30 days'::interval,
          '55555555-0000-0000-0000-000000000001',
          'engaged'::core.engagement_tier
        )
        ON CONFLICT DO NOTHING;
      END IF;
      -- v_member_num 19, 20: intentionally no membership.

      -- Registration status for the ones with a Shesa Buea membership.
      -- Buea has no fee configured in seed, so fee_required stays FALSE
      -- and every state resolves to 'not_required'. That's fine for the
      -- demo — the Registration tab renders the "not required" pill and
      -- the empty action-needed set, matching real behavior.
      IF v_member_num BETWEEN 1 AND 17 THEN
        INSERT INTO core.registration_status (
          membership_id, fee_required
        ) VALUES (
          v_membership_id, FALSE
        )
        ON CONFLICT (membership_id) DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;

  -- ── Pending join requests at Shesa Buea ──
  -- Pull members 19/20 from batches 2015-2019 (5 batches × 2 = 10 rows)
  -- and enqueue a pending membership at Buea. Buea admin sees these
  -- in the Requests queue.
  FOR v_batch IN
    SELECT id, entry_year FROM core.scopes
    WHERE scope_type = 'batch' AND entry_year BETWEEN 2015 AND 2019
  LOOP
    FOR v_member_num IN 19..20 LOOP
      v_member_id := ('88888888-' ||
                      lpad(v_batch.entry_year::text, 4, '0') || '-' ||
                      lpad(v_member_num::text, 4, '0') || '-0000-000000000000')::uuid;

      INSERT INTO core.memberships (
        id, member_id, scope_id, membership_status, join_method, joined_at
      ) VALUES (
        gen_random_uuid(), v_member_id, v_buea_id, 'pending', 'self_request',
        NOW() - (v_batch.entry_year - 2020 || ' days')::interval
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;

  -- ── Pending transfers targeting Shesa Buea ──
  -- Members currently at Douala who want to move to Buea (5 rows).
  -- Buea admin sees these in the Transfers queue.
  FOR v_batch IN
    SELECT id, entry_year FROM core.scopes
    WHERE scope_type = 'batch' AND entry_year BETWEEN 2015 AND 2019
  LOOP
    v_member_id := ('88888888-' ||
                    lpad(v_batch.entry_year::text, 4, '0') || '-' ||
                    lpad(11::text, 4, '0') || '-0000-000000000000')::uuid;

    -- Skip if the member wasn't created or isn't at Douala.
    IF EXISTS (
      SELECT 1 FROM core.memberships
      WHERE member_id = v_member_id AND scope_id = v_douala_id
        AND membership_status = 'active'
    ) THEN
      INSERT INTO core.membership_transfers (
        member_id, source_scope_id, destination_scope_id,
        requested_by, reason, status
      ) VALUES (
        v_member_id, v_douala_id, v_buea_id,
        '55555555-0000-0000-0000-000000000001',
        'Relocating for work — closer to Buea office.',
        'pending'
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

END $$;



-- =============================================================================
-- Section 5. A year of finance activity
-- =============================================================================
-- 6.0 Clean slate — wipe every finance row before reseeding
-------------------------------------------------------------------------------

TRUNCATE
  finance.reconciliations,
  finance.tickets,
  finance.payments,
  finance.obligations,
  finance.charge_targets,
  finance.contribution_extensions,
  finance.exceptions,
  finance.expenses,
  finance.expense_settings,
  finance.charges,
  finance.groups,
  finance.receipt_verifications,
  finance.payment_intents,
  finance.ledger_entries,
  finance.treasury_balances
RESTART IDENTITY CASCADE;

-------------------------------------------------------------------------------
-- 6.1 Two charges: one Individual, one Group
-------------------------------------------------------------------------------
--
-- We keep the finance demo intentionally small: just the two shapes an
-- operator actually clicks through. Everything else (donations,
-- expenses, contributions) is empty by design so the dashboard/
-- transactions/charges pages tell a clean story of what these two
-- primitives look like end-to-end.

-- (A) Individual — per-member Monthly Dues at Shesa Buea. Activated
--     12 months ago so obligation generation covers a full year of
--     history that the Charge Detail's sliding window can scroll.
INSERT INTO finance.charges
  (id, scope_id, shape, name, description, base_amount, currency, recurrence,
   recurrence_interval, activation_date, issue_date, status, target_filter,
   target_party_type, created_by, created_at, updated_at)
VALUES
  ('77777777-1111-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000010',
   'charge', 'Monthly Dues',
   'Regular monthly dues owed by every active Shesa Buea member.',
   25000, 'XAF', 'monthly', 1,
   date_trunc('month', NOW() - INTERVAL '12 months'),
   date_trunc('month', NOW() - INTERVAL '12 months'),
   'active', '{}'::jsonb, 'member',
   '55555555-0000-0000-0000-000000000002',
   NOW(), NOW());

-- (B) Group — Mainstream-owned charge whose obligations fan out to
--     three target scopes with per-target amounts. `target_party_type
--     = 'branch'` triggers the new generator branch (M4), which walks
--     finance.charge_targets and produces one obligation per (target,
--     period).
INSERT INTO finance.charges
  (id, scope_id, shape, name, description, base_amount, currency, recurrence,
   recurrence_interval, activation_date, issue_date, status, target_filter,
   target_party_type, created_by, created_at, updated_at)
VALUES
  ('77777777-1111-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000001',
   'charge', 'Branch Contribution',
   'Mainstream levy split across the three visible branches/chapters.',
   60000, 'XAF', 'monthly', 1,
   date_trunc('month', NOW() - INTERVAL '12 months'),
   date_trunc('month', NOW() - INTERVAL '12 months'),
   'active', '{}'::jsonb, 'branch',
   '55555555-0000-0000-0000-000000000002',
   NOW(), NOW());

INSERT INTO finance.charge_targets (id, charge_id, target_scope_id, amount, currency)
VALUES
  ('77777777-1111-2222-0000-000000000001',
   '77777777-1111-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000010',
   60000, 'XAF'),
  ('77777777-1111-2222-0000-000000000002',
   '77777777-1111-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000011',
   50000, 'XAF'),
  ('77777777-1111-2222-0000-000000000003',
   '77777777-1111-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000020',
   40000, 'XAF');

-------------------------------------------------------------------------------
-- 6.2 Generate a full year of obligations for both charges
-------------------------------------------------------------------------------
-- The M2B generator computes ONE period from a reference timestamp; we
-- walk month-by-month from 12 months ago through the current month so
-- the charge-detail's sliding-window centres on today's period with
-- real history to scroll back through. UNIQUE (charge_id, party_type,
-- party_id, period_start) keeps the loop idempotent across reseeds.

-- Buea memberships need to predate the first billing period or the
-- generator skips them. Slide join dates back to 13 months, taking the
-- LEAST() so we never move someone forward in time by accident.
UPDATE core.memberships
   SET joined_at   = LEAST(joined_at,   NOW() - INTERVAL '13 months' - INTERVAL '5 days'),
       approved_at = LEAST(approved_at, NOW() - INTERVAL '13 months' - INTERVAL '5 days')
 WHERE scope_id = '00000000-0000-0000-0000-000000000010'
   AND membership_status IN ('active', 'passive');

DO $$
DECLARE
  v_reference    TIMESTAMPTZ;
  v_month_offset INTEGER;
  v_total_ind    INTEGER := 0;
  v_total_grp    INTEGER := 0;
  v_step         INTEGER;
BEGIN
  FOR v_month_offset IN 0..13 LOOP
    v_reference := date_trunc('month', NOW() - INTERVAL '12 months')
                   + (v_month_offset || ' months')::interval
                   + INTERVAL '15 days';
    IF v_reference > NOW() + INTERVAL '1 month' THEN
      EXIT;
    END IF;

    SELECT finance.generate_obligations_for_charge(
      '77777777-1111-0000-0000-000000000001'::uuid,
      v_reference
    ) INTO v_step;
    v_total_ind := v_total_ind + v_step;

    SELECT finance.generate_obligations_for_charge(
      '77777777-1111-0000-0000-000000000004'::uuid,
      v_reference
    ) INTO v_step;
    v_total_grp := v_total_grp + v_step;
  END LOOP;

  RAISE NOTICE 'Finance seed: individual dues generated % obligations; group contribution generated %',
    v_total_ind, v_total_grp;
END $$;

-------------------------------------------------------------------------------
-- 6.3 Sprinkle a year of realistic payments across the individual charge
-------------------------------------------------------------------------------
-- Rule: the further back the period, the closer everyone is to fully
-- paid — old bills settle while recent ones are still mid-cycle. Uses
-- hashtext for deterministic-yet-varied pick, so the display looks
-- real but stays stable across reseeds.

DO $$
DECLARE
  v_ob         finance.obligations%ROWTYPE;
  v_period     DATE;
  v_methods    finance.payment_method[] := ARRAY[
    'mtn_momo'::finance.payment_method,
    'orange_money'::finance.payment_method,
    'cash'::finance.payment_method,
    'bank_transfer'::finance.payment_method
  ];
  v_method     finance.payment_method;
  v_amount     NUMERIC;
  v_paid_ratio NUMERIC;
  v_bucket     INTEGER;
  v_total      INTEGER := 0;
BEGIN
  FOR v_ob IN
    SELECT * FROM finance.obligations
     WHERE charge_id = '77777777-1111-0000-0000-000000000001'
     ORDER BY period_start, party_id
  LOOP
    v_period := v_ob.period_start;
    IF v_period IS NULL OR v_period > CURRENT_DATE THEN
      CONTINUE;
    END IF;

    v_paid_ratio := CASE
      WHEN v_period <= CURRENT_DATE - INTERVAL '6 months' THEN 0.90
      WHEN v_period <= CURRENT_DATE - INTERVAL '3 months' THEN 0.75
      WHEN v_period <= CURRENT_DATE - INTERVAL '1 month'  THEN 0.55
      ELSE 0.35
    END;

    v_bucket := abs(hashtext(v_ob.party_id::text || v_period::text)) % 100;
    IF v_bucket >= (v_paid_ratio * 100) THEN
      CONTINUE;
    END IF;

    v_method := v_methods[1 + (v_bucket % 4)];
    IF v_bucket % 10 < 3 THEN
      v_amount := v_ob.amount / 2;
    ELSE
      v_amount := v_ob.amount;
    END IF;

    INSERT INTO finance.payments
      (id, obligation_id, charge_id, scope_id, payer_member_id,
       amount, currency, method, source, recorded_by, created_at, metadata)
    VALUES (
      gen_random_uuid(),
      v_ob.id,
      v_ob.charge_id,
      v_ob.scope_id,
      v_ob.party_id,
      v_amount, v_ob.currency, v_method, 'auto',
      '55555555-0000-0000-0000-000000000011',
      (v_period + INTERVAL '15 days')::timestamptz,
      jsonb_build_object('seed_marker', 'monthly-dues-history')
    );
    v_total := v_total + 1;
  END LOOP;

  RAISE NOTICE 'Finance seed: sprinkled % payments across monthly dues periods', v_total;
END $$;

-------------------------------------------------------------------------------
-- 6.4 Sprinkle a year of payments across the group charge
-------------------------------------------------------------------------------
-- Same age-based paid-ratio, but the deterministic bucket keys off the
-- target scope + period so each branch has its own consistent pattern.
-- Payments here have `payer_member_id=NULL` because a branch-as-a-body
-- charge doesn't have an individual payer; the payment carries the
-- target scope via obligation.party_id.

DO $$
DECLARE
  v_ob         finance.obligations%ROWTYPE;
  v_period     DATE;
  v_methods    finance.payment_method[] := ARRAY[
    'mtn_momo'::finance.payment_method,
    'orange_money'::finance.payment_method,
    'cash'::finance.payment_method,
    'bank_transfer'::finance.payment_method
  ];
  v_method     finance.payment_method;
  v_amount     NUMERIC;
  v_paid_ratio NUMERIC;
  v_bucket     INTEGER;
  v_total      INTEGER := 0;
BEGIN
  FOR v_ob IN
    SELECT * FROM finance.obligations
     WHERE charge_id = '77777777-1111-0000-0000-000000000004'
     ORDER BY period_start, party_id
  LOOP
    v_period := v_ob.period_start;
    IF v_period IS NULL OR v_period > CURRENT_DATE THEN
      CONTINUE;
    END IF;

    v_paid_ratio := CASE
      WHEN v_period <= CURRENT_DATE - INTERVAL '6 months' THEN 0.92
      WHEN v_period <= CURRENT_DATE - INTERVAL '3 months' THEN 0.80
      WHEN v_period <= CURRENT_DATE - INTERVAL '1 month'  THEN 0.60
      ELSE 0.45
    END;

    v_bucket := abs(hashtext(v_ob.party_id::text || v_period::text)) % 100;
    IF v_bucket >= (v_paid_ratio * 100) THEN
      CONTINUE;
    END IF;

    v_method := v_methods[1 + (v_bucket % 4)];
    -- ~40% of remittances are partial (half amount) to make the matrix
    -- show mixed states.
    IF v_bucket % 10 < 4 THEN
      v_amount := v_ob.amount / 2;
    ELSE
      v_amount := v_ob.amount;
    END IF;

    INSERT INTO finance.payments
      (id, obligation_id, charge_id, scope_id, payer_member_id,
       amount, currency, method, source, recorded_by, created_at, metadata)
    VALUES (
      gen_random_uuid(),
      v_ob.id,
      v_ob.charge_id,
      v_ob.party_id,     -- payment scope = the target branch/chapter
      NULL,
      v_amount, v_ob.currency, v_method, 'auto',
      '55555555-0000-0000-0000-000000000011',
      (v_period + INTERVAL '15 days')::timestamptz,
      jsonb_build_object('seed_marker', 'group-contribution-history')
    );
    v_total := v_total + 1;
  END LOOP;

  RAISE NOTICE 'Finance seed: sprinkled % branch payments across group contribution periods', v_total;
END $$;

-- =============================================================================
-- Section 6. Exco announcements and events
-- =============================================================================
-- data to render. Owner scopes: Mainstream (00…0001) and Shesa Buea
-- (00…0010). Audience definitions use the shape the resolve-audience
-- Edge Function expects: `{ "scopes": [scope_id, ...] }`. All-in-app
-- (the default channel) so we don't need email/forum delivery rows.

INSERT INTO exco.announcements
  (id, owner_scope_id, title, body, audience_definition, channels,
   status, published_at, scheduled_publish_at, created_by, created_at)
VALUES
  -- 7.1 Mainstream · published · federation-wide
  ('77777777-5000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   '2027 Federation AGM date locked',
   E'The 2027 Annual General Meeting will run from March 12–14, 2027 in Yaoundé.\n\nDelegates from every branch and autonomous chapter are expected. Registration opens January 15. Watch this space for the accommodation and travel-support notice.',
   jsonb_build_object('scopes', jsonb_build_array('00000000-0000-0000-0000-000000000001')),
   ARRAY['in_app']::exco.announcement_channel[],
   'published',
   NOW() - INTERVAL '2 days',
   NULL,
   '55555555-0000-0000-0000-000000000001',
   NOW() - INTERVAL '2 days'),

  -- 7.2 Mainstream · published · treasury note
  ('77777777-5000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   'Q1 branch assessments now live',
   'The Q1 branch assessment schedule is now visible under Finance → Assessments. Payments are due by end of March; contact Mainstream Finance for hardship arrangements.',
   jsonb_build_object('scopes', jsonb_build_array('00000000-0000-0000-0000-000000000001')),
   ARRAY['in_app']::exco.announcement_channel[],
   'published',
   NOW() - INTERVAL '5 days',
   NULL,
   '55555555-0000-0000-0000-000000000001',
   NOW() - INTERVAL '5 days'),

  -- 7.3 Mainstream · draft · newsletter teaser
  ('77777777-5000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000001',
   'Monthly newsletter — February edition',
   'DRAFT — awaiting the layout from Communications. Highlights: alumni spotlights, chapter news, and a Q&A with the incoming Governance Committee chair.',
   jsonb_build_object('scopes', jsonb_build_array('00000000-0000-0000-0000-000000000001')),
   ARRAY['in_app']::exco.announcement_channel[],
   'draft',
   NULL,
   NULL,
   '55555555-0000-0000-0000-000000000001',
   NOW() - INTERVAL '1 day'),

  -- 7.4 Buea · published · welcome to new members
  ('77777777-5000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000010',
   'Welcome to the January intake',
   E'A warm welcome to the twelve new members who joined Shesa Buea this month.\n\nWe run a monthly meet-and-greet on the first Saturday. Look out for the calendar entry.',
   jsonb_build_object('scopes', jsonb_build_array('00000000-0000-0000-0000-000000000010')),
   ARRAY['in_app']::exco.announcement_channel[],
   'published',
   NOW() - INTERVAL '3 days',
   NULL,
   '55555555-0000-0000-0000-000000000010',
   NOW() - INTERVAL '3 days'),

  -- 7.5 Buea · scheduled · reminder about dues
  ('77777777-5000-0000-0000-000000000005',
   '00000000-0000-0000-0000-000000000010',
   'Monthly dues reminder — pay by month-end',
   'Reminder: Buea monthly dues are payable by the last day of the month via cash, MoMo, or bank transfer. Check your balance under Finance → Charges.',
   jsonb_build_object('scopes', jsonb_build_array('00000000-0000-0000-0000-000000000010')),
   ARRAY['in_app']::exco.announcement_channel[],
   'scheduled',
   NULL,
   NOW() + INTERVAL '3 days',
   '55555555-0000-0000-0000-000000000010',
   NOW() - INTERVAL '6 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO exco.events
  (id, owner_scope_id, name, description, types,
   start_at, end_at, timezone,
   venue_name, venue_address, online_url,
   audience_definition, rsvp_enabled,
   status, published_at, created_by, created_at)
VALUES
  -- 7.6 Mainstream · published · AGM
  ('77777777-6000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'Shesa Federation AGM 2027',
   E'The 2027 Annual General Meeting brings delegates from every branch and autonomous chapter together for governance, elections, and the year-in-review.\n\nAgenda: opening plenary, committee reports, elections, closed-door governance session, closing gala.',
   ARRAY['assembly', 'meeting', 'ceremony']::exco.event_type[],
   (DATE_TRUNC('day', NOW()) + INTERVAL '60 days' + INTERVAL '9 hours'),
   (DATE_TRUNC('day', NOW()) + INTERVAL '62 days' + INTERVAL '17 hours'),
   'Africa/Douala',
   'Hilton Yaoundé', 'Boulevard du 20 Mai, Yaoundé, Cameroon', NULL,
   jsonb_build_object('scopes', jsonb_build_array('00000000-0000-0000-0000-000000000001')),
   TRUE,
   'published', NOW() - INTERVAL '2 days',
   '55555555-0000-0000-0000-000000000001',
   NOW() - INTERVAL '10 days'),

  -- 7.7 Mainstream · published · fundraiser dinner
  ('77777777-6000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   'Shesa Alumni Gala Fundraiser',
   'Annual gala dinner in support of the Scholarship Fund. Tickets and table sponsorships available through Finance.',
   ARRAY['fundraiser', 'celebration', 'networking']::exco.event_type[],
   (DATE_TRUNC('day', NOW()) + INTERVAL '90 days' + INTERVAL '19 hours'),
   (DATE_TRUNC('day', NOW()) + INTERVAL '90 days' + INTERVAL '23 hours'),
   'Africa/Douala',
   'Yaoundé Congress Palace', 'Palais des Congrès, Ngoa-Ekelle, Yaoundé', NULL,
   jsonb_build_object('scopes', jsonb_build_array('00000000-0000-0000-0000-000000000001')),
   TRUE,
   'published', NOW() - INTERVAL '1 day',
   '55555555-0000-0000-0000-000000000001',
   NOW() - INTERVAL '5 days'),

  -- 7.8 Mainstream · draft · mentorship kickoff
  ('77777777-6000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000001',
   'Mentorship Programme Kickoff (draft)',
   'DRAFT — pending confirmation of the mentor cohort. Kickoff will be a hybrid session with senior alumni matching junior chapters.',
   ARRAY['mentorship', 'training']::exco.event_type[],
   (DATE_TRUNC('day', NOW()) + INTERVAL '120 days' + INTERVAL '15 hours'),
   (DATE_TRUNC('day', NOW()) + INTERVAL '120 days' + INTERVAL '18 hours'),
   'Africa/Douala',
   NULL, NULL, 'https://zoom.example.com/j/shesa-mentorship-kickoff',
   jsonb_build_object('scopes', jsonb_build_array('00000000-0000-0000-0000-000000000001')),
   FALSE,
   'draft', NULL,
   '55555555-0000-0000-0000-000000000001',
   NOW() - INTERVAL '2 days'),

  -- 7.9 Buea · published · monthly meeting
  ('77777777-6000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000010',
   'Shesa Buea Monthly Meeting — February',
   E'Monthly branch meeting. Agenda: welcoming new members, treasury report, upcoming assessments, community service updates, AOB.\n\nRefreshments provided.',
   ARRAY['meeting', 'networking']::exco.event_type[],
   (DATE_TRUNC('day', NOW()) + INTERVAL '14 days' + INTERVAL '17 hours'),
   (DATE_TRUNC('day', NOW()) + INTERVAL '14 days' + INTERVAL '19 hours'),
   'Africa/Douala',
   'Buea Community Hall', 'Molyko, Buea, South-West Region, Cameroon', NULL,
   jsonb_build_object('scopes', jsonb_build_array('00000000-0000-0000-0000-000000000010')),
   TRUE,
   'published', NOW() - INTERVAL '2 days',
   '55555555-0000-0000-0000-000000000010',
   NOW() - INTERVAL '4 days'),

  -- 7.10 Buea · published · community service Saturday
  ('77777777-6000-0000-0000-000000000005',
   '00000000-0000-0000-0000-000000000010',
   'Buea Clean-Up Saturday',
   'Join us for a community clean-up around Molyko. Gloves and bin bags provided. Meet at the Community Hall — dress for outdoor work.',
   ARRAY['community_service']::exco.event_type[],
   (DATE_TRUNC('day', NOW()) + INTERVAL '7 days' + INTERVAL '8 hours'),
   (DATE_TRUNC('day', NOW()) + INTERVAL '7 days' + INTERVAL '12 hours'),
   'Africa/Douala',
   'Molyko Community Hall', 'Molyko, Buea', NULL,
   jsonb_build_object('scopes', jsonb_build_array('00000000-0000-0000-0000-000000000010')),
   TRUE,
   'published', NOW() - INTERVAL '3 days',
   '55555555-0000-0000-0000-000000000010',
   NOW() - INTERVAL '6 days')
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- Section 7. Sample mainstream contributions
-- =============================================================================
-- Two examples of standalone contributions (no event group). One has
-- a target goal, one is open-ended. Both anchor to the mainstream
-- scope so the mainstream Contributions list has something to render
-- on a fresh reset.

INSERT INTO finance.charges
  (id, scope_id, shape, name, description, currency,
   goal_amount, min_amount, base_amount,
   target_filter, target_party_type,
   lifecycle, open_date, close_date, status, group_id,
   created_by, created_at, updated_at)
VALUES
  -- With target: goal-shape contribution, 5M XAF target.
  ('99999999-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'goal', 'Scholarship Fund 2026',
   'End-of-year scholarship drive for SAHECO students. 5 000 000 XAF target.',
   'XAF',
   5000000, NULL, NULL,
   '{}'::jsonb, 'member',
   'open',
   (NOW() - INTERVAL '30 days'),
   (NOW() + INTERVAL '150 days'),
   'active', NULL,
   '55555555-0000-0000-0000-000000000002',
   NOW(), NOW()),
  -- Without target: open-shape contribution, any amount.
  ('99999999-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   'open', 'Chapel Renovation Drive',
   'Open collection for the SAHECO chapel renovation project. No target, any amount.',
   'XAF',
   NULL, NULL, NULL,
   '{}'::jsonb, 'member',
   'open',
   (NOW() - INTERVAL '15 days'),
   (NOW() + INTERVAL '180 days'),
   'active', NULL,
   '55555555-0000-0000-0000-000000000002',
   NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
