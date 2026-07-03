-- Seed data — Phase 0 fixtures.
--
-- This file runs after migrations on `supabase db reset` and on `supabase
-- start`'s first boot. Seeds run as the superuser, so RLS doesn't apply.
--
-- IDEMPOTENT BY DESIGN: every INSERT uses a stable hand-picked UUID and
-- ON CONFLICT DO NOTHING. The file is safe to re-run any number of
-- times, and individual sections can be moved between envs without
-- worrying about ordering.
--
-- Scope (per the "schemas per phase" principle): seed only what existing
-- migrations need to be exercised. Future phases add their own blocks.
--
-- Sections in this file:
--   1. Org hierarchy fixtures (Phase 0 E2 + Phase 1 E1.1)
--   2. RBAC system roles, permissions, role_permissions (Phase 0 E3 +
--      Phase 1 E1.1 adds scope.create / scope.update / scope.change_autonomy)

-- =============================================================================
-- Section 1. Org hierarchy (E2)
-- =============================================================================

-------------------------------------------------------------------------------
-- 1.1 The single Mainstream scope (root of the tree)
-------------------------------------------------------------------------------

INSERT INTO core.scopes (id, name, slug, scope_type, parent_scope_id, currency_code)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Shesa Mainstream',
  'shesa-mainstream',
  'mainstream',
  NULL,
  'XAF'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO core.scope_capabilities (
  scope_id,
  can_manage_members,
  can_have_treasury,
  can_create_binding_dues,
  can_have_website_page,
  can_have_forum,
  can_label_active_passive
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  TRUE, TRUE, TRUE, TRUE, TRUE, TRUE
)
ON CONFLICT (scope_id) DO NOTHING;

-------------------------------------------------------------------------------
-- 1.2 Sample branches — one home, one diaspora, plus a chapter of each kind
-------------------------------------------------------------------------------
-- Three branches so the list page has something to filter by (home vs
-- diaspora, different regions), plus one autonomous + one grouping
-- chapter under Shesa Buea so the chapter_kind reactive UI is exercised
-- in local dev.
--
-- is_autonomous was dropped in the 2026-07-02 scope reorg; autonomy for
-- chapters lives on core.scopes.chapter_kind, which stays NULL for branches.

INSERT INTO core.scopes (id, name, slug, scope_type, parent_scope_id, currency_code)
VALUES
  ('00000000-0000-0000-0000-000000000010', 'Shesa Buea',   'shesa-buea',   'branch',
   '00000000-0000-0000-0000-000000000001', 'XAF'),
  ('00000000-0000-0000-0000-000000000011', 'Shesa Douala', 'shesa-douala', 'branch',
   '00000000-0000-0000-0000-000000000001', 'XAF'),
  ('00000000-0000-0000-0000-000000000012', 'Shesa DC',     'shesa-dc',     'branch',
   '00000000-0000-0000-0000-000000000001', 'USD')
ON CONFLICT (id) DO NOTHING;

INSERT INTO core.branches (
  scope_id, country_code, region, city, nickname, description,
  registration_fee_required, registration_fee_amount, registration_fee_currency,
  contact_email
) VALUES
  ('00000000-0000-0000-0000-000000000010', 'CM', 'South-West', 'Buea',    NULL,
   'The founding branch — Shesa''s home in the South-West region.',
   TRUE,  5000, 'XAF', 'buea@shesaconnect.com'),
  ('00000000-0000-0000-0000-000000000011', 'CM', 'Littoral',   'Douala',  NULL,
   'Economic capital branch, largest urban membership in Cameroon.',
   FALSE, NULL, NULL,  'douala@shesaconnect.com'),
  ('00000000-0000-0000-0000-000000000012', 'US', 'Maryland',   'Silver Spring', 'DMV',
   'Washington DC / Maryland / Virginia diaspora chapter.',
   TRUE,  25,   'USD', 'dc@shesaconnect.com')
ON CONFLICT (scope_id) DO NOTHING;

INSERT INTO core.scope_capabilities (
  scope_id, can_manage_members, can_have_treasury, can_create_binding_dues,
  can_have_website_page, can_have_forum, can_label_active_passive
) VALUES
  ('00000000-0000-0000-0000-000000000010', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  ('00000000-0000-0000-0000-000000000011', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  ('00000000-0000-0000-0000-000000000012', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE)
ON CONFLICT (scope_id) DO NOTHING;

-------------------------------------------------------------------------------
-- 1.3 Sample chapters — one autonomous + one grouping under Shesa Buea
-------------------------------------------------------------------------------

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
-- Section 2. RBAC catalog (E3)
-- =============================================================================
--
-- The seven system roles, the thirteen permissions, and the default
-- role→permission mappings. Keys mirror @shesa/types ROLE_KEYS and
-- PERMISSION_KEYS — adding a value here means adding the same value
-- there (TS will fail to compile if they drift).
--
-- Permission bundling per role is a DEFAULT bundle — the bundle the
-- product launches with. Specific orgs may want to refine over time;
-- editing this file is the supported path (and the change propagates
-- to local + staging on next `db:reset`, never to prod which does not
-- run seed).

-------------------------------------------------------------------------------
-- 2.1 Roles
-------------------------------------------------------------------------------

INSERT INTO core.roles (id, key, name, description) VALUES
  ('11111111-0000-0000-0000-000000000001', 'mainstream_admin', 'Mainstream Admin',
   'Top-level admin: full authority across every scope (granted globally with NULL scope; reaches autonomous chapters).'),
  ('11111111-0000-0000-0000-000000000002', 'branch_admin', 'Branch Admin',
   'Authority over a Branch and everything under it.'),
  ('11111111-0000-0000-0000-000000000003', 'batch_admin', 'Batch Admin',
   'Authority over a Batch (and its Houses).'),
  ('11111111-0000-0000-0000-000000000004', 'finance', 'Finance',
   'Read+write on finance. Treasury, charges, payments, reports.'),
  ('11111111-0000-0000-0000-000000000005', 'editor', 'Editor',
   'CMS editor — drafts, edits, publishes website + branch-page content.'),
  ('11111111-0000-0000-0000-000000000006', 'recruiter', 'Recruiter',
   'Posts jobs on Connect; submitted postings still need approval before publish.'),
  ('11111111-0000-0000-0000-000000000007', 'announcer', 'Announcer',
   'Publishes announcements via Exco and the Connect forum.')
ON CONFLICT (key) DO NOTHING;

-------------------------------------------------------------------------------
-- 2.2 Permissions
-------------------------------------------------------------------------------

INSERT INTO core.permissions (id, key, description) VALUES
  -- scopes
  ('22222222-0000-0000-0000-000000000001', 'scope.read',          'Read org-hierarchy nodes and their capabilities.'),
  ('22222222-0000-0000-0000-000000000002', 'scope.manage',        'Create/edit/disable scopes (Branches, Chapters, etc.).'),
  -- members
  ('22222222-0000-0000-0000-000000000003', 'member.read',         'View member directory + profiles.'),
  ('22222222-0000-0000-0000-000000000004', 'member.manage',       'Create / edit / invite / transfer / exit members.'),
  -- RBAC self-management
  ('22222222-0000-0000-0000-000000000005', 'role.grant',          'Grant a role to a user at a scope.'),
  ('22222222-0000-0000-0000-000000000006', 'role.revoke',         'Revoke an active role assignment.'),
  -- finance
  ('22222222-0000-0000-0000-000000000007', 'finance.read',        'Read charges, obligations, payments, treasury balances.'),
  ('22222222-0000-0000-0000-000000000008', 'finance.write',       'Create/edit charges, record payments, run reports.'),
  -- cms
  ('22222222-0000-0000-0000-000000000009', 'cms.edit',            'Draft, edit, publish CMS content (articles, pages, gallery).'),
  -- connect
  ('22222222-0000-0000-0000-000000000010', 'connect.announce',    'Publish announcements to Connect forums.'),
  ('22222222-0000-0000-0000-000000000011', 'connect.poll',        'Create polls in Connect.'),
  ('22222222-0000-0000-0000-000000000012', 'connect.job.approve', 'Approve and publish Recruiter-submitted job postings.'),
  -- audit
  ('22222222-0000-0000-0000-000000000013', 'audit.read',          'Read audit_entries — full event log per scope.'),
  -- Phase 1 E1.1 — org-management grain
  ('22222222-0000-0000-0000-000000000014', 'scope.create',        'Create a new scope (Branch, Chapter, Sector, Batch) with parent + initial capabilities.'),
  ('22222222-0000-0000-0000-000000000015', 'scope.update',        'Edit an existing scope: name, geography, currency (until finance exists), metadata.'),
  ('22222222-0000-0000-0000-000000000016', 'scope.change_autonomy','Flip a chapter''s autonomy (autonomous ↔ grouping).'),
  -- Phase 1 E1.2 — member engine grain
  ('22222222-0000-0000-0000-000000000017', 'member.create',       'Create a new member (via UI, import, or admin form).'),
  ('22222222-0000-0000-0000-000000000018', 'member.update',       'Edit protected member fields (full_name, batch, house, network, entry_year).'),
  -- Phase 1 E1.3 — Excel import
  ('22222222-0000-0000-0000-000000000019', 'member.import',       'Upload and confirm Excel member-import batches.'),
  -- Phase 1 E1.4 — membership lifecycle
  ('22222222-0000-0000-0000-000000000020', 'membership.approve',  'Approve a join request into a geographic body.'),
  ('22222222-0000-0000-0000-000000000021', 'membership.reject',   'Reject a join request into a geographic body.'),
  ('22222222-0000-0000-0000-000000000022', 'membership.transfer', 'Initiate, approve, or reject a member transfer between geographic bodies.'),
  ('22222222-0000-0000-0000-000000000023', 'membership.mark_passive', 'Flip a membership between active and passive.'),
  ('22222222-0000-0000-0000-000000000024', 'registration.mark_paid',  'Mark a member''s registration fee as paid (non-gating flag).'),
  -- Phase 1 E1.5 — finish §4.1 catalog
  ('22222222-0000-0000-0000-000000000025', 'scope.manage_capabilities', 'Flip capability flags on a scope (treasury, dues, forum, active/passive labelling).'),
  ('22222222-0000-0000-0000-000000000026', 'member.export',        'Export the member directory as CSV or Excel (crosses the RLS boundary).'),
  -- Phase 1 E1.6 — positions
  ('22222222-0000-0000-0000-000000000027', 'position.assign',      'Assign a position (badge) to a member at a scope.'),
  ('22222222-0000-0000-0000-000000000028', 'position.remove',      'Remove an active position assignment.'),
  -- Phase 2 — Exco governance flows
  ('22222222-0000-0000-0000-000000000029', 'registration.waive',   'Waive a member''s registration fee.'),
  ('22222222-0000-0000-0000-000000000030', 'event.create',         'Create a governance event.'),
  ('22222222-0000-0000-0000-000000000031', 'event.update',         'Edit a draft or scheduled event.'),
  ('22222222-0000-0000-0000-000000000032', 'event.publish',        'Publish an event.'),
  ('22222222-0000-0000-0000-000000000033', 'event.cancel',         'Cancel an event.'),
  ('22222222-0000-0000-0000-000000000034', 'event.archive',        'Archive an event.'),
  ('22222222-0000-0000-0000-000000000035', 'event.contribution.review', 'Review event contribution settings (Finance approval placeholder).'),
  ('22222222-0000-0000-0000-000000000036', 'announcement.create',  'Create an announcement draft.'),
  ('22222222-0000-0000-0000-000000000037', 'announcement.update',  'Edit a draft or scheduled announcement.'),
  ('22222222-0000-0000-0000-000000000038', 'announcement.publish', 'Publish an announcement.'),
  ('22222222-0000-0000-0000-000000000039', 'announcement.archive', 'Archive an announcement.'),
  ('22222222-0000-0000-0000-000000000040', 'member.bulk_action',   'Run a bulk action over a member selection.'),
  ('22222222-0000-0000-0000-000000000041', 'command.search',       'Consume command-palette search results.'),
  ('22222222-0000-0000-0000-000000000042', 'admin_notification.read', 'Read + mark-read the admin notification bell.')
ON CONFLICT (key) DO NOTHING;

-------------------------------------------------------------------------------
-- 2.3 Role → Permission bundles
-------------------------------------------------------------------------------
-- Default bundles. Resolved by KEY (not UUID) so reordering this file
-- doesn't matter. ON CONFLICT on the composite PK (role_id, permission_id)
-- makes this re-runnable.

-- Mainstream Admin: every permission, no exceptions.
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
CROSS JOIN core.permissions p
WHERE r.key = 'mainstream_admin'
ON CONFLICT DO NOTHING;

-- Branch Admin: governance + member + role + finance read + cms + announce + audit.
-- Excludes finance.write (Finance role owns money movement) and
-- connect.job.approve (Recruiter workflow).
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key IN (
  'scope.read', 'scope.manage',
  -- Phase 1 E1.1 — org-management grain (adds create/update/autonomy).
  'scope.create', 'scope.update', 'scope.change_autonomy',
  'member.read', 'member.manage',
  -- Phase 1 E1.2 — member-engine grain (adds create/update).
  'member.create', 'member.update',
  -- Phase 1 E1.3 — Excel import
  'member.import',
  -- Phase 1 E1.4 — geographic body governance
  'membership.approve', 'membership.reject',
  'membership.transfer', 'membership.mark_passive',
  'registration.mark_paid',
  -- Phase 1 E1.5 — capability + export
  'scope.manage_capabilities', 'member.export',
  -- Phase 1 E1.6 — positions
  'position.assign', 'position.remove',
  'role.grant', 'role.revoke',
  'finance.read',
  'cms.edit',
  'connect.announce', 'connect.poll',
  'audit.read'
)
WHERE r.key = 'branch_admin'
ON CONFLICT DO NOTHING;

-- Batch Admin: scoped to the Batch they manage. No finance write, no
-- scope.manage (can't create new Batches under their Chapter).
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key IN (
  'scope.read',
  'member.read', 'member.manage',
  -- Phase 1 E1.2 — batch admins onboard batch members
  'member.create', 'member.update',
  -- Phase 1 E1.3 — batch admins can Excel-import their batch
  'member.import',
  -- Phase 1 E1.4 — batch admins can mark registration paid for their batch
  'registration.mark_paid',
  -- Phase 1 E1.5 — batch admins can export their batch roster
  'member.export',
  -- Phase 1 E1.6 — batch admins govern batch positions
  'position.assign', 'position.remove',
  'role.grant',
  'finance.read',
  'cms.edit',
  'connect.announce'
)
WHERE r.key = 'batch_admin'
ON CONFLICT DO NOTHING;

-- Finance: money movement + visibility, plus audit (every payment/charge
-- creates audit entries — Finance needs to read them).
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key IN (
  'scope.read',
  'member.read',
  'finance.read', 'finance.write',
  'audit.read'
)
WHERE r.key = 'finance'
ON CONFLICT DO NOTHING;

-- Editor: CMS only.
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key IN ('scope.read', 'cms.edit')
WHERE r.key = 'editor'
ON CONFLICT DO NOTHING;

-- Recruiter: read members (to invite as job candidates eventually);
-- approve jobs the OTHER way (their own job postings need someone with
-- connect.job.approve elsewhere — typically a Branch Admin).
-- Note: posting jobs themselves doesn't need a permission key —
-- "any authenticated member with the Recruiter flag can post" is
-- handled at the app layer per spec §4.4 (Phase 8 Connect).
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key IN ('scope.read', 'member.read')
WHERE r.key = 'recruiter'
ON CONFLICT DO NOTHING;

-- Announcer: announce + poll, no member/role/finance access.
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key IN (
  'scope.read',
  'member.read',
  'connect.announce', 'connect.poll'
)
WHERE r.key = 'announcer'
ON CONFLICT DO NOTHING;


-- =============================================================================
-- Section 3. Phase 1 E1.1 org fixtures — batches, houses, Other network
-- =============================================================================
--
-- All three groups (batches, houses, networks) are mainstream-scoped rows
-- in core.scopes — per E1.1's locked decision, only Branches and Chapters
-- carry geographic hierarchy; everything else lives directly under the
-- Mainstream root.
--
-- Idempotent via ON CONFLICT DO NOTHING on the natural key (slug for
-- houses/network, entry_year via the partial unique index for batches).

-------------------------------------------------------------------------------
-- 3.1 Batches — every intake year 1953 → 2026 (Phase 1 §2.2)
-------------------------------------------------------------------------------
-- Adding a batch year: bump the upper bound in the generate_series and
-- re-run `db:reset`. The `create-next-year-batch` Edge Function keeps
-- prod current on its own via pg_cron in Phase 2.

INSERT INTO core.scopes (
  name, slug, scope_type, parent_scope_id, entry_year, currency_code
)
SELECT
  y::text || ' Batch',
  'batch-' || y::text,
  'batch',
  '00000000-0000-0000-0000-000000000001',
  y,
  'XAF'
FROM generate_series(1953, 2026) AS y
ON CONFLICT (scope_type, slug) DO NOTHING;

-- Backfill the detail-table row for every seeded batch. The migration
-- 20260703220000_create_core_batches.sql runs this same INSERT for its
-- own re-run safety; keeping it here means a fresh `db:reset` starts
-- with each batch scope already 1:1 with its core.batches row.
INSERT INTO core.batches (scope_id)
SELECT id FROM core.scopes WHERE scope_type = 'batch'
ON CONFLICT (scope_id) DO NOTHING;

-------------------------------------------------------------------------------
-- 3.2 Houses — the four seeded houses (Phase 1 §2.3, refined 2026-07-02)
-------------------------------------------------------------------------------
-- Two rows per house: the spine in core.scopes + the detail row in
-- core.houses (color name + hex + display order). Houses are view-only
-- in the UI — never created, edited, or deleted.

INSERT INTO core.scopes (
  id, name, slug, scope_type, parent_scope_id, currency_code, nickname
) VALUES
  ('33333333-0000-0000-0000-000000000001', 'St Thomas',  'st-thomas',  'house',
   '00000000-0000-0000-0000-000000000001', 'XAF', 'Blue Falcons'),
  ('33333333-0000-0000-0000-000000000002', 'St Peter',   'st-peter',   'house',
   '00000000-0000-0000-0000-000000000001', 'XAF', 'Yellow Phoenix'),
  ('33333333-0000-0000-0000-000000000003', 'St Francis', 'st-francis', 'house',
   '00000000-0000-0000-0000-000000000001', 'XAF', 'Green Grizzlies'),
  ('33333333-0000-0000-0000-000000000004', 'St John',    'st-john',    'house',
   '00000000-0000-0000-0000-000000000001', 'XAF', 'Red Lions')
ON CONFLICT (id) DO NOTHING;

INSERT INTO core.houses (scope_id, color, color_hex, sort_order) VALUES
  ('33333333-0000-0000-0000-000000000001', 'blue',   '#1E40AF', 1),  -- royal
  ('33333333-0000-0000-0000-000000000002', 'yellow', '#EAB308', 2),  -- gold
  ('33333333-0000-0000-0000-000000000003', 'green',  '#15803D', 3),  -- forest
  ('33333333-0000-0000-0000-000000000004', 'red',    '#B91C1C', 4)   -- crimson
ON CONFLICT (scope_id) DO NOTHING;

-------------------------------------------------------------------------------
-- 3.3 Networks — real professional networks (Phase 1 §2.4, renamed
--     from Sector 2026-07-02, seed reshaped 2026-07-02)
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
-- Section 4. Dev users — Phase 2 pivot (ADR-0040)
-- =============================================================================
--
-- Four seeded users for local development:
--   admin@shesa.test            / password  — mainstream_admin (global)
--   finance@shesa.test          / password  — finance          (global)
--   buea-admin@shesa.test       / password  — branch_admin     at Shesa Buea
--   batch-2012-admin@shesa.test / password  — batch_admin      at 2012 Batch
--
-- Both cover the "log in and start clicking around" story for the E2.pivot
-- shells. Passwords are `password` — deliberately trivial; seed.sql runs
-- ONLY on `supabase db reset` / first `supabase start`, never against
-- staging or production.
--
-- We write directly into auth.users + auth.identities because seed.sql runs
-- as the superuser; the Supabase admin API isn't reachable at seed time.
-- All columns not defaulted by the schema are set explicitly to keep the
-- seed forward-compatible across supabase-cli versions.
--
-- Idempotent via hand-picked UUIDs + ON CONFLICT DO NOTHING on every insert.

-------------------------------------------------------------------------------
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
    '55555555-0000-0000-0000-000000000020',
    'authenticated', 'authenticated',
    'batch-2012-admin@shesa.test',
    crypt('password', gen_salt('bf')),
    NOW(), NULL, '', NULL,
    '', NULL, '', '',
    NULL, NULL,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"2012 Batch Admin"}'::jsonb,
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
    '55555555-0000-0000-0000-000000000020',
    '55555555-0000-0000-0000-000000000020',
    jsonb_build_object(
      'sub',   '55555555-0000-0000-0000-000000000020',
      'email', 'batch-2012-admin@shesa.test',
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
  ('55555555-0000-0000-0000-000000000001', 'Global Admin',     'admin@shesa.test',            'exco'),
  ('55555555-0000-0000-0000-000000000002', 'Global Finance',   'finance@shesa.test',          'finance'),
  ('55555555-0000-0000-0000-000000000010', 'Shesa Buea Admin', 'buea-admin@shesa.test',       'exco'),
  ('55555555-0000-0000-0000-000000000020', '2012 Batch Admin', 'batch-2012-admin@shesa.test', 'exco')
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
    -- 2012 Batch Admin — scoped batch_admin at the 2012 batch scope,
    -- resolved by slug so the seed doesn't hardcode the generate_series
    -- output UUIDs.
    '55555555-0000-0000-0000-000000000020',
    (SELECT id FROM core.scopes WHERE slug = 'batch-2012'),
    '11111111-0000-0000-0000-000000000003',  -- batch_admin
    NOW()
  )
ON CONFLICT DO NOTHING;

-- =============================================================================
-- Section 5. Demo data — 2026-07-03 walkthrough
-- =============================================================================
--
-- Populates enough member data to exercise every Memberships surface
-- (Members table across branch / autonomous chapter / batch scopes,
-- Requests queue on Buea, Transfers queue on Buea) so the platform is
-- clickable end-to-end.
--
-- Volume:
--   ~20 members per batch across eight graduated batches
--   (2012-2019) = 160 members total. Everyone from 2020+ is still in
--   school; the platform's members are alumni only for now. 2012 is
--   included so the batch-2012-admin@shesa.test seed user has real
--   data in their own batch.
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
          CASE (v_member_num % 4)
            WHEN 0 THEN 'committed'::core.engagement_tier
            WHEN 1 THEN 'engaged'::core.engagement_tier
            WHEN 2 THEN 'normal'::core.engagement_tier
            ELSE        'dormant'::core.engagement_tier
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
