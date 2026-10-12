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
--   1. Shesa Gov — the fifth network, the four others being in the bootstrap.
--   2. Sample chapters under Shesa Buea (one autonomous, one grouping).
--   3. Dev logins (@shesa.test) with global and branch-scoped grants.
--   4. Members, memberships, positions, transfers.
--   5. A year of finance activity — charges, obligations, payments.
--   6. Exco announcements and events.
--
-- ── Networks ────────────────────────────────────────────────────────────────
-- The bootstrap seeds four (Legal, Santé, Tech, Education), because
-- `core.members.network_scope_id` is REQUIRED — a trigger rejects any member
-- row without one, so a database with no networks cannot hold a member at all.
-- This file re-states all five; the four already present conflict-skip, so the
-- only one it actually adds is Shesa Gov.

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
-- 6.0 Clean slate — wipe the DEMO's finance rows before reseeding
-------------------------------------------------------------------------------
-- This used to truncate `finance.charges` and `finance.groups` too, from when
-- one seed owned all finance data. After the 2026-09-02 split it destroyed the
-- AGM 2026 group and its seven charges that `seed.sql` had just created three
-- sections earlier — silently, because TRUNCATE succeeds on rows it was never
-- meant to touch. Every local database came up with no AGM catalogue, so the
-- public /agm-2026 forms had nothing to attach a payment to.
--
-- The transactional tables are still truncated wholesale: they are demo-owned
-- and empty in a fresh production seed. The catalogue is then cleared by
-- DELETE with a predicate, so the bootstrap survives and the demo still gets
-- its clean slate. `charge_targets`, `contribution_extensions`, `exceptions`
-- and `charge_amount_versions` cascade off the charge delete.

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
  finance.receipt_verifications,
  finance.payment_intents,
  finance.sandbox_payments,
  finance.ledger_entries,
  finance.treasury_balances
RESTART IDENTITY CASCADE;

-- Everything outside the AGM group is demo catalogue. Charges go first:
-- `charges.group_id` is ON DELETE SET NULL, so removing groups first would
-- orphan them out of the predicate.
DELETE FROM finance.charges
 WHERE group_id IS DISTINCT FROM '88888888-2026-0000-0000-000000000001';

DELETE FROM finance.groups
 WHERE id <> '88888888-2026-0000-0000-000000000001';

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

-- =============================================================================
-- Section 8. Public-website placeholder content
-- =============================================================================
--
-- Leadership, articles, projects, site events, gallery, organs and songs —
-- everything apps/web renders from the `cms` schema.
--
-- This arrived as seven `*_seed.sql` MIGRATIONS until 2026-09-02. Content as
-- schema meant it shipped to every database regardless, and correcting a typo
-- needed a new migration. It is real SHESA content, so it belongs in the
-- production bootstrap — but as seed data.
--
-- The set the seven retired `*_seed.sql` migrations produced — described in
-- their own headers as the "placeholder arrays" and "static data" the web app
-- shipped before it read from `cms`. Useful for seeing the public site fully
-- populated locally; NOT production content. Production starts empty and the
-- Editor fills it.

INSERT INTO cms.article_categories VALUES ('bbbb1111-0000-0000-0000-000000000001', 'News', 10, '2026-09-02 19:07:24.400795+00', '2026-09-02 19:07:24.400795+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.article_categories VALUES ('bbbb1111-0000-0000-0000-000000000002', 'Announcement', 20, '2026-09-02 19:07:24.400795+00', '2026-09-02 19:07:24.400795+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.article_categories VALUES ('bbbb1111-0000-0000-0000-000000000003', 'Diaspora', 30, '2026-09-02 19:07:24.400795+00', '2026-09-02 19:07:24.400795+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.article_categories VALUES ('bbbb1111-0000-0000-0000-000000000004', 'Community', 40, '2026-09-02 19:07:24.400795+00', '2026-09-02 19:07:24.400795+00') ON CONFLICT DO NOTHING;

INSERT INTO cms.articles VALUES ('bbbb2222-0000-0000-0000-000000000001', 'agm-2026-yaounde', 'AGM 2026: All roads lead to Palais des Congrès, Yaoundé', 'The 2026 Annual General Meeting is set for November 21 at Palais des Congrès, Yaoundé — an AGM like never before.', '<p>The National Executive is pleased to formally announce that the 2026 Annual General Meeting will take place on Saturday, November 21, 2026, at Palais des Congrès, Yaoundé. This is a moment we have been building toward for years — a convening that draws every corner of the SHESA family to a single hall.</p><p>Registration opens August 1. Delegates from the branches, chapters, and diaspora are asked to file preliminary intentions with the Secretary General before June 30 so that logistics, accommodation, and the Cultural Night can be planned around the true numbers.</p><p>This AGM will not simply revisit resolutions — it will unveil the Vision 2030 roadmap, honour lifelong service, and welcome the largest cohort of new life members in a decade. All roads, quite literally, lead to Yaoundé.</p>', '/hero_one.jpg', 'The National Secretariat', 'National Secretariat', '/president_one.jpg', 'published', '2026-08-31 19:07:24.400795+00', true, '2026-09-02 19:07:24.400795+00', '2026-09-02 19:07:24.400795+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.articles VALUES ('bbbb2222-0000-0000-0000-000000000002', 'scholarship-winners-2024', 'Scholarship winners announced for the 2024 academic year', 'Thirty-eight scholarships awarded to Shesan-aligned students this cycle — the largest cohort in the programme.', '<p>This year the Alumni Scholarship Programme awarded 38 full and partial scholarships — the largest cohort since the fund was constituted. Recipients were selected across all six graduating classes and represent every region in Cameroon.</p><p>Notably, three recipients are the direct wards of Shesan alumni whose own studies had been supported by the fund a generation earlier. The programme now spans two full generations.</p><p>A ceremony to honour recipients, donors, and the awarding committee will take place in Bamenda ahead of the AGM. Donors and mentors are being contacted individually with details.</p>', '/hero_two.jpg', 'Programs Secretariat', 'Programs Secretariat', '/president_two.jpg', 'published', '2026-08-28 19:07:24.400795+00', true, '2026-09-02 19:07:24.400795+00', '2026-09-02 19:07:24.400795+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.articles VALUES ('bbbb2222-0000-0000-0000-000000000003', 'health-outreach-bamenda', 'Health outreach reaches 5,000 in Bamenda', 'Free consultations, screenings, and referrals — the March health drive served over 5,000 residents across Mankon and its outlying areas.', '<p>Coordinated by the Welfare Portfolio in partnership with the Bamenda branch, the March 2026 health outreach served over 5,000 residents across Mankon and its outlying areas. The three-day drive included free consultations, blood pressure and diabetes screenings, and specialist referrals.</p><p>Fifteen alumni — nine medical doctors and six nurses — volunteered their time. The Regional Hospital Bamenda hosted the closing clinic, and the Chief Medical Officer commended SHESA for what he described as ''the most organised alumni-led health drive we have seen''.</p><p>The team will move next to Ndop in Q3, with a similar structure. Volunteers, especially specialists, are invited to sign up with the Welfare Secretary.</p>', '/hero_three.jpg', 'Welfare Portfolio', 'Welfare Portfolio', '/president_one.jpg', 'published', '2026-08-26 19:07:24.400795+00', false, '2026-09-02 19:07:24.400795+00', '2026-09-02 19:07:24.400795+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.articles VALUES ('bbbb2222-0000-0000-0000-000000000004', 'new-executive-sworn-in', 'New National Executive sworn in for 2026–2028', 'Dr. Etonge Ambe formally sworn in as National President alongside a 17-member executive committee.', '<p>On February 22, at a ceremony held in Yaoundé, the incoming National Executive was formally sworn in for the 2026–2028 term. Dr. Etonge Ambe takes over as National President from Dr. Achu Samuel, who now serves as Immediate Past President.</p><p>The full 17-member committee spans the Executive, Council Portfolios, Coordinators, and Advisory Council. Details are published on the Leadership page.</p><p>The new executive has committed to a first-100-days plan focused on branch reactivation, scholarship pipeline strengthening, and preparations for the 2026 AGM.</p>', '/hero_four.jpg', 'The National Secretariat', 'National Secretariat', '/president_two.jpg', 'published', '2026-08-19 19:07:24.400795+00', false, '2026-09-02 19:07:24.400795+00', '2026-09-02 19:07:24.400795+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.articles VALUES ('bbbb2222-0000-0000-0000-000000000005', 'homecoming-2024-recap', 'Homecoming weekend 2024: a recap in numbers', 'Two decades of memories, one long weekend — and 1,200 alumni back on the hill for it.', '<p>1,200 alumni. 47 batches represented. 8 diaspora chapters flying in. The 2024 Homecoming Weekend broke every prior attendance record and set a new benchmark for what the reunion can be.</p><p>Highlights included the intergenerational football match (the class of 1998 finally lifting the trophy), the alumni market showcase, and the candlelight vigil at the founder''s tomb.</p><p>Plans for Homecoming 2027 are already underway — the theme, per the Programs Secretariat, will be "Roots and Wings".</p>', '/hero_five.jpg', 'Communications Secretariat', 'Communications Secretariat', '/president_one.jpg', 'published', '2026-08-12 19:07:24.400795+00', true, '2026-09-02 19:07:24.400795+00', '2026-09-02 19:07:24.400795+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.articles VALUES ('bbbb2222-0000-0000-0000-000000000006', 'toronto-chapter-launched', 'Toronto chapter formally launched', 'The Canada chapter now has an active hub in Toronto, joining Ottawa and Montréal.', '<p>Coordinated by the interim Canada Chapter Executive, the Toronto hub was formally inaugurated at a ceremony on February 3 attended by 40 alumni currently resident in the Greater Toronto Area.</p><p>Mr. Ndifon Blaise, who serves as the Canada Chapter President, presided over the swearing-in of the hub officers. The hub joins the existing Ottawa and Montréal groups under the Canada Chapter umbrella.</p><p>Alumni across Ontario are encouraged to register their presence via the Diaspora Coordinator.</p>', '/hero_one.jpg', 'Diaspora Coordination', 'Diaspora Coordination', '/president_two.jpg', 'published', '2026-08-03 19:07:24.400795+00', false, '2026-09-02 19:07:24.400795+00', '2026-09-02 19:07:24.400795+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.articles VALUES ('bbbb2222-0000-0000-0000-000000000007', 'girls-school-renovation', 'Community project: Girls'' School renovation complete', 'A joint SHESA-Community project restores two dilapidated classroom blocks and a small library.', '<p>The renovation of St. Bernadette Girls'' School classroom blocks A and B is complete, along with the newly established Sister Mary Library — a joint project of SHESA, the school''s parent-teacher association, and the local council.</p><p>The project was funded by contributions from three diaspora chapters and matched by the Community Investment Fund. Total spend: 42 million XAF over 14 months.</p><p>A handover ceremony took place on February 2. Photographs are being uploaded to the gallery this week.</p>', '/hero_two.jpg', 'Programs Secretariat', 'Programs Secretariat', '/president_one.jpg', 'published', '2026-07-29 19:07:24.400795+00', false, '2026-09-02 19:07:24.400795+00', '2026-09-02 19:07:24.400795+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.articles VALUES ('bbbb2222-0000-0000-0000-000000000008', 'global-summit-2027', 'Save the date: 2027 Global Alumni Summit', 'The next Global Summit is confirmed for October 2027 in Lagos, Nigeria.', '<p>Following the successful 2023 summit, the National Executive has confirmed that the 2027 Global Alumni Summit will convene in Lagos, Nigeria, from October 8–10, 2027, at the Eko Convention Centre.</p><p>The summit is a biennial gathering distinct from the AGM, focused on cross-chapter learning, thematic sessions, and Africa-wide policy conversations.</p><p>A steering committee is being constituted. Chapter presidents will receive detailed correspondence in due course.</p>', '/hero_three.jpg', 'The National Secretariat', 'National Secretariat', '/president_two.jpg', 'published', '2026-07-26 19:07:24.400795+00', false, '2026-09-02 19:07:24.400795+00', '2026-09-02 19:07:24.400795+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.articles VALUES ('bbbb2222-0000-0000-0000-000000000009', 'legal-adviser-appointed', 'Legal Adviser appointed to the National Committee', 'Barr. Ndifon George formally joins the Advisory Council as Legal Adviser.', '<p>The National Executive is pleased to announce the appointment of Barr. Ndifon George as Legal Adviser to the National Committee, filling the vacancy left following the retirement of Barr. Emeritus Achu Vincent.</p><p>Barr. Ndifon brings over two decades of practice at the Cameroon Bar and has served the association informally for many years.</p><p>He assumes his role with immediate effect.</p>', '/hero_four.jpg', 'The National Secretariat', 'National Secretariat', '/president_one.jpg', 'published', '2026-07-19 19:07:24.400795+00', false, '2026-09-02 19:07:24.400795+00', '2026-09-02 19:07:24.400795+00') ON CONFLICT DO NOTHING;

INSERT INTO cms.article_categories_map VALUES ('bbbb2222-0000-0000-0000-000000000001', 'bbbb1111-0000-0000-0000-000000000002') ON CONFLICT DO NOTHING;
INSERT INTO cms.article_categories_map VALUES ('bbbb2222-0000-0000-0000-000000000002', 'bbbb1111-0000-0000-0000-000000000001') ON CONFLICT DO NOTHING;
INSERT INTO cms.article_categories_map VALUES ('bbbb2222-0000-0000-0000-000000000003', 'bbbb1111-0000-0000-0000-000000000001') ON CONFLICT DO NOTHING;
INSERT INTO cms.article_categories_map VALUES ('bbbb2222-0000-0000-0000-000000000003', 'bbbb1111-0000-0000-0000-000000000004') ON CONFLICT DO NOTHING;
INSERT INTO cms.article_categories_map VALUES ('bbbb2222-0000-0000-0000-000000000004', 'bbbb1111-0000-0000-0000-000000000002') ON CONFLICT DO NOTHING;
INSERT INTO cms.article_categories_map VALUES ('bbbb2222-0000-0000-0000-000000000005', 'bbbb1111-0000-0000-0000-000000000001') ON CONFLICT DO NOTHING;
INSERT INTO cms.article_categories_map VALUES ('bbbb2222-0000-0000-0000-000000000006', 'bbbb1111-0000-0000-0000-000000000003') ON CONFLICT DO NOTHING;
INSERT INTO cms.article_categories_map VALUES ('bbbb2222-0000-0000-0000-000000000006', 'bbbb1111-0000-0000-0000-000000000002') ON CONFLICT DO NOTHING;
INSERT INTO cms.article_categories_map VALUES ('bbbb2222-0000-0000-0000-000000000007', 'bbbb1111-0000-0000-0000-000000000001') ON CONFLICT DO NOTHING;
INSERT INTO cms.article_categories_map VALUES ('bbbb2222-0000-0000-0000-000000000007', 'bbbb1111-0000-0000-0000-000000000004') ON CONFLICT DO NOTHING;
INSERT INTO cms.article_categories_map VALUES ('bbbb2222-0000-0000-0000-000000000008', 'bbbb1111-0000-0000-0000-000000000002') ON CONFLICT DO NOTHING;
INSERT INTO cms.article_categories_map VALUES ('bbbb2222-0000-0000-0000-000000000009', 'bbbb1111-0000-0000-0000-000000000002') ON CONFLICT DO NOTHING;

INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000002019', '2019', 'Mr. Ndifon Peter', '/president_one.jpg', 0, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000002018', '2018', 'Mr. Achu Emmanuel', '/president_two.jpg', 10, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000002017', '2017', 'Dr. Tanyi Vincent', '/president_one.jpg', 20, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000002016', '2016', 'Mr. Fru Herbert', '/president_two.jpg', 30, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000002015', '2015', 'Barr. Kum Denis', '/president_one.jpg', 40, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000002014', '2014', 'Mr. Ngwa Bertrand', '/president_two.jpg', 50, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000002013', '2013', 'Eng. Fon Peter', '/president_one.jpg', 60, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000002012', '2012', 'Mr. Chi Emmanuel', '/president_two.jpg', 70, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000002011', '2011', 'Mr. Neba Vincent', '/president_one.jpg', 80, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000002010', '2010', 'Mr. Foncha Herbert', '/president_two.jpg', 90, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000002009', '2009', 'Dr. Mbah Denis', '/president_one.jpg', 100, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000002008', '2008', 'Mr. Nchang Bertrand', '/president_two.jpg', 110, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000002007', '2007', 'Barr. Awasum Peter', '/president_one.jpg', 120, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000002006', '2006', 'Mr. Bih Emmanuel', '/president_two.jpg', 130, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000002005', '2005', 'Eng. Kwenti Vincent', '/president_one.jpg', 140, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000002004', '2004', 'Mr. Nkeng Herbert', '/president_two.jpg', 150, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000002003', '2003', 'Mr. Ndifon Denis', '/president_one.jpg', 160, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000002002', '2002', 'Mr. Achu Bertrand', '/president_two.jpg', 170, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000002001', '2001', 'Dr. Tanyi Peter', '/president_one.jpg', 180, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000002000', '2000', 'Mr. Fru Emmanuel', '/president_two.jpg', 190, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001999', '1999', 'Barr. Kum Vincent', '/president_one.jpg', 200, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001998', '1998', 'Mr. Ngwa Herbert', '/president_two.jpg', 210, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001997', '1997', 'Eng. Fon Denis', '/president_one.jpg', 220, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001996', '1996', 'Mr. Chi Bertrand', '/president_two.jpg', 230, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001995', '1995', 'Mr. Neba Peter', '/president_one.jpg', 240, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001994', '1994', 'Mr. Foncha Emmanuel', '/president_two.jpg', 250, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001993', '1993', 'Dr. Mbah Vincent', '/president_one.jpg', 260, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001992', '1992', 'Mr. Nchang Herbert', '/president_two.jpg', 270, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001991', '1991', 'Barr. Awasum Denis', '/president_one.jpg', 280, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001990', '1990', 'Mr. Bih Bertrand', '/president_two.jpg', 290, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001989', '1989', 'Eng. Kwenti Peter', '/president_one.jpg', 300, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001988', '1988', 'Mr. Nkeng Emmanuel', '/president_two.jpg', 310, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001987', '1987', 'Mr. Ndifon Vincent', '/president_one.jpg', 320, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001986', '1986', 'Mr. Achu Herbert', '/president_two.jpg', 330, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001985', '1985', 'Dr. Tanyi Denis', '/president_one.jpg', 340, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001984', '1984', 'Mr. Fru Bertrand', '/president_two.jpg', 350, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001983', '1983', 'Barr. Kum Peter', '/president_one.jpg', 360, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001982', '1982', 'Mr. Ngwa Emmanuel', '/president_two.jpg', 370, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001981', '1981', 'Eng. Fon Vincent', '/president_one.jpg', 380, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001980', '1980', 'Mr. Chi Herbert', '/president_two.jpg', 390, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001979', '1979', 'Mr. Neba Denis', '/president_one.jpg', 400, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001978', '1978', 'Mr. Foncha Bertrand', '/president_two.jpg', 410, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001977', '1977', 'Dr. Mbah Peter', '/president_one.jpg', 420, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001976', '1976', 'Mr. Nchang Emmanuel', '/president_two.jpg', 430, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001975', '1975', 'Barr. Awasum Vincent', '/president_one.jpg', 440, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001974', '1974', 'Mr. Bih Herbert', '/president_two.jpg', 450, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001973', '1973', 'Eng. Kwenti Denis', '/president_one.jpg', 460, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001972', '1972', 'Mr. Nkeng Bertrand', '/president_two.jpg', 470, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001971', '1971', 'Mr. Ndifon Peter', '/president_one.jpg', 480, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001970', '1970', 'Mr. Achu Emmanuel', '/president_two.jpg', 490, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001969', '1969', 'Dr. Tanyi Vincent', '/president_one.jpg', 500, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001968', '1968', 'Mr. Fru Herbert', '/president_two.jpg', 510, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001967', '1967', 'Barr. Kum Denis', '/president_one.jpg', 520, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001966', '1966', 'Mr. Ngwa Bertrand', '/president_two.jpg', 530, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001965', '1965', 'Eng. Fon Peter', '/president_one.jpg', 540, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001964', '1964', 'Mr. Chi Emmanuel', '/president_two.jpg', 550, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001963', '1963', 'Mr. Neba Vincent', '/president_one.jpg', 560, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001962', '1962', 'Mr. Foncha Herbert', '/president_two.jpg', 570, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001961', '1961', 'Dr. Mbah Denis', '/president_one.jpg', 580, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001960', '1960', 'Mr. Nchang Bertrand', '/president_two.jpg', 590, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001959', '1959', 'Barr. Awasum Peter', '/president_one.jpg', 600, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001958', '1958', 'Mr. Bih Emmanuel', '/president_two.jpg', 610, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001957', '1957', 'Eng. Kwenti Vincent', '/president_one.jpg', 620, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001956', '1956', 'Mr. Nkeng Herbert', '/president_two.jpg', 630, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001955', '1955', 'Mr. Ndifon Denis', '/president_one.jpg', 640, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001954', '1954', 'Mr. Achu Bertrand', '/president_two.jpg', 650, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.batch_leaders VALUES ('aaaa5555-0000-0000-0000-000000001953', '1953', 'Dr. Tanyi Peter', '/president_one.jpg', 660, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;

INSERT INTO cms.branch_leaders VALUES ('aaaa3333-0000-0000-0000-000000000001', 'Yaoundé Branch', 'Mr. Neba Christian', 'Centre Region', '/president_one.jpg', 10, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.branch_leaders VALUES ('aaaa3333-0000-0000-0000-000000000002', 'Douala Branch', 'Dr. Fon Emile', 'Littoral Region', '/president_two.jpg', 20, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.branch_leaders VALUES ('aaaa3333-0000-0000-0000-000000000003', 'Buea Branch', 'Barr. Mbah Julius', 'South-West Region', '/president_one.jpg', 30, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.branch_leaders VALUES ('aaaa3333-0000-0000-0000-000000000004', 'Bamenda Branch', 'Mr. Kum Divine', 'North-West Region', '/president_two.jpg', 40, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.branch_leaders VALUES ('aaaa3333-0000-0000-0000-000000000005', 'Bafoussam Branch', 'Eng. Foncha Blaise', 'West Region', '/president_one.jpg', 50, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.branch_leaders VALUES ('aaaa3333-0000-0000-0000-000000000006', 'Kumba Branch', 'Dr. Nchang Peter', 'South-West Region', '/president_two.jpg', 60, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.branch_leaders VALUES ('aaaa3333-0000-0000-0000-000000000007', 'Limbe Branch', 'Mr. Fru Vincent', 'South-West Region', '/president_one.jpg', 70, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.branch_leaders VALUES ('aaaa3333-0000-0000-0000-000000000008', 'Ngaoundéré Branch', 'Barr. Awasum Denis', 'Adamawa Region', '/president_two.jpg', 80, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;

INSERT INTO cms.diaspora_leaders VALUES ('aaaa4444-0000-0000-0000-000000000001', 'USA Chapter', 'Dr. Chi Rodrigue', 'Washington DC · United States', '/president_one.jpg', 10, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.diaspora_leaders VALUES ('aaaa4444-0000-0000-0000-000000000002', 'Canada Chapter', 'Mr. Ndifon Blaise', 'Toronto · Canada', '/president_two.jpg', 20, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.diaspora_leaders VALUES ('aaaa4444-0000-0000-0000-000000000003', 'United Kingdom Chapter', 'Mr. Ngwa Alfred', 'London · United Kingdom', '/president_one.jpg', 30, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.diaspora_leaders VALUES ('aaaa4444-0000-0000-0000-000000000004', 'Germany Chapter', 'Eng. Fon Bertrand', 'Berlin · Germany', '/president_two.jpg', 40, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.diaspora_leaders VALUES ('aaaa4444-0000-0000-0000-000000000005', 'France Chapter', 'Barr. Awasum Simon', 'Paris · France', '/president_one.jpg', 50, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.diaspora_leaders VALUES ('aaaa4444-0000-0000-0000-000000000006', 'Belgium Chapter', 'Mr. Kum Emile', 'Brussels · Belgium', '/president_two.jpg', 60, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.diaspora_leaders VALUES ('aaaa4444-0000-0000-0000-000000000007', 'Nigeria Chapter', 'Mr. Tanyi Michael', 'Abuja · Nigeria', '/president_one.jpg', 70, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.diaspora_leaders VALUES ('aaaa4444-0000-0000-0000-000000000008', 'South Africa Chapter', 'Dr. Bih Christian', 'Johannesburg · South Africa', '/president_two.jpg', 80, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;

INSERT INTO cms.gallery_album_categories VALUES ('eeee1111-0000-0000-0000-000000000001', 'AGM', 10, '2026-09-02 19:07:24.41901+00', '2026-09-02 19:07:24.41901+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.gallery_album_categories VALUES ('eeee1111-0000-0000-0000-000000000002', 'Homecoming', 20, '2026-09-02 19:07:24.41901+00', '2026-09-02 19:07:24.41901+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.gallery_album_categories VALUES ('eeee1111-0000-0000-0000-000000000003', 'Ceremony', 30, '2026-09-02 19:07:24.41901+00', '2026-09-02 19:07:24.41901+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.gallery_album_categories VALUES ('eeee1111-0000-0000-0000-000000000004', 'Community', 40, '2026-09-02 19:07:24.41901+00', '2026-09-02 19:07:24.41901+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.gallery_album_categories VALUES ('eeee1111-0000-0000-0000-000000000005', 'Cultural', 50, '2026-09-02 19:07:24.41901+00', '2026-09-02 19:07:24.41901+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.gallery_album_categories VALUES ('eeee1111-0000-0000-0000-000000000006', 'Summit', 60, '2026-09-02 19:07:24.41901+00', '2026-09-02 19:07:24.41901+00') ON CONFLICT DO NOTHING;

INSERT INTO cms.site_events VALUES ('dddd2222-0000-0000-0000-000000000001', 'agm-2026', 'AGM 2026 · The Yaoundé Assembly', 'The 2026 Annual General Meeting — an AGM like never before. Reunions, honours, the unveiling of Vision 2030, and the Cultural Night to close.', '<p>The 2026 Annual General Meeting is set for Saturday, November 21 at Palais des Congrès, Yaoundé. Every branch, every diaspora chapter, every batch — one hall.</p><p>Vision 2030 will be unveiled, endorsed, and set in motion. Honours will be conferred on those whose service earned them the association''s highest recognition. And the Cultural Night will close out proceedings the way only a SHESA assembly can.</p>', '/hero_one.jpg', '2026-11-21 08:00:00+00', '2026-11-21 22:00:00+00', 'Palais des Congrès', 'Yaoundé, Cameroon', true, true, 'https://tickets.example.com/agm-2026', 15000.00, 'XAF', '["/hero_two.jpg", "/hero_three.jpg", "/hero_four.jpg"]', '[{"time": "08:00", "title": "Registration & Opening Prayers", "description": "Delegates check in, collect programme booklets and lanyards. Opening prayer led by the Chaplain."}, {"time": "09:00", "title": "Welcome Address", "description": "Dr. Etonge Ambe, National President, opens the assembly."}, {"time": "10:00", "title": "Chapter Reports", "description": "Branch and diaspora chairs present the state of their chapters for the year past."}, {"time": "12:30", "title": "Lunch & Fellowship", "description": "Two hours to eat, reconnect, and set up meetings for the afternoon breakouts."}, {"time": "14:30", "title": "Vision 2030 · The Unveiling", "description": "A working session to present, debate, and endorse the roadmap for the next four years."}, {"time": "16:00", "title": "Awards Ceremony", "description": "Honouring lifelong service, professional excellence, and this year''s rising Shesans."}, {"time": "18:00", "title": "Family Photograph & Recess", "description": "Delegates step outside for the annual group photograph, then break to change for the evening."}, {"time": "19:30", "title": "Cultural Night", "description": "Formal dinner, live music, traditional dance troupes, and remarks from the honoured guests."}]', NULL, '2026-09-02 19:07:24.412893+00', '2026-09-02 19:07:24.412893+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.site_events VALUES ('dddd2222-0000-0000-0000-000000000002', 'homecoming-2027', 'Homecoming Weekend 2027 · Roots & Wings', 'Back to the hill for the reunion of a generation. Three days, ten thousand memories, one weekend home.', '<p>The 2027 Homecoming Weekend takes over Sacred Heart College for three full days of reunion, celebration, and remembrance. Every batch, every corner of the diaspora, one long weekend on the hill.</p><p>Registration opens six months out. Watch this space for the batch coordinator list.</p>', '/hero_two.jpg', '2027-08-13 14:00:00+00', '2027-08-15 22:00:00+00', 'Sacred Heart College', 'Mankon · Bamenda', false, false, NULL, NULL, NULL, '[]', '[]', NULL, '2026-09-02 19:07:24.412893+00', '2026-09-02 19:07:24.412893+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.site_events VALUES ('dddd2222-0000-0000-0000-000000000003', 'diaspora-forum-2026', 'Diaspora Alumni Forum · Toronto 2026', 'A cross-chapter forum for diaspora professionals — one full day of career, mentorship, and network-building.', '<p>The inaugural Diaspora Alumni Forum brings together senior professionals from every diaspora chapter for a day of talks, panels, and structured mentorship pairings.</p>', '/hero_three.jpg', '2026-09-19 09:00:00+00', '2026-09-19 20:00:00+00', 'Metro Toronto Convention Centre', 'Toronto · Canada', false, true, 'https://tickets.example.com/diaspora-forum-2026', 120.00, 'CAD', '[]', '[]', NULL, '2026-09-02 19:07:24.412893+00', '2026-09-02 19:07:24.412893+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.site_events VALUES ('dddd2222-0000-0000-0000-000000000004', 'foundation-day-2023', 'Foundation Day 2023', 'Honouring the roots that hold us all — the annual Mass, the wreath at the tomb, and the alumni assembly on the hill.', '<p>Every February 11 we return. The morning Mass. The wreath at the founder''s tomb. The alumni assembly on the college quad. And the private lunch that closes the day.</p>', '/hero_five.jpg', '2023-02-11 08:00:00+00', '2023-02-11 18:00:00+00', 'Sacred Heart College', 'Mankon · Bamenda', false, false, NULL, NULL, NULL, '[]', '[]', 'foundation-day-2023', '2026-09-02 19:07:24.412893+00', '2026-09-02 19:07:24.412893+00') ON CONFLICT DO NOTHING;

INSERT INTO cms.gallery_albums VALUES ('eeee2222-0000-0000-0000-000000000001', 'agm-2024', 'AGM 2024', 'November 2024', 'Ayaba Hotel · Bamenda', 'The biggest AGM in a decade — and just the warm-up for what comes next in Yaoundé.', '/hero_three.jpg', 'Ndifon Peter', NULL, 10, '2026-09-02 19:07:24.41901+00', '2026-09-02 19:07:24.41901+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.gallery_albums VALUES ('eeee2222-0000-0000-0000-000000000002', 'homecoming-2024', 'Homecoming Weekend 2024', 'August 2024', 'SHESA Campus · Buea', 'Two decades of memories, one long, unforgettable weekend on the hill.', '/hero_one.jpg', 'The Media Team', NULL, 20, '2026-09-02 19:07:24.41901+00', '2026-09-02 19:07:24.41901+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.gallery_albums VALUES ('eeee2222-0000-0000-0000-000000000003', 'scholarship-gala-2023', 'Scholarship Gala 2023', 'December 2023', 'Hilton Hotel · Yaoundé', 'Honouring the next generation of Shesa scholars, and the donors behind them.', '/hero_five.jpg', NULL, NULL, 30, '2026-09-02 19:07:24.41901+00', '2026-09-02 19:07:24.41901+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.gallery_albums VALUES ('eeee2222-0000-0000-0000-000000000004', 'foundation-day-2023', 'Foundation Day 2023', 'February 2023', 'Sacred Heart College · Mankon', 'The day we honour the roots that hold us all — Mass, wreath, and the alumni assembly.', '/hero_two.jpg', NULL, 'dddd2222-0000-0000-0000-000000000004', 40, '2026-09-02 19:07:24.41901+00', '2026-09-02 19:07:24.41901+00') ON CONFLICT DO NOTHING;

INSERT INTO cms.gallery_album_categories_map VALUES ('eeee2222-0000-0000-0000-000000000001', 'eeee1111-0000-0000-0000-000000000001') ON CONFLICT DO NOTHING;
INSERT INTO cms.gallery_album_categories_map VALUES ('eeee2222-0000-0000-0000-000000000002', 'eeee1111-0000-0000-0000-000000000002') ON CONFLICT DO NOTHING;
INSERT INTO cms.gallery_album_categories_map VALUES ('eeee2222-0000-0000-0000-000000000003', 'eeee1111-0000-0000-0000-000000000003') ON CONFLICT DO NOTHING;
INSERT INTO cms.gallery_album_categories_map VALUES ('eeee2222-0000-0000-0000-000000000004', 'eeee1111-0000-0000-0000-000000000003') ON CONFLICT DO NOTHING;

INSERT INTO cms.gallery_media VALUES ('eeee3333-0000-0000-0000-000000000001', 'eeee2222-0000-0000-0000-000000000001', 'photo', '/hero_three.jpg', NULL, NULL, 'AGM 2024 · 1', '4/3', 10, '2026-09-02 19:07:24.41901+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.gallery_media VALUES ('eeee3333-0000-0000-0000-000000000002', 'eeee2222-0000-0000-0000-000000000001', 'photo', '/hero_one.jpg', NULL, NULL, 'AGM 2024 · 2', '3/2', 20, '2026-09-02 19:07:24.41901+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.gallery_media VALUES ('eeee3333-0000-0000-0000-000000000003', 'eeee2222-0000-0000-0000-000000000001', 'photo', '/hero_two.jpg', NULL, NULL, 'AGM 2024 · 3', '2/3', 30, '2026-09-02 19:07:24.41901+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.gallery_media VALUES ('eeee3333-0000-0000-0000-000000000004', 'eeee2222-0000-0000-0000-000000000001', 'photo', '/hero_four.jpg', NULL, NULL, 'AGM 2024 · 4', '3/4', 40, '2026-09-02 19:07:24.41901+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.gallery_media VALUES ('eeee3333-0000-0000-0000-000000000005', 'eeee2222-0000-0000-0000-000000000002', 'photo', '/hero_one.jpg', NULL, NULL, 'Homecoming 2024 · 1', '4/3', 10, '2026-09-02 19:07:24.41901+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.gallery_media VALUES ('eeee3333-0000-0000-0000-000000000006', 'eeee2222-0000-0000-0000-000000000002', 'photo', '/hero_five.jpg', NULL, NULL, 'Homecoming 2024 · 2', '3/2', 20, '2026-09-02 19:07:24.41901+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.gallery_media VALUES ('eeee3333-0000-0000-0000-000000000007', 'eeee2222-0000-0000-0000-000000000002', 'photo', '/president_one.jpg', NULL, NULL, 'Homecoming 2024 · 3', '1/1', 30, '2026-09-02 19:07:24.41901+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.gallery_media VALUES ('eeee3333-0000-0000-0000-000000000008', 'eeee2222-0000-0000-0000-000000000003', 'photo', '/hero_five.jpg', NULL, NULL, 'Scholarship Gala · 1', '4/3', 10, '2026-09-02 19:07:24.41901+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.gallery_media VALUES ('eeee3333-0000-0000-0000-000000000009', 'eeee2222-0000-0000-0000-000000000003', 'photo', '/president_two.jpg', NULL, NULL, 'Scholarship Gala · 2', '1/1', 20, '2026-09-02 19:07:24.41901+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.gallery_media VALUES ('eeee3333-0000-0000-0000-00000000000a', 'eeee2222-0000-0000-0000-000000000004', 'photo', '/hero_two.jpg', NULL, NULL, 'Foundation Day · 1', '3/2', 10, '2026-09-02 19:07:24.41901+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.gallery_media VALUES ('eeee3333-0000-0000-0000-00000000000b', 'eeee2222-0000-0000-0000-000000000004', 'photo', '/hero_three.jpg', NULL, NULL, 'Foundation Day · 2', '3/4', 20, '2026-09-02 19:07:24.41901+00') ON CONFLICT DO NOTHING;

INSERT INTO cms.mainstream_sectors VALUES ('aaaa1111-0000-0000-0000-000000000001', 'The Executive', 'The office of the President', 10, true, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.mainstream_sectors VALUES ('aaaa1111-0000-0000-0000-000000000002', 'Council Portfolios', 'The working core of the association', 20, true, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.mainstream_sectors VALUES ('aaaa1111-0000-0000-0000-000000000003', 'Coordinators', 'Portfolios and programme leads', 30, true, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.mainstream_sectors VALUES ('aaaa1111-0000-0000-0000-000000000004', 'Advisory Council', 'Counsel, oversight, and stewardship', 40, true, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;

INSERT INTO cms.mainstream_leaders VALUES ('aaaa2222-0000-0000-0000-000000000001', 'aaaa1111-0000-0000-0000-000000000001', 'National President', 'Dr. Etonge Ambe', 'Yaoundé · Cameroon', '/president_one.jpg', 10, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.mainstream_leaders VALUES ('aaaa2222-0000-0000-0000-000000000002', 'aaaa1111-0000-0000-0000-000000000001', 'Vice President', 'Barr. Achu Nkeng', 'Buea · Cameroon', '/president_two.jpg', 20, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.mainstream_leaders VALUES ('aaaa2222-0000-0000-0000-000000000003', 'aaaa1111-0000-0000-0000-000000000001', 'Secretary General', 'Eng. Ndifon Nkweta', 'Douala · Cameroon', '/president_one.jpg', 30, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.mainstream_leaders VALUES ('aaaa2222-0000-0000-0000-000000000004', 'aaaa1111-0000-0000-0000-000000000002', 'Treasurer', 'Mrs. Tanyi Bih', NULL, '/president_two.jpg', 10, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.mainstream_leaders VALUES ('aaaa2222-0000-0000-0000-000000000005', 'aaaa1111-0000-0000-0000-000000000002', 'Financial Secretary', 'Mr. Ngwa Divine', NULL, '/president_one.jpg', 20, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.mainstream_leaders VALUES ('aaaa2222-0000-0000-0000-000000000006', 'aaaa1111-0000-0000-0000-000000000002', 'Asst. Secretary General', 'Mrs. Awasum Grace', NULL, '/president_two.jpg', 30, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.mainstream_leaders VALUES ('aaaa2222-0000-0000-0000-000000000007', 'aaaa1111-0000-0000-0000-000000000002', 'Communications Secretary', 'Mr. Fru Wilson', NULL, '/president_one.jpg', 40, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.mainstream_leaders VALUES ('aaaa2222-0000-0000-0000-000000000008', 'aaaa1111-0000-0000-0000-000000000003', 'Programs Secretary', 'Dr. Chi Emmanuel', NULL, '/president_two.jpg', 10, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.mainstream_leaders VALUES ('aaaa2222-0000-0000-0000-000000000009', 'aaaa1111-0000-0000-0000-000000000003', 'Welfare Secretary', 'Mrs. Nkeng Josephine', NULL, '/president_one.jpg', 20, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.mainstream_leaders VALUES ('aaaa2222-0000-0000-0000-00000000000a', 'aaaa1111-0000-0000-0000-000000000003', 'Publicity Secretary', 'Mr. Achu Jean', NULL, '/president_two.jpg', 30, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.mainstream_leaders VALUES ('aaaa2222-0000-0000-0000-00000000000b', 'aaaa1111-0000-0000-0000-000000000003', 'Women''s Coordinator', 'Mrs. Fon Beatrice', NULL, '/president_one.jpg', 40, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.mainstream_leaders VALUES ('aaaa2222-0000-0000-0000-00000000000c', 'aaaa1111-0000-0000-0000-000000000003', 'Youth Coordinator', 'Mr. Tanyi Peter', NULL, '/president_two.jpg', 50, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.mainstream_leaders VALUES ('aaaa2222-0000-0000-0000-00000000000d', 'aaaa1111-0000-0000-0000-000000000004', 'Legal Adviser', 'Barr. Ndifon George', NULL, '/president_one.jpg', 10, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.mainstream_leaders VALUES ('aaaa2222-0000-0000-0000-00000000000e', 'aaaa1111-0000-0000-0000-000000000004', 'Chaplain', 'Rev. Fr. Kwenti Anthony', NULL, '/president_two.jpg', 20, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.mainstream_leaders VALUES ('aaaa2222-0000-0000-0000-00000000000f', 'aaaa1111-0000-0000-0000-000000000004', 'Provost', 'Mr. Bih Roland', NULL, '/president_one.jpg', 30, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.mainstream_leaders VALUES ('aaaa2222-0000-0000-0000-000000000010', 'aaaa1111-0000-0000-0000-000000000004', 'Auditor', 'Mr. Ngwa Charles', NULL, '/president_two.jpg', 40, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.mainstream_leaders VALUES ('aaaa2222-0000-0000-0000-000000000011', 'aaaa1111-0000-0000-0000-000000000004', 'Immediate Past President', 'Dr. Achu Samuel', NULL, '/president_one.jpg', 50, '2026-09-02 19:07:24.394188+00', '2026-09-02 19:07:24.394188+00') ON CONFLICT DO NOTHING;

INSERT INTO cms.organ_sectors VALUES ('ffff1111-0000-0000-0000-000000000001', 'National (Cameroon)', 'national-cameroon', 'The national body and the regional branches inside Cameroon.', 10, '2026-09-02 19:07:24.424665+00', '2026-09-02 19:07:24.424665+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.organ_sectors VALUES ('ffff1111-0000-0000-0000-000000000002', 'West Africa', 'west-africa', 'SHESA chapters across the West-African diaspora.', 20, '2026-09-02 19:07:24.424665+00', '2026-09-02 19:07:24.424665+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.organ_sectors VALUES ('ffff1111-0000-0000-0000-000000000003', 'Europe', 'europe', 'European chapters — from Berlin to Paris to London.', 30, '2026-09-02 19:07:24.424665+00', '2026-09-02 19:07:24.424665+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.organ_sectors VALUES ('ffff1111-0000-0000-0000-000000000004', 'North America', 'north-america', 'US and Canadian chapters.', 40, '2026-09-02 19:07:24.424665+00', '2026-09-02 19:07:24.424665+00') ON CONFLICT DO NOTHING;

INSERT INTO cms.organs VALUES ('ffff2222-0000-0000-0000-000000000001', 'ffff1111-0000-0000-0000-000000000001', 'shesa-national', 'SHESA National', 'National', 'Yaoundé', 'Cameroon', 1998, 1240, 'The national body — coordinates the branches across Cameroon and represents SHESA at every AGM.', NULL, 'national@shesaconnect.com', NULL, NULL, 10, '2026-09-02 19:07:24.424665+00', '2026-09-02 19:07:24.424665+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.organs VALUES ('ffff2222-0000-0000-0000-000000000002', 'ffff1111-0000-0000-0000-000000000001', 'branch-bamenda', 'Bamenda Branch', 'Bamenda', 'Bamenda', 'Cameroon', 2001, 320, 'The North-West chapter — home to Foundation Day 2023 and the health-outreach programme.', NULL, 'bamenda@shesaconnect.com', NULL, NULL, 20, '2026-09-02 19:07:24.424665+00', '2026-09-02 19:07:24.424665+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.organs VALUES ('ffff2222-0000-0000-0000-000000000003', 'ffff1111-0000-0000-0000-000000000001', 'branch-douala', 'Douala Branch', 'Douala', 'Douala', 'Cameroon', 2000, 415, 'The Littoral chapter — largest of the Cameroon regional bodies.', NULL, 'douala@shesaconnect.com', NULL, NULL, 30, '2026-09-02 19:07:24.424665+00', '2026-09-02 19:07:24.424665+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.organs VALUES ('ffff2222-0000-0000-0000-000000000004', 'ffff1111-0000-0000-0000-000000000001', 'branch-yaounde', 'Yaoundé Branch', 'Yaoundé', 'Yaoundé', 'Cameroon', 2001, 380, 'The Centre chapter — the AGM 2026 host branch.', NULL, 'yaounde@shesaconnect.com', NULL, NULL, 40, '2026-09-02 19:07:24.424665+00', '2026-09-02 19:07:24.424665+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.organs VALUES ('ffff2222-0000-0000-0000-000000000005', 'ffff1111-0000-0000-0000-000000000003', 'chapter-berlin', 'Berlin Chapter', 'Berlin', 'Berlin', 'Germany', 2010, 62, 'The oldest European chapter — organises the annual Cultural Weekend in June.', NULL, 'berlin@shesaconnect.com', NULL, NULL, 10, '2026-09-02 19:07:24.424665+00', '2026-09-02 19:07:24.424665+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.organs VALUES ('ffff2222-0000-0000-0000-000000000006', 'ffff1111-0000-0000-0000-000000000003', 'chapter-london', 'London Chapter', 'London', 'London', 'United Kingdom', 2014, 48, 'The UK chapter — anchors the Homecoming fundraiser drives.', NULL, 'london@shesaconnect.com', NULL, NULL, 20, '2026-09-02 19:07:24.424665+00', '2026-09-02 19:07:24.424665+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.organs VALUES ('ffff2222-0000-0000-0000-000000000007', 'ffff1111-0000-0000-0000-000000000004', 'chapter-usa', 'USA Chapter', 'USA', 'Washington DC', 'United States', 2012, 84, 'The US-wide chapter — coordinates the North-American Homecoming events.', NULL, 'usa@shesaconnect.com', NULL, NULL, 10, '2026-09-02 19:07:24.424665+00', '2026-09-02 19:07:24.424665+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.organs VALUES ('ffff2222-0000-0000-0000-000000000008', 'ffff1111-0000-0000-0000-000000000004', 'chapter-canada', 'Canada Chapter', 'Canada', 'Toronto', 'Canada', 2016, 36, 'The Canadian chapter — Toronto-based, growing on the West Coast.', NULL, 'canada@shesaconnect.com', NULL, NULL, 20, '2026-09-02 19:07:24.424665+00', '2026-09-02 19:07:24.424665+00') ON CONFLICT DO NOTHING;

INSERT INTO cms.project_categories VALUES ('cccc1111-0000-0000-0000-000000000001', 'Education', 10, '2026-09-02 19:07:24.407221+00', '2026-09-02 19:07:24.407221+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.project_categories VALUES ('cccc1111-0000-0000-0000-000000000002', 'Health', 20, '2026-09-02 19:07:24.407221+00', '2026-09-02 19:07:24.407221+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.project_categories VALUES ('cccc1111-0000-0000-0000-000000000003', 'Infrastructure', 30, '2026-09-02 19:07:24.407221+00', '2026-09-02 19:07:24.407221+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.project_categories VALUES ('cccc1111-0000-0000-0000-000000000004', 'Community', 40, '2026-09-02 19:07:24.407221+00', '2026-09-02 19:07:24.407221+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.project_categories VALUES ('cccc1111-0000-0000-0000-000000000005', 'Finance', 50, '2026-09-02 19:07:24.407221+00', '2026-09-02 19:07:24.407221+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.project_categories VALUES ('cccc1111-0000-0000-0000-000000000006', 'Career', 60, '2026-09-02 19:07:24.407221+00', '2026-09-02 19:07:24.407221+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.project_categories VALUES ('cccc1111-0000-0000-0000-000000000007', 'Culture', 70, '2026-09-02 19:07:24.407221+00', '2026-09-02 19:07:24.407221+00') ON CONFLICT DO NOTHING;

INSERT INTO cms.projects VALUES ('cccc2222-0000-0000-0000-000000000001', 'endowment-fund', 'SHESA Endowment Fund', 'Building a permanent capital base to fund SHESA missions in perpetuity.', '<p>The Endowment Fund is the association''s long-horizon answer to short-term fundraising fatigue. Instead of raising money project-by-project, we build a permanent capital base and fund every future initiative from the income it generates.</p><p>The target is XAF 500 million by the end of 2028. Every gift, however small, is invested in a diversified low-volatility portfolio managed by an independent trustee committee.</p><p>Contributors receive an annual statement of the fund''s performance, along with a breakdown of the missions it funded that year. Full transparency is not negotiable.</p>', '/hero_two.jpg', 'Fundraising', 'January 2024', 'National', 'Mrs. Tanyi Bih, Treasurer', true, 178000000.00, 500000000.00, 'XAF', '[{"body": "Trust deed signed. Independent trustees appointed.", "date": "Jan 2024", "done": true, "title": "Fund constituted"}, {"body": "Milestone marked with a donor recognition dinner in Yaoundé.", "date": "Jun 2024", "done": true, "title": "First XAF 100M crossed"}, {"body": "Online giving channel launched for USA, Canada, UK, and EU donors.", "date": "Nov 2024", "done": true, "title": "Diaspora giving activated"}, {"body": "The AGM-year milestone. Announcement scheduled for the Yaoundé assembly.", "date": "Nov 2026", "title": "XAF 300M target"}, {"body": "The endowment fund is self-sustaining and closed to further fundraising.", "date": "Dec 2028", "title": "Full XAF 500M target"}]', '[{"label": "To goal", "value": "35%"}, {"label": "Contributors", "value": "820+"}, {"label": "Diaspora chapters giving", "value": "12"}]', '2026-09-02 19:07:24.407221+00', '2026-09-02 19:07:24.407221+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.projects VALUES ('cccc2222-0000-0000-0000-000000000002', 'scholarship-programme', 'Alumni Scholarship Programme', 'Sending the brightest students to school on the shoulders of alumni who came before.', '<p>The scholarship programme underwrites tuition, boarding, and books for high-performing SHESA-aligned students whose families cannot fully bear the cost. Awards range from partial to full, depending on need.</p><p>Selection is handled by the Programs Committee against strict academic and character criteria. The programme is fully anonymised — donors do not choose recipients, and recipients do not know their donors unless both parties opt in.</p><p>Since its formal launch in 2016, the programme has grown from 8 awards a year to 38 in 2024 — the largest cohort to date.</p>', '/hero_three.jpg', 'Active', 'September 2016', 'National + diaspora', 'Dr. Chi Emmanuel, Programs Secretary', true, NULL, NULL, NULL, '[{"body": "First cohort of 8 recipients.", "date": "Sep 2016", "done": true, "title": "Programme launched"}, {"date": "2020", "done": true, "title": "20 awards a year milestone"}, {"date": "2024", "done": true, "title": "38-award record cohort"}, {"body": "Linked to endowment fund performance.", "date": "2028", "title": "Expand to 60 awards / year"}]', '[{"label": "Scholarships awarded", "value": "1,850+"}, {"label": "2024 cohort", "value": "38"}, {"label": "University matriculation rate", "value": "92%"}]', '2026-09-02 19:07:24.407221+00', '2026-09-02 19:07:24.407221+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.projects VALUES ('cccc2222-0000-0000-0000-000000000003', 'infrastructure-renewal', 'School Infrastructure Renewal', 'Restoring the halls, labs, and libraries that shaped generations of SHESA scholars.', '<p>A rolling programme to restore, repair, and modernise the physical fabric of Sacred Heart College — with the school''s Board and the parent-teacher association as full partners.</p><p>The pipeline includes classroom blocks, the science laboratories, the library, staff quarters, and the sports pitches. Each intervention is scoped, quoted, and audited independently.</p><p>The most recent completed project was the restoration of the West Wing classroom block — funded by two diaspora chapters and matched by the endowment income for the year.</p>', '/hero_four.jpg', 'Ongoing', 'March 2019', 'Sacred Heart College, Mankon', 'Eng. Foncha Blaise, Bafoussam Branch', false, NULL, NULL, NULL, '[{"date": "2019", "done": true, "title": "West Dorm restoration"}, {"date": "2021", "done": true, "title": "Chapel repairs"}, {"date": "2023", "done": true, "title": "Science labs upgrade"}, {"date": "2024", "done": true, "title": "West Wing classroom block"}, {"body": "Fundraising in progress.", "date": "2026", "title": "Library modernisation"}, {"date": "2028", "title": "Sports facilities"}]', '[{"label": "Blocks restored", "value": "4"}, {"label": "Deployed", "value": "XAF 220M"}, {"label": "Students impacted", "value": "3,400+"}]', '2026-09-02 19:07:24.407221+00', '2026-09-02 19:07:24.407221+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.projects VALUES ('cccc2222-0000-0000-0000-000000000004', 'health-outreach', 'Community Health Outreach', 'Free consultations, screenings, and specialist care in underserved communities.', '<p>A rolling programme of medical outreach drives coordinated by the Welfare Portfolio in partnership with alumni doctors, nurses, and pharmacists.</p><p>Each drive lasts three to five days and includes general consultations, chronic-disease screenings (hypertension, diabetes, glaucoma), and specialist referrals for cases beyond primary-care scope.</p><p>Since 2021 the programme has served over 12,000 residents across six regions. Bamenda alone has been visited three times.</p>', '/hero_five.jpg', 'Active', 'March 2021', 'Rotating (Bamenda, Buea, Kumba, Ndop)', 'Mrs. Nkeng Josephine, Welfare Secretary', true, NULL, NULL, NULL, '[{"body": "The template for everything that followed.", "date": "Mar 2021", "done": true, "title": "First drive · Bamenda"}, {"body": "Buea, Kumba, Ndop added to the rotation.", "date": "2022–2024", "done": true, "title": "Regional expansion"}, {"body": "The Q4 drive.", "date": "Dec 2026", "title": "Bamenda return"}, {"body": "Adding vision and dental care.", "date": "2027", "title": "Specialist wing pilot"}]', '[{"label": "Consultations delivered", "value": "12,300+"}, {"label": "Alumni volunteers per drive", "value": "15"}, {"label": "Regions reached", "value": "6"}]', '2026-09-02 19:07:24.407221+00', '2026-09-02 19:07:24.407221+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.projects VALUES ('cccc2222-0000-0000-0000-000000000005', 'digital-library', 'Digital Library Initiative', 'A global digital archive of SHESA academic resources — open to students everywhere.', '<p>A long-planned initiative to digitise every academic resource ever printed by or for SHESA students — from past exam papers to lecture notes, from staff-produced handbooks to the college magazine archive.</p><p>Full-text search, subject filters, and download. Access is free for SHESA students and alumni; a modest subscription supports upkeep and scanning for non-alumni users.</p><p>Design and scope work is complete. The build phase is fundraising-dependent.</p>', '/hero_one.jpg', 'Planning', 'Planning · Q3 2025', 'Cloud-hosted', 'Mr. Fru Wilson, Communications Secretary', false, NULL, NULL, NULL, '[{"date": "Q3 2025", "done": true, "title": "Design + scope"}, {"date": "Q4 2025", "title": "Fundraising launched"}, {"date": "Q2 2026", "title": "Digitisation begins"}, {"date": "Q4 2026", "title": "Public beta"}, {"date": "Q1 2027", "title": "Full launch"}]', '[{"label": "Documents identified", "value": "~40k"}, {"label": "Decades of coverage", "value": "6"}]', '2026-09-02 19:07:24.407221+00', '2026-09-02 19:07:24.407221+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.projects VALUES ('cccc2222-0000-0000-0000-000000000006', 'mentorship-platform', 'Career Mentorship Platform', 'Connecting graduating scholars with alumni mentors across industries and continents.', '<p>A structured mentorship pairing between graduating scholars and mid- to senior-career alumni. Each pairing runs for 12 months and includes a monthly check-in, one professional introduction, and access to the alumni knowledge base.</p><p>Pairings are made by the Programs Committee based on the mentee''s stated interests, the mentor''s expertise, and geography where relevant.</p><p>The platform launched in beta in 2023 and has since seen 320 successful pairings.</p>', '/hero_two.jpg', 'Ongoing', 'August 2023', 'National + diaspora', 'Mr. Tanyi Peter, Youth Coordinator', false, NULL, NULL, NULL, '[{"date": "Aug 2023", "done": true, "title": "Beta launch"}, {"date": "Jun 2024", "done": true, "title": "200 pairings"}, {"date": "Feb 2025", "title": "Full platform launch"}, {"date": "Q4 2026", "title": "500 pairings target"}]', '[{"label": "Mentorship pairings", "value": "320+"}, {"label": "Programme completion rate", "value": "87%"}, {"label": "Industries represented", "value": "45+"}]', '2026-09-02 19:07:24.407221+00', '2026-09-02 19:07:24.407221+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.projects VALUES ('cccc2222-0000-0000-0000-000000000007', 'girls-school-renovation', 'Girls'' School Renovation', 'A joint SHESA-Community project — two classroom blocks and a small library, restored end to end.', '<p>Rehabilitation of two classroom blocks and the establishment of the Sister Mary Library at St. Bernadette Girls'' School — a joint project of SHESA, the school''s parent-teacher association, and the local council.</p><p>The project was funded by contributions from three diaspora chapters and matched by the Community Investment Fund. Total spend: XAF 42 million over 14 months.</p><p>A formal handover ceremony took place in February 2026. The library has since become the primary study space for over 300 students.</p>', '/hero_three.jpg', 'Completed', 'December 2024', 'St. Bernadette Girls'' School', 'Diaspora Coordination', false, NULL, NULL, NULL, '[{"date": "Dec 2024", "done": true, "title": "Project scoped + funded"}, {"date": "Sep 2025", "done": true, "title": "Construction complete"}, {"date": "Feb 2026", "done": true, "title": "Handover ceremony"}]', '[{"label": "Classroom blocks", "value": "2"}, {"label": "Library established", "value": "1"}, {"label": "Students now served", "value": "300+"}]', '2026-09-02 19:07:24.407221+00', '2026-09-02 19:07:24.407221+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.projects VALUES ('cccc2222-0000-0000-0000-000000000008', 'business-incubator', 'Alumni Business Incubator', 'A structured incubator for early-stage founders in the SHESA network.', '<p>A structured incubator for early-stage founders — pre-seed to seed — who are alumni of the college. The programme includes 12 weeks of workshops, weekly office hours with experienced founders, and access to a pool of angel checks contributed by senior alumni.</p><p>Each cohort will accept 8 founders. The first cohort is planned to launch in early 2027.</p>', '/hero_four.jpg', 'Planning', 'Design · Q1 2026', 'Douala (in person)', 'Alumni Business Forum', false, NULL, NULL, NULL, '[{"date": "Q1 2026", "done": true, "title": "Curriculum + partner network"}, {"date": "Q3 2026", "title": "Angel pool constituted"}, {"date": "Q1 2027", "title": "Cohort 1 launches"}]', '[{"label": "Founders per cohort (planned)", "value": "8"}]', '2026-09-02 19:07:24.407221+00', '2026-09-02 19:07:24.407221+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.projects VALUES ('cccc2222-0000-0000-0000-000000000009', 'cultural-preservation', 'Cultural Preservation Fund', 'Preserving the songs, traditions, and folklore of the SHESA experience.', '<p>A dedicated fund to record, archive, and reissue the songs, chants, and traditions that make up the SHESA cultural inheritance — from the anthems that still ring in every reunion to the parade chants only certain classes remember.</p><p>The fund also supports the annual Cultural Night at each AGM, and underwrites the traditional dance troupes and choral groups that appear at official events.</p>', '/hero_five.jpg', 'Fundraising', 'October 2025', 'National', 'Mr. Achu Jean, Publicity Secretary', false, 12500000.00, 60000000.00, 'XAF', '[{"date": "Oct 2025", "done": true, "title": "Fund constituted"}, {"date": "2026", "title": "First 25 songs recorded + released"}, {"date": "2027", "title": "Public archive launched"}]', '[{"label": "Songs archived so far", "value": "18"}, {"label": "Traditions documented", "value": "4"}]', '2026-09-02 19:07:24.407221+00', '2026-09-02 19:07:24.407221+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.projects VALUES ('cccc2222-0000-0000-0000-000000000010', 'emergency-relief', 'Emergency Relief Fund', 'Rapid financial and material support for alumni and their families in crisis.', '<p>A standing fund that can be deployed within 48 hours for confirmed cases of medical emergency, natural disaster, or acute loss affecting Shesans and their immediate family.</p><p>Requests are triaged by a small standing committee. Disbursements are capped per case and recorded transparently in the annual welfare report.</p><p>Since its constitution in 2022 the fund has responded to 47 confirmed cases.</p>', '/hero_one.jpg', 'Active', 'April 2022', 'National + diaspora', 'Welfare Portfolio', false, NULL, NULL, NULL, '[{"date": "Apr 2022", "done": true, "title": "Fund constituted"}, {"date": "Dec 2024", "done": true, "title": "25th disbursement"}, {"date": "Nov 2025", "done": true, "title": "47th disbursement"}]', '[{"label": "Cases supported", "value": "47"}, {"label": "Median response", "value": "48 hrs"}]', '2026-09-02 19:07:24.407221+00', '2026-09-02 19:07:24.407221+00') ON CONFLICT DO NOTHING;

INSERT INTO cms.project_categories_map VALUES ('cccc2222-0000-0000-0000-000000000001', 'cccc1111-0000-0000-0000-000000000005') ON CONFLICT DO NOTHING;
INSERT INTO cms.project_categories_map VALUES ('cccc2222-0000-0000-0000-000000000002', 'cccc1111-0000-0000-0000-000000000001') ON CONFLICT DO NOTHING;
INSERT INTO cms.project_categories_map VALUES ('cccc2222-0000-0000-0000-000000000003', 'cccc1111-0000-0000-0000-000000000003') ON CONFLICT DO NOTHING;
INSERT INTO cms.project_categories_map VALUES ('cccc2222-0000-0000-0000-000000000004', 'cccc1111-0000-0000-0000-000000000002') ON CONFLICT DO NOTHING;
INSERT INTO cms.project_categories_map VALUES ('cccc2222-0000-0000-0000-000000000005', 'cccc1111-0000-0000-0000-000000000001') ON CONFLICT DO NOTHING;
INSERT INTO cms.project_categories_map VALUES ('cccc2222-0000-0000-0000-000000000006', 'cccc1111-0000-0000-0000-000000000006') ON CONFLICT DO NOTHING;
INSERT INTO cms.project_categories_map VALUES ('cccc2222-0000-0000-0000-000000000007', 'cccc1111-0000-0000-0000-000000000003') ON CONFLICT DO NOTHING;
INSERT INTO cms.project_categories_map VALUES ('cccc2222-0000-0000-0000-000000000008', 'cccc1111-0000-0000-0000-000000000006') ON CONFLICT DO NOTHING;
INSERT INTO cms.project_categories_map VALUES ('cccc2222-0000-0000-0000-000000000009', 'cccc1111-0000-0000-0000-000000000007') ON CONFLICT DO NOTHING;
INSERT INTO cms.project_categories_map VALUES ('cccc2222-0000-0000-0000-000000000010', 'cccc1111-0000-0000-0000-000000000004') ON CONFLICT DO NOTHING;

INSERT INTO cms.site_event_categories VALUES ('dddd1111-0000-0000-0000-000000000001', 'Reunion', 10, '2026-09-02 19:07:24.412893+00', '2026-09-02 19:07:24.412893+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.site_event_categories VALUES ('dddd1111-0000-0000-0000-000000000002', 'Ceremony', 20, '2026-09-02 19:07:24.412893+00', '2026-09-02 19:07:24.412893+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.site_event_categories VALUES ('dddd1111-0000-0000-0000-000000000003', 'Community', 30, '2026-09-02 19:07:24.412893+00', '2026-09-02 19:07:24.412893+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.site_event_categories VALUES ('dddd1111-0000-0000-0000-000000000004', 'Cultural', 40, '2026-09-02 19:07:24.412893+00', '2026-09-02 19:07:24.412893+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.site_event_categories VALUES ('dddd1111-0000-0000-0000-000000000005', 'Fundraising', 50, '2026-09-02 19:07:24.412893+00', '2026-09-02 19:07:24.412893+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.site_event_categories VALUES ('dddd1111-0000-0000-0000-000000000006', 'Career', 60, '2026-09-02 19:07:24.412893+00', '2026-09-02 19:07:24.412893+00') ON CONFLICT DO NOTHING;

INSERT INTO cms.site_event_categories_map VALUES ('dddd2222-0000-0000-0000-000000000001', 'dddd1111-0000-0000-0000-000000000001') ON CONFLICT DO NOTHING;
INSERT INTO cms.site_event_categories_map VALUES ('dddd2222-0000-0000-0000-000000000002', 'dddd1111-0000-0000-0000-000000000001') ON CONFLICT DO NOTHING;
INSERT INTO cms.site_event_categories_map VALUES ('dddd2222-0000-0000-0000-000000000003', 'dddd1111-0000-0000-0000-000000000006') ON CONFLICT DO NOTHING;
INSERT INTO cms.site_event_categories_map VALUES ('dddd2222-0000-0000-0000-000000000004', 'dddd1111-0000-0000-0000-000000000002') ON CONFLICT DO NOTHING;

INSERT INTO cms.song_groups VALUES ('aaab1111-0000-0000-0000-000000000001', 'Anthems', 'anthems', 'The SHESA anthems — sung at every AGM, every Homecoming.', 10, '2026-09-02 19:07:24.429988+00', '2026-09-02 19:07:24.429988+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.song_groups VALUES ('aaab1111-0000-0000-0000-000000000002', 'Chapter Songs', 'chapter-songs', 'Songs written by individual chapters, from Bamenda to Berlin.', 20, '2026-09-02 19:07:24.429988+00', '2026-09-02 19:07:24.429988+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.song_groups VALUES ('aaab1111-0000-0000-0000-000000000003', 'Cultural', 'cultural', 'Cultural pieces that anchor the annual Cultural Weekend.', 30, '2026-09-02 19:07:24.429988+00', '2026-09-02 19:07:24.429988+00') ON CONFLICT DO NOTHING;

INSERT INTO cms.songs VALUES ('aaab2222-0000-0000-0000-000000000001', 'aaab1111-0000-0000-0000-000000000001', 'the-shesa-anthem', 'The SHESA Anthem', 'National Choir', 'The founding anthem — sung standing, hand on heart, at every gathering.', 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_1e6bafbbdc.mp3', NULL, 180, NULL, 10, '2026-09-02 19:07:24.429988+00', '2026-09-02 19:07:24.429988+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.songs VALUES ('aaab2222-0000-0000-0000-000000000002', 'aaab1111-0000-0000-0000-000000000001', 'homecoming-hymn', 'Homecoming Hymn', 'National Choir', 'The hymn the Homecoming committee opens each reunion weekend with.', 'https://cdn.pixabay.com/download/audio/2022/10/25/audio_d0c7c6b1c8.mp3', NULL, 215, NULL, 20, '2026-09-02 19:07:24.429988+00', '2026-09-02 19:07:24.429988+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.songs VALUES ('aaab2222-0000-0000-0000-000000000003', 'aaab1111-0000-0000-0000-000000000002', 'bamenda-branch-song', 'Bamenda, We Rise', 'Bamenda Chapter', 'Written for the 2001 launch of the Bamenda branch; still sung at every Foundation Day.', 'https://cdn.pixabay.com/download/audio/2023/04/13/audio_49a94dd7f0.mp3', NULL, 238, NULL, 10, '2026-09-02 19:07:24.429988+00', '2026-09-02 19:07:24.429988+00') ON CONFLICT DO NOTHING;
INSERT INTO cms.songs VALUES ('aaab2222-0000-0000-0000-000000000004', 'aaab1111-0000-0000-0000-000000000003', 'ndolo-la-manyaka', 'Ndolo la Manyaka', 'Douala Chapter', 'A Duala-language piece performed at the annual Cultural Weekend.', 'https://cdn.pixabay.com/download/audio/2022/03/24/audio_5906fb7ab9.mp3', NULL, 260, NULL, 10, '2026-09-02 19:07:24.429988+00', '2026-09-02 19:07:24.429988+00') ON CONFLICT DO NOTHING;

