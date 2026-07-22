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
  -- batch_admin was retired 2026-07-05. Batches are cluster-only now
  -- (a filter dimension attached to every member). Onboarding happens
  -- on the Batch details page in Clusters, executed by branch or
  -- mainstream admins — no batch-scoped role remains.
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
  'audit.read',
  -- Phase 2 — announcements, events, bulk actions, palette, admin
  -- notifications, registration waive. These were added by migration
  -- 20260702113026_extend_permissions_phase2.sql, but that migration
  -- ran BEFORE core.roles was populated by this seed (migrations run
  -- first, seed second), so its INSERTs became no-ops. Listing them
  -- here is the fix — every db:reset now grants them idempotently.
  -- Excludes event.contribution.review (Finance role owns that).
  'registration.waive',
  'event.create', 'event.update', 'event.publish', 'event.cancel', 'event.archive',
  'announcement.create', 'announcement.update', 'announcement.publish', 'announcement.archive',
  'member.bulk_action', 'command.search', 'admin_notification.read'
)
WHERE r.key = 'branch_admin'
ON CONFLICT DO NOTHING;

-- Batch Admin retired 2026-07-05 — batches are cluster-only now.
-- Onboarding of batch members happens on the Batch details page in
-- Clusters, executed by branch or mainstream admins.

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
--   buea-finance@shesa.test     / password  — finance          at Shesa Buea
--
-- batch-2012-admin was retired 2026-07-05 alongside the batch_admin role.
-- The two finance users mirror the two admin users: one global (reaches
-- every scope via NULL-scope grant) and one branch-scoped (Buea only).
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
-- Section 6. Phase 3 Finance demo data — 2026-07-06 walkthrough
-- =============================================================================
--
-- Seeds enough finance rows at Shesa Buea (and one at Mainstream) so the
-- /finance persona is clickable end-to-end without hand-creating charges:
--
--   * Monthly dues charge (25000 XAF) — active.
--   * AGM project fund goal contribution (200000 XAF goal) — open.
--   * General fund donation charge — open. Two anonymous public donations.
--   * Global levy on Buea from Mainstream (50000 XAF, quarterly).
--   * Obligations generated for the active dues on Jan 15 2027.
--   * A handful of payments — Alice pays her full 25000; Bob pays half.
--   * A recorded venue expense (12000 XAF) — below threshold, hits ledger.
--   * A pending-approval honorarium expense (30000 XAF) — above threshold.
--   * Expense threshold set at 20000 XAF for Buea.
--
-- Idempotent via hand-picked UUIDs + ON CONFLICT — but the ON CONFLICT
-- path means re-running the seed doesn't pick up new rows or edits to
-- old rows. To make the seed truly reproducible we start Section 6 by
-- wiping every finance row (this is dev-only seed data; prod uses
-- migrations). The TRUNCATE walks the dependency graph via CASCADE
-- so a single call handles ledger_entries, tickets, payments, etc.

-------------------------------------------------------------------------------
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
-- 6.1 Charges at Shesa Buea
-------------------------------------------------------------------------------

-- Activation floats 12 months into the past so the seed always
-- produces a full year of historical obligations relative to "today"
-- — the Charge Detail's sliding-window centres on the current period
-- with real scroll-left history to explore.
INSERT INTO finance.charges
  (id, scope_id, shape, name, description, base_amount, currency, recurrence,
   recurrence_interval, activation_date, issue_date, status, target_filter,
   created_by, created_at, updated_at)
VALUES
  ('77777777-1111-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000010',
   'charge', 'Monthly Dues',
   'Regular monthly dues for active members at Shesa Buea.',
   25000, 'XAF', 'monthly', 1,
   date_trunc('month', NOW() - INTERVAL '12 months'),
   date_trunc('month', NOW() - INTERVAL '12 months'),
   'active', '{}'::jsonb,
   '55555555-0000-0000-0000-000000000002',
   NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO finance.charges
  (id, scope_id, shape, name, description, currency, goal_amount, lifecycle,
   open_date, close_date, status, target_filter,
   created_by, created_at, updated_at)
VALUES
  ('77777777-1111-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000010',
   'goal', 'AGM Project Fund 2027',
   'Rally toward the annual project fund. Any contribution welcome.',
   'XAF', 200000, 'open',
   NOW() - INTERVAL '10 days', NOW() + INTERVAL '60 days',
   'active', '{}'::jsonb,
   '55555555-0000-0000-0000-000000000002',
   NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO finance.charges
  (id, scope_id, shape, name, description, currency, lifecycle,
   open_date, close_date, status, target_filter,
   created_by, created_at, updated_at)
VALUES
  ('77777777-1111-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000010',
   'donation', 'Shesa Buea General Fund',
   'Freewill gifts to Shesa Buea. Public + walk-in.',
   'XAF', 'open',
   NOW() - INTERVAL '30 days', NOW() + INTERVAL '365 days',
   'active', '{}'::jsonb,
   '55555555-0000-0000-0000-000000000002',
   NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Global levy — Mainstream charges Buea as-a-body (50000 XAF quarterly).
-- target_party_type='branch' — obligation generation for branch-targeted
-- charges is deferred to a follow-up (M3 in the roadmap); the row exists
-- so admins see the charge in reports and the future generator has data.
INSERT INTO finance.charges
  (id, scope_id, shape, name, description, base_amount, currency, recurrence,
   recurrence_interval, activation_date, status, target_filter, target_party_type,
   created_by, created_at, updated_at)
VALUES
  ('77777777-1111-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000001',
   'charge', 'Global Q1 Levy on Buea',
   'Quarterly national levy owed by Shesa Buea as a body.',
   50000, 'XAF', 'quarterly', 1,
   '2027-01-01T00:00:00Z',
   'active', jsonb_build_object('target_scope_ids',
     jsonb_build_array('00000000-0000-0000-0000-000000000010')),
   'branch',
   '55555555-0000-0000-0000-000000000002',
   NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-------------------------------------------------------------------------------
-- 6.2 Generate a full year of obligations for the Monthly Dues charge
-------------------------------------------------------------------------------
-- The M2B generator skips members that joined after the target period,
-- and the base seed antedates memberships by only 1–10 days. Slide the
-- Buea membership join dates back 13 months so the historical periods
-- get proper obligation fan-out. Uses `LEAST()` so we don't clobber a
-- membership that already sits earlier than that.

UPDATE core.memberships
   SET joined_at   = LEAST(joined_at,   NOW() - INTERVAL '13 months' - INTERVAL '5 days'),
       approved_at = LEAST(approved_at, NOW() - INTERVAL '13 months' - INTERVAL '5 days')
 WHERE scope_id = '00000000-0000-0000-0000-000000000010'
   AND membership_status IN ('active', 'passive');

-- The M2B generator computes ONE period from a reference timestamp. To
-- build a scrollable year of history, we call it once per month from
-- 12 months back through the current month — so the Charge Detail's
-- sliding-window can center on today's period and reveal a full past
-- year on scroll-left. Idempotent via the UNIQUE constraint on
-- (charge_id, party_type, party_id, period_start).

DO $$
DECLARE
  v_reference    TIMESTAMPTZ;
  v_month_offset INTEGER;
  v_total        INTEGER := 0;
  v_step         INTEGER;
BEGIN
  -- Walk month-by-month from 12 months ago through the current month.
  -- Each call produces the obligation set for that reference's period;
  -- the UNIQUE constraint on (charge_id, party_type, party_id,
  -- period_start) makes the loop idempotent across `db:reset` runs.
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
    v_total := v_total + v_step;
  END LOOP;
  RAISE NOTICE 'Finance seed: generated % monthly-dues obligations across the rolling year at Buea',
    v_total;
END $$;

-- Sprinkle a realistic mix of payments across the historical periods.
-- The rule: the further back the period, the closer everyone is to
-- fully paid — mimics the reality that older bills get settled while
-- recent ones are still mid-cycle.
--
-- Idempotency: each payment row carries metadata->>'seed_marker' =
-- 'monthly-dues-history'. On re-run we skip an obligation if a seed
-- payment is already attached, so `db:reset` is safe to repeat.
-- Payment ids are `gen_random_uuid()` so we can't collide.

DO $$
DECLARE
  v_ob           finance.obligations%ROWTYPE;
  v_period       DATE;
  v_methods      finance.payment_method[] := ARRAY[
    'mtn_momo'::finance.payment_method,
    'orange_money'::finance.payment_method,
    'cash'::finance.payment_method,
    'bank_transfer'::finance.payment_method
  ];
  v_method       finance.payment_method;
  v_amount       NUMERIC;
  v_paid_ratio   NUMERIC;
  v_bucket       INTEGER;
  v_total        INTEGER := 0;
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

    -- Idempotency guard.
    IF EXISTS (
      SELECT 1 FROM finance.payments
        WHERE obligation_id = v_ob.id
          AND metadata->>'seed_marker' = 'monthly-dues-history'
    ) THEN
      CONTINUE;
    END IF;

    -- Payment probability by age of the period.
    v_paid_ratio := CASE
      WHEN v_period <= CURRENT_DATE - INTERVAL '6 months' THEN 0.90
      WHEN v_period <= CURRENT_DATE - INTERVAL '3 months' THEN 0.75
      WHEN v_period <= CURRENT_DATE - INTERVAL '1 month'  THEN 0.55
      ELSE 0.35
    END;

    -- Deterministic per (party, period) — hashtext gives us proper
    -- entropy across member IDs (which otherwise share the '88888888'
    -- prefix) and month offsets, so the pick stays stable across
    -- `db:reset` runs but varies enough to look real.
    v_bucket := abs(hashtext(v_ob.party_id::text || v_period::text)) % 100;
    IF v_bucket >= (v_paid_ratio * 100) THEN
      CONTINUE;
    END IF;

    -- Payment method rotates through the four.
    v_method := v_methods[1 + (v_bucket % 4)];

    -- ~30% of payments are partial (half amount).
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
  RAISE NOTICE 'Finance seed: sprinkled % historical payments across monthly-dues periods',
    v_total;
END $$;

-------------------------------------------------------------------------------
-- 6.3 Sample payments — enough to make the dashboard + reports interesting
-------------------------------------------------------------------------------
-- Picks the first three Buea members with a January obligation and gives
-- each a different payment story:
--   member #1 → full 25000 via mtn_momo (paid)
--   member #2 → 10000 via cash (partial)
--   member #3 → nothing (still open — surfaces in arrears)
--
-- The M4A recompute trigger transitions each obligation's status
-- automatically. The M6 ledger writer + treasury updates fire from the
-- payment INSERT trigger.

DO $$
DECLARE
  v_member_ids UUID[];
  v_obligation_id UUID;
BEGIN
  SELECT ARRAY(
    SELECT o.party_id
    FROM finance.obligations o
    WHERE o.charge_id = '77777777-1111-0000-0000-000000000001'
      AND o.party_type = 'member'
    ORDER BY o.created_at
    LIMIT 3
  ) INTO v_member_ids;

  IF array_length(v_member_ids, 1) IS NULL OR array_length(v_member_ids, 1) < 3 THEN
    RAISE NOTICE 'Finance seed: not enough member obligations to seed payments, skipping';
    RETURN;
  END IF;

  -- Member 1 pays in full via mtn_momo.
  SELECT id INTO v_obligation_id FROM finance.obligations
   WHERE charge_id = '77777777-1111-0000-0000-000000000001'
     AND party_id = v_member_ids[1];
  INSERT INTO finance.payments
    (id, obligation_id, charge_id, scope_id, payer_member_id,
     amount, currency, method, source, recorded_by)
  VALUES (
    '77777777-3333-0000-0000-000000000001',
    v_obligation_id,
    '77777777-1111-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000010',
    v_member_ids[1],
    25000, 'XAF', 'mtn_momo', 'auto',
    '55555555-0000-0000-0000-000000000011'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Member 2 pays half via cash.
  SELECT id INTO v_obligation_id FROM finance.obligations
   WHERE charge_id = '77777777-1111-0000-0000-000000000001'
     AND party_id = v_member_ids[2];
  INSERT INTO finance.payments
    (id, obligation_id, charge_id, scope_id, payer_member_id,
     amount, currency, method, source, recorded_by)
  VALUES (
    '77777777-3333-0000-0000-000000000002',
    v_obligation_id,
    '77777777-1111-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000010',
    v_member_ids[2],
    10000, 'XAF', 'cash', 'manual',
    '55555555-0000-0000-0000-000000000011'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Member 1 also contributes 15000 to the AGM goal (via orange_money).
  INSERT INTO finance.payments
    (id, charge_id, scope_id, payer_member_id,
     amount, currency, method, source, recorded_by)
  VALUES (
    '77777777-3333-0000-0000-000000000003',
    '77777777-1111-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000010',
    v_member_ids[1],
    15000, 'XAF', 'orange_money', 'auto',
    '55555555-0000-0000-0000-000000000011'
  )
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Finance seed: recorded payments for members %', v_member_ids[1:2];
END $$;

-------------------------------------------------------------------------------
-- 6.4 Public donations to the General Fund
-------------------------------------------------------------------------------

INSERT INTO finance.payments
  (id, charge_id, scope_id, payer_member_id,
   amount, currency, method, source, recorded_by, metadata)
VALUES
  ('77777777-3333-0000-0000-000000000010',
   '77777777-1111-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000010',
   NULL,
   5000, 'XAF', 'mtn_momo', 'auto', NULL,
   jsonb_build_object(
     'public_donation', TRUE,
     'donor_name', 'Jane Adjani',
     'donor_email', 'jane.adjani@example.com',
     'note', 'From the website'
   )),
  ('77777777-3333-0000-0000-000000000011',
   '77777777-1111-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000010',
   NULL,
   2500, 'XAF', 'orange_money', 'auto', NULL,
   jsonb_build_object(
     'public_donation', TRUE,
     'donor_name', NULL,
     'donor_email', NULL,
     'note', 'Anonymous gift'
   ))
ON CONFLICT (id) DO NOTHING;

-------------------------------------------------------------------------------
-- 6.4B Additional charge scenarios — report-differentiation walkthrough
-------------------------------------------------------------------------------
-- The obligation generator (M2B) only handles target_party_type='member'
-- without target_filter narrowing. Scope-as-a-body charges and audience
-- filters aren't automated yet (M3 + M8 in the roadmap). To give the
-- charge-detail drill-down real data across every scenario admins
-- actually run, this section seeds the missing use cases by inserting
-- obligations directly. Each block is idempotent via hand-picked UUIDs.
--
-- Scenarios covered here (with example rows in exco/finance-view/charges):
--   A) Branch admin → subset of members via target_filter
--        Charge : 77777777-1111-…-0000-000000000010
--        Buea admin's 2018-Batch-only levy. Manual obligations for four
--        2018-batch members (mix of paid / partial / open). Exercises
--        the member-matrix view + reports on a narrow audience.
--
--   B) Global admin → chapter as a body
--        Charge : 77777777-1111-…-0000-000000000020
--        Mainstream levy on Buea University Chapter (autonomous). One
--        obligation per period against party_type='branch',
--        party_id=chapter_id. Renders as a single-row scope-body row.
--
--   C) Global admin → batch as a body
--        Charge : 77777777-1111-…-0000-000000000030
--        Mainstream contribution owed by the 2015 Batch collectively.
--        One obligation against the batch scope. Also scope-body shape.
--
--   D) Global admin → every member (cross-branch fan-out)
--        Charge : 77777777-1111-…-0000-000000000040
--        Mainstream-wide member levy. Because the generator walks
--        memberships at the charge's scope (and members belong to
--        branches, not Mainstream), we seed obligations manually for
--        six members spread across Buea, Douala, and DC. Enough to
--        surface the cross-branch reporting angle.

-------------------------------------------------------------------------------
-- 6.4B — Scenario A: Buea admin's 2021 Batch subset levy
-------------------------------------------------------------------------------

-- The 2021 batch's UUID isn't known statically (seeded by generate_series),
-- so we look it up inline and stash it via a temp binding on the charge's
-- target_filter. That gives us a documented pointer without a schema change.
DO $$
DECLARE
  v_batch_2018_id UUID;
BEGIN
  SELECT id INTO v_batch_2018_id
    FROM core.scopes
    WHERE scope_type = 'batch' AND slug = 'batch-2018';

  IF v_batch_2018_id IS NULL THEN
    RAISE NOTICE 'Finance seed A: 2018 batch missing, skipping subset charge';
    RETURN;
  END IF;

  INSERT INTO finance.charges
    (id, scope_id, shape, name, description, base_amount, currency, recurrence,
     recurrence_interval, activation_date, issue_date, status, target_filter,
     target_party_type, created_by, created_at, updated_at)
  VALUES
    ('77777777-1111-0000-0000-000000000010',
     '00000000-0000-0000-0000-000000000010',
     'charge', 'Class of 2018 Reunion Fund',
     '2018-batch-only quarterly contribution toward the class reunion at Shesa Buea.',
     15000, 'XAF', 'quarterly', 1,
     '2027-01-01T00:00:00Z', '2027-01-01T00:00:00Z',
     'active',
     jsonb_build_object('batch_scope_ids', jsonb_build_array(v_batch_2018_id)),
     'member',
     '55555555-0000-0000-0000-000000000002',
     NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Manual obligations for four 2021-batch Buea members (member_nums 1–4).
-- Idempotent via UNIQUE(charge_id, party_type, party_id, period_start).
DO $$
DECLARE
  v_member_ids UUID[] := ARRAY[
    '88888888-2018-0001-0000-000000000000'::uuid,
    '88888888-2018-0002-0000-000000000000'::uuid,
    '88888888-2018-0003-0000-000000000000'::uuid,
    '88888888-2018-0004-0000-000000000000'::uuid
  ];
  v_id UUID;
BEGIN
  FOREACH v_id IN ARRAY v_member_ids LOOP
    -- Skip if the member wasn't seeded (defensive — memberships live
    -- at Buea for member_num 1–10 so 2021's 1–4 exist under the loop).
    IF NOT EXISTS (SELECT 1 FROM core.members WHERE id = v_id) THEN
      CONTINUE;
    END IF;
    INSERT INTO finance.obligations
      (id, charge_id, scope_id, party_type, party_id,
       amount, currency, status, period_start, period_end)
    VALUES
      (gen_random_uuid(),
       '77777777-1111-0000-0000-000000000010',
       '00000000-0000-0000-0000-000000000010',
       'member', v_id,
       15000, 'XAF', 'open',
       '2027-01-01', '2027-04-01')
    ON CONFLICT (charge_id, party_type, party_id, period_start) DO NOTHING;
  END LOOP;
END $$;

-- Payments across the four members: paid / partial / partial / open.
-- Payment amount recompute trigger flips the obligation status.
DO $$
DECLARE
  v_ob_1 UUID;
  v_ob_2 UUID;
  v_ob_3 UUID;
BEGIN
  SELECT id INTO v_ob_1 FROM finance.obligations
    WHERE charge_id = '77777777-1111-0000-0000-000000000010'
      AND party_id = '88888888-2018-0001-0000-000000000000'
      AND period_start = '2027-01-01';
  SELECT id INTO v_ob_2 FROM finance.obligations
    WHERE charge_id = '77777777-1111-0000-0000-000000000010'
      AND party_id = '88888888-2018-0002-0000-000000000000'
      AND period_start = '2027-01-01';
  SELECT id INTO v_ob_3 FROM finance.obligations
    WHERE charge_id = '77777777-1111-0000-0000-000000000010'
      AND party_id = '88888888-2018-0003-0000-000000000000'
      AND period_start = '2027-01-01';

  IF v_ob_1 IS NOT NULL THEN
    INSERT INTO finance.payments
      (id, obligation_id, charge_id, scope_id, payer_member_id,
       amount, currency, method, source, recorded_by)
    VALUES
      ('77777777-3333-0000-0000-000000000020',
       v_ob_1,
       '77777777-1111-0000-0000-000000000010',
       '00000000-0000-0000-0000-000000000010',
       '88888888-2018-0001-0000-000000000000',
       15000, 'XAF', 'mtn_momo', 'auto',
       '55555555-0000-0000-0000-000000000011')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF v_ob_2 IS NOT NULL THEN
    INSERT INTO finance.payments
      (id, obligation_id, charge_id, scope_id, payer_member_id,
       amount, currency, method, source, recorded_by)
    VALUES
      ('77777777-3333-0000-0000-000000000021',
       v_ob_2,
       '77777777-1111-0000-0000-000000000010',
       '00000000-0000-0000-0000-000000000010',
       '88888888-2018-0002-0000-000000000000',
       8000, 'XAF', 'cash', 'manual',
       '55555555-0000-0000-0000-000000000011')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF v_ob_3 IS NOT NULL THEN
    INSERT INTO finance.payments
      (id, obligation_id, charge_id, scope_id, payer_member_id,
       amount, currency, method, source, recorded_by)
    VALUES
      ('77777777-3333-0000-0000-000000000022',
       v_ob_3,
       '77777777-1111-0000-0000-000000000010',
       '00000000-0000-0000-0000-000000000010',
       '88888888-2018-0003-0000-000000000000',
       5000, 'XAF', 'orange_money', 'auto',
       '55555555-0000-0000-0000-000000000011')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-------------------------------------------------------------------------------
-- 6.4B — Scenario B: Global levy on Buea University Chapter (scope-body)
-------------------------------------------------------------------------------

INSERT INTO finance.charges
  (id, scope_id, shape, name, description, base_amount, currency, recurrence,
   recurrence_interval, activation_date, status, target_filter, target_party_type,
   created_by, created_at, updated_at)
VALUES
  ('77777777-1111-0000-0000-000000000020',
   '00000000-0000-0000-0000-000000000001',
   'charge', 'Global Yearly Levy on Buea Uni Chapter',
   'Annual national levy owed by the Buea University Chapter as an autonomous body.',
   150000, 'XAF', 'yearly', 1,
   '2027-01-01T00:00:00Z',
   'active',
   jsonb_build_object('target_scope_ids',
     jsonb_build_array('00000000-0000-0000-0000-000000000020')),
   'branch',
   '55555555-0000-0000-0000-000000000002',
   NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO finance.obligations
  (id, charge_id, scope_id, party_type, party_id,
   amount, currency, status, period_start, period_end)
VALUES
  ('77777777-2222-0000-0000-000000000020',
   '77777777-1111-0000-0000-000000000020',
   '00000000-0000-0000-0000-000000000020',
   'branch', '00000000-0000-0000-0000-000000000020',
   150000, 'XAF', 'open',
   '2027-01-01', '2028-01-01')
ON CONFLICT (charge_id, party_type, party_id, period_start) DO NOTHING;

-- Chapter pays a chunk (60%) via bank transfer — partial state.
INSERT INTO finance.payments
  (id, obligation_id, charge_id, scope_id, payer_member_id,
   amount, currency, method, source, recorded_by)
VALUES
  ('77777777-3333-0000-0000-000000000030',
   '77777777-2222-0000-0000-000000000020',
   '77777777-1111-0000-0000-000000000020',
   '00000000-0000-0000-0000-000000000020',
   NULL,
   90000, 'XAF', 'bank_transfer', 'manual',
   '55555555-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

-------------------------------------------------------------------------------
-- 6.4B — Scenario C: Global contribution from the 2015 Batch (scope-body)
-------------------------------------------------------------------------------

DO $$
DECLARE
  v_batch_2015_id UUID;
BEGIN
  SELECT id INTO v_batch_2015_id
    FROM core.scopes
    WHERE scope_type = 'batch' AND slug = 'batch-2015';

  IF v_batch_2015_id IS NULL THEN
    RAISE NOTICE 'Finance seed C: 2015 batch missing, skipping';
    RETURN;
  END IF;

  INSERT INTO finance.charges
    (id, scope_id, shape, name, description, base_amount, currency, recurrence,
     recurrence_interval, activation_date, status, target_filter, target_party_type,
     created_by, created_at, updated_at)
  VALUES
    ('77777777-1111-0000-0000-000000000030',
     '00000000-0000-0000-0000-000000000001',
     'charge', 'Class-of-2015 Endowment Pledge',
     'One-time endowment pledge owed by the 2015 Batch as a body.',
     500000, 'XAF', 'one_time', 1,
     '2027-01-01T00:00:00Z',
     'active',
     jsonb_build_object('target_scope_ids', jsonb_build_array(v_batch_2015_id)),
     'branch',
     '55555555-0000-0000-0000-000000000002',
     NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO finance.obligations
    (id, charge_id, scope_id, party_type, party_id,
     amount, currency, status, period_start, period_end)
  VALUES
    ('77777777-2222-0000-0000-000000000030',
     '77777777-1111-0000-0000-000000000030',
     v_batch_2015_id,
     'branch', v_batch_2015_id,
     500000, 'XAF', 'open',
     NULL, NULL)
  ON CONFLICT (charge_id, party_type, party_id, period_start) DO NOTHING;

  -- Batch has not paid yet — leaves the obligation open, useful for
  -- surfacing the "0 collected" empty state in reports.
END $$;

-------------------------------------------------------------------------------
-- 6.4B — Scenario D: Global levy on every member (cross-branch fan-out)
-------------------------------------------------------------------------------

INSERT INTO finance.charges
  (id, scope_id, shape, name, description, base_amount, currency, recurrence,
   recurrence_interval, activation_date, issue_date, status, target_filter,
   target_party_type, created_by, created_at, updated_at)
VALUES
  ('77777777-1111-0000-0000-000000000040',
   '00000000-0000-0000-0000-000000000001',
   'charge', 'Global Alumni Assessment 2027',
   'Yearly member-level assessment across every branch. Reports here show ' ||
     'the cross-branch angle: a fan-out across Buea, Douala, and DC.',
   10000, 'XAF', 'yearly', 1,
   '2027-01-01T00:00:00Z', '2027-01-01T00:00:00Z',
   'active', '{}'::jsonb, 'member',
   '55555555-0000-0000-0000-000000000002',
   NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Manually fan out to six members across three branches (Buea 1–2,
-- Douala 11–12, DC 14–15). Uses the 2019 batch — the newest year the
-- membership loop actually seeds members for.
DO $$
DECLARE
  v_targets TEXT[] := ARRAY[
    -- (member_id, branch_scope_id, membership_status_source_num)
    '88888888-2019-0001-0000-000000000000|00000000-0000-0000-0000-000000000010',
    '88888888-2019-0002-0000-000000000000|00000000-0000-0000-0000-000000000010',
    '88888888-2019-0011-0000-000000000000|00000000-0000-0000-0000-000000000011',
    '88888888-2019-0012-0000-000000000000|00000000-0000-0000-0000-000000000011',
    '88888888-2019-0014-0000-000000000000|00000000-0000-0000-0000-000000000012',
    '88888888-2019-0015-0000-000000000000|00000000-0000-0000-0000-000000000012'
  ];
  v_pair TEXT;
  v_member UUID;
  v_scope UUID;
BEGIN
  FOREACH v_pair IN ARRAY v_targets LOOP
    v_member := split_part(v_pair, '|', 1)::uuid;
    v_scope  := split_part(v_pair, '|', 2)::uuid;
    IF NOT EXISTS (SELECT 1 FROM core.members WHERE id = v_member) THEN
      CONTINUE;
    END IF;
    INSERT INTO finance.obligations
      (id, charge_id, scope_id, party_type, party_id,
       amount, currency, status, period_start, period_end)
    VALUES
      (gen_random_uuid(),
       '77777777-1111-0000-0000-000000000040',
       v_scope,
       'member', v_member,
       10000, 'XAF', 'open',
       '2027-01-01', '2028-01-01')
    ON CONFLICT (charge_id, party_type, party_id, period_start) DO NOTHING;
  END LOOP;
END $$;

-- Two of the six members pay in full so the "cross-branch top payers"
-- panel has real content.
DO $$
DECLARE
  v_ob UUID;
BEGIN
  SELECT id INTO v_ob FROM finance.obligations
   WHERE charge_id = '77777777-1111-0000-0000-000000000040'
     AND party_id = '88888888-2019-0001-0000-000000000000';
  IF v_ob IS NOT NULL THEN
    INSERT INTO finance.payments
      (id, obligation_id, charge_id, scope_id, payer_member_id,
       amount, currency, method, source, recorded_by)
    VALUES
      ('77777777-3333-0000-0000-000000000040',
       v_ob,
       '77777777-1111-0000-0000-000000000040',
       '00000000-0000-0000-0000-000000000010',
       '88888888-2019-0001-0000-000000000000',
       10000, 'XAF', 'mtn_momo', 'auto',
       '55555555-0000-0000-0000-000000000011')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  SELECT id INTO v_ob FROM finance.obligations
   WHERE charge_id = '77777777-1111-0000-0000-000000000040'
     AND party_id = '88888888-2019-0014-0000-000000000000';
  IF v_ob IS NOT NULL THEN
    INSERT INTO finance.payments
      (id, obligation_id, charge_id, scope_id, payer_member_id,
       amount, currency, method, source, recorded_by)
    VALUES
      ('77777777-3333-0000-0000-000000000041',
       v_ob,
       '77777777-1111-0000-0000-000000000040',
       '00000000-0000-0000-0000-000000000012',
       '88888888-2019-0014-0000-000000000000',
       10000, 'XAF', 'bank_transfer', 'manual',
       '55555555-0000-0000-0000-000000000002')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-------------------------------------------------------------------------------
-- 6.4C — Scenario E: Mainstream monthly dues fanned across every branch
-- and autonomous chapter (branch-body obligations, 7-month history)
-------------------------------------------------------------------------------
-- A single Mainstream-issued monthly charge with target_party_type='branch'.
-- One obligation per body per month for the last 6 closed months + the
-- current (still-open) month. Payments are seeded deterministically so a
-- branch admin lands on a realistic mix: fully paid history that fades
-- into partial + missed periods as the current month approaches.
--
-- Bodies covered (XAF only — the charge is XAF, so Shesa DC / USD is
-- excluded to sidestep FX in the demo):
--   * Shesa Buea               00…0010
--   * Shesa Douala             00…0011
--   * Buea University Chapter  00…0020
--
-- Idempotent: charge id + obligation UNIQUE (charge, party, period) +
-- payments guarded by a `seed_marker='branch-monthly-dues'` metadata key.

INSERT INTO finance.charges
  (id, scope_id, shape, name, description, base_amount, currency, recurrence,
   recurrence_interval, activation_date, status, target_filter, target_party_type,
   created_by, created_at, updated_at)
VALUES
  ('77777777-1111-0000-0000-000000000050',
   '00000000-0000-0000-0000-000000000001',
   'charge',
   'Mainstream Monthly Dues',
   'Monthly membership dues owed by every branch and autonomous chapter to the Mainstream.',
   100000, 'XAF', 'monthly', 1,
   date_trunc('month', NOW() - INTERVAL '6 months'),
   'active',
   jsonb_build_object('target_scope_ids', jsonb_build_array(
     '00000000-0000-0000-0000-000000000010',
     '00000000-0000-0000-0000-000000000011',
     '00000000-0000-0000-0000-000000000020'
   )),
   'branch',
   '55555555-0000-0000-0000-000000000001',
   NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Fan out 7 monthly obligations per body (t-6 .. t-0).
DO $$
DECLARE
  v_charge_id UUID := '77777777-1111-0000-0000-000000000050';
  v_bodies    UUID[] := ARRAY[
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000011',
    '00000000-0000-0000-0000-000000000020'
  ];
  v_body      UUID;
  v_offset    INTEGER;
  v_period    DATE;
BEGIN
  FOREACH v_body IN ARRAY v_bodies LOOP
    FOR v_offset IN 0..6 LOOP
      v_period := (date_trunc('month', NOW()) - (v_offset || ' months')::interval)::date;
      INSERT INTO finance.obligations
        (id, charge_id, scope_id, party_type, party_id,
         amount, currency, status, period_start, period_end,
         created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        v_charge_id,
        v_body,
        'branch', v_body,
        100000, 'XAF', 'open',
        v_period,
        (v_period + INTERVAL '1 month' - INTERVAL '1 day')::date,
        v_period::timestamptz,
        NOW()
      )
      ON CONFLICT (charge_id, party_type, party_id, period_start) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Seed payments: older periods lean paid, recent ones lean unpaid.
-- Deterministic per (body, period) via hashtext so `db:reset` is stable.
DO $$
DECLARE
  v_ob         finance.obligations%ROWTYPE;
  v_bucket     INTEGER;   -- 0..99 stable hash
  v_kind       INTEGER;   -- 0 = full pay, 1 = partial, 2 = unpaid
  v_amount     NUMERIC;
  v_paid_at    TIMESTAMPTZ;
BEGIN
  FOR v_ob IN
    SELECT * FROM finance.obligations
     WHERE charge_id = '77777777-1111-0000-0000-000000000050'
     ORDER BY period_start, party_id
  LOOP
    -- Skip future / current-still-mid-cycle periods for the SECOND
    -- payment pass; we still seed a small chance of partial payment on
    -- the current month below.
    IF v_ob.period_start IS NULL THEN CONTINUE; END IF;

    -- Skip if we already seeded a payment for this obligation.
    IF EXISTS (
      SELECT 1 FROM finance.payments
        WHERE obligation_id = v_ob.id
          AND metadata->>'seed_marker' = 'branch-monthly-dues'
    ) THEN CONTINUE; END IF;

    v_bucket := abs(hashtext(v_ob.party_id::text || v_ob.period_start::text)) % 100;

    v_kind := CASE
      -- >= 5 months old: almost everyone paid in full.
      WHEN v_ob.period_start <= (CURRENT_DATE - INTERVAL '5 months')::date THEN
        CASE WHEN v_bucket < 85 THEN 0 WHEN v_bucket < 95 THEN 1 ELSE 2 END
      -- 3–4 months old: still mostly paid, more partials sneak in.
      WHEN v_ob.period_start <= (CURRENT_DATE - INTERVAL '3 months')::date THEN
        CASE WHEN v_bucket < 60 THEN 0 WHEN v_bucket < 85 THEN 1 ELSE 2 END
      -- 1–2 months old: mix of everything.
      WHEN v_ob.period_start <= (CURRENT_DATE - INTERVAL '1 month')::date THEN
        CASE WHEN v_bucket < 35 THEN 0 WHEN v_bucket < 70 THEN 1 ELSE 2 END
      -- current month: mostly still open; a couple paid partial early.
      ELSE
        CASE WHEN v_bucket < 15 THEN 0 WHEN v_bucket < 40 THEN 1 ELSE 2 END
    END;

    IF v_kind = 2 THEN CONTINUE; END IF;

    v_amount := CASE WHEN v_kind = 0 THEN v_ob.amount ELSE v_ob.amount / 2 END;
    -- Post the payment mid-period so the timeline looks realistic.
    v_paid_at := v_ob.period_start::timestamptz + INTERVAL '18 days';

    INSERT INTO finance.payments
      (id, obligation_id, charge_id, scope_id, payer_member_id,
       amount, currency, method, source, recorded_by, created_at, metadata)
    VALUES (
      gen_random_uuid(),
      v_ob.id, v_ob.charge_id, v_ob.scope_id,
      NULL,
      v_amount, v_ob.currency,
      (ARRAY['mtn_momo', 'orange_money', 'bank_transfer', 'cash']
        ::finance.payment_method[])[1 + (v_bucket % 4)],
      'manual',
      '55555555-0000-0000-0000-000000000001',
      v_paid_at,
      jsonb_build_object('seed_marker', 'branch-monthly-dues')
    );
  END LOOP;
END $$;

-------------------------------------------------------------------------------
-- 6.5 Expense settings + a couple of expenses at Buea
-------------------------------------------------------------------------------
-- Threshold set at 20000 XAF so both under- and over-threshold flows are
-- visible: venue rental (12k) hits the ledger directly; honorarium (30k)
-- waits in pending_approval for the admin's sign-off.

INSERT INTO finance.expense_settings
  (scope_id, approval_threshold_amount, approval_threshold_currency, updated_by)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  20000, 'XAF',
  '55555555-0000-0000-0000-000000000010'
)
ON CONFLICT (scope_id) DO NOTHING;

INSERT INTO finance.expenses
  (id, scope_id, category_id, payee, amount, currency, description, status,
   recorded_by, incurred_at, created_at)
VALUES
  ('77777777-4444-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000010',
   (SELECT id FROM finance.expense_categories WHERE key = 'venue'),
   'Buea Community Hall',
   12000, 'XAF', 'January meeting venue.',
   'recorded',
   '55555555-0000-0000-0000-000000000011',
   NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
  ('77777777-4444-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000010',
   (SELECT id FROM finance.expense_categories WHERE key = 'honorarium'),
   'Guest speaker',
   30000, 'XAF', 'AGM keynote honorarium — awaits admin approval.',
   'pending_approval',
   '55555555-0000-0000-0000-000000000011',
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- 7. Exco announcements + events
-- =====================================================================
-- A handful of published + draft rows so the admin dashboard has real
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
-- Section 8. AGM 2026 event group + charges — 2026-07-22
-- =============================================================================
--
-- Seeds the flagship event group (AGM 2026) that drives the public
-- /agm-2026 page. Every finance surface (Dashboard, Transactions,
-- Donations, Expenses, Reports) inside the group's shell filters on
-- `group_id = <this>` — the same rows still show in the mainstream
-- ledger, so the group is a lens, not a silo.
--
-- Charges seeded under the group:
--   • Default AGM 2026 donation campaign (same name as the group).
--   • Ticket (ticketed, 20 000 XAF).
--   • Attire (ticketed, 50 000 XAF).
--   • Funding tiers: Bronze / Silver / Gold / Platinum donation
--     campaigns with per-tier suggested minimums.
--
-- Idempotent via hand-picked UUIDs + ON CONFLICT.

-------------------------------------------------------------------------------
-- 8.1 The group
-------------------------------------------------------------------------------

INSERT INTO finance.groups
  (id, slug, name, description, starts_on, ends_on, status, show_in_sidebar,
   scope_id, created_by, created_at, updated_at)
VALUES
  ('88888888-2026-0000-0000-000000000001',
   'agm-2026',
   'AGM 2026',
   'Annual General Meeting 2026 — tickets, attire orders, and funding tiers all roll up here.',
   (date_trunc('year', NOW()) + INTERVAL '6 months')::date,
   (date_trunc('year', NOW()) + INTERVAL '7 months')::date,
   'active', TRUE,
   '00000000-0000-0000-0000-000000000001',
   '55555555-0000-0000-0000-000000000002',
   NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-------------------------------------------------------------------------------
-- 8.2 Charges — default donation + Ticket + Attire + 4 Funding tiers
-------------------------------------------------------------------------------

-- Default same-named donation campaign. The catch-all bucket for
-- "donate to the AGM" without picking a tier; the four tiered
-- campaigns below sit alongside it for the tier-driven ask.
INSERT INTO finance.charges
  (id, scope_id, shape, name, description, currency, target_filter,
   lifecycle, open_date, close_date, status, group_id,
   created_by, created_at, updated_at)
VALUES
  ('88888888-2026-1111-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'donation', 'AGM 2026',
   'Default AGM 2026 donation campaign. Any amount, any tier.',
   'XAF', '{}'::jsonb,
   'open',
   (date_trunc('year', NOW()))::timestamptz,
   (date_trunc('year', NOW()) + INTERVAL '9 months')::timestamptz,
   'active', '88888888-2026-0000-0000-000000000001',
   '55555555-0000-0000-0000-000000000002',
   NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Ticket (ticketed, 20 000 XAF). The flat entry price for the AGM.
INSERT INTO finance.charges
  (id, scope_id, shape, name, description, base_amount, currency,
   target_filter, target_party_type, lifecycle, open_date, close_date,
   status, group_id, created_by, created_at, updated_at)
VALUES
  ('88888888-2026-1111-0000-000000000002',
   '00000000-0000-0000-0000-000000000001',
   'ticketed', 'Ticket',
   'AGM 2026 entry ticket — 20 000 XAF per head.',
   20000, 'XAF', '{}'::jsonb, 'member',
   'open',
   (date_trunc('year', NOW()))::timestamptz,
   (date_trunc('year', NOW()) + INTERVAL '7 months')::timestamptz,
   'active', '88888888-2026-0000-0000-000000000001',
   '55555555-0000-0000-0000-000000000002',
   NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Attire (ticketed, 50 000 XAF). Custom-tailored piece; buyer supplies
-- measurements in payments.metadata.
INSERT INTO finance.charges
  (id, scope_id, shape, name, description, base_amount, currency,
   target_filter, target_party_type, lifecycle, open_date, close_date,
   status, group_id, created_by, created_at, updated_at)
VALUES
  ('88888888-2026-1111-0000-000000000003',
   '00000000-0000-0000-0000-000000000001',
   'ticketed', 'Attire',
   'AGM 2026 attire order — 50 000 XAF. Measurements captured at purchase.',
   50000, 'XAF', '{}'::jsonb, 'member',
   'open',
   (date_trunc('year', NOW()))::timestamptz,
   (date_trunc('year', NOW()) + INTERVAL '6 months')::timestamptz,
   'active', '88888888-2026-0000-0000-000000000001',
   '55555555-0000-0000-0000-000000000002',
   NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Funding tiers — donation-shape charges keyed by suggested minimum.
-- Public site collects the tier + payer identity in payments.metadata.
INSERT INTO finance.charges
  (id, scope_id, shape, name, description, currency, min_amount,
   target_filter, lifecycle, open_date, close_date, status, group_id,
   created_by, created_at, updated_at)
VALUES
  ('88888888-2026-1111-0000-000000000010',
   '00000000-0000-0000-0000-000000000001',
   'donation', 'Bronze Funding',
   'AGM 2026 funding tier — Bronze. Suggested 50 000 XAF.',
   'XAF', 50000, '{}'::jsonb,
   'open',
   (date_trunc('year', NOW()))::timestamptz,
   (date_trunc('year', NOW()) + INTERVAL '9 months')::timestamptz,
   'active', '88888888-2026-0000-0000-000000000001',
   '55555555-0000-0000-0000-000000000002',
   NOW(), NOW()),
  ('88888888-2026-1111-0000-000000000011',
   '00000000-0000-0000-0000-000000000001',
   'donation', 'Silver Funding',
   'AGM 2026 funding tier — Silver. Suggested 250 000 XAF.',
   'XAF', 250000, '{}'::jsonb,
   'open',
   (date_trunc('year', NOW()))::timestamptz,
   (date_trunc('year', NOW()) + INTERVAL '9 months')::timestamptz,
   'active', '88888888-2026-0000-0000-000000000001',
   '55555555-0000-0000-0000-000000000002',
   NOW(), NOW()),
  ('88888888-2026-1111-0000-000000000012',
   '00000000-0000-0000-0000-000000000001',
   'donation', 'Gold Funding',
   'AGM 2026 funding tier — Gold. Suggested 1 000 000 XAF.',
   'XAF', 1000000, '{}'::jsonb,
   'open',
   (date_trunc('year', NOW()))::timestamptz,
   (date_trunc('year', NOW()) + INTERVAL '9 months')::timestamptz,
   'active', '88888888-2026-0000-0000-000000000001',
   '55555555-0000-0000-0000-000000000002',
   NOW(), NOW()),
  ('88888888-2026-1111-0000-000000000013',
   '00000000-0000-0000-0000-000000000001',
   'donation', 'Platinum Funding',
   'AGM 2026 funding tier — Platinum. Suggested 5 000 000 XAF.',
   'XAF', 5000000, '{}'::jsonb,
   'open',
   (date_trunc('year', NOW()))::timestamptz,
   (date_trunc('year', NOW()) + INTERVAL '9 months')::timestamptz,
   'active', '88888888-2026-0000-0000-000000000001',
   '55555555-0000-0000-0000-000000000002',
   NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
