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
-- 1.2 One sample Branch (verifies parent FK + autonomy + capability flow)
-------------------------------------------------------------------------------

INSERT INTO core.scopes (id, name, slug, scope_type, parent_scope_id, is_autonomous, currency_code)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  'Shesa Buea',
  'shesa-buea',
  'branch',
  '00000000-0000-0000-0000-000000000001',
  FALSE,
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
  '00000000-0000-0000-0000-000000000010',
  TRUE, TRUE, TRUE, TRUE, TRUE, TRUE
)
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
   'Top-level admin: full authority across every scope (clipped by autonomy).'),
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
  ('22222222-0000-0000-0000-000000000018', 'member.update',       'Edit protected member fields (full_name, batch, house, sector, entry_year).'),
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
-- Section 3. Phase 1 E1.1 org fixtures — batches, houses, Other sector
-- =============================================================================
--
-- All three groups (batches, houses, sectors) are mainstream-scoped rows
-- in core.scopes — per E1.1's locked decision, only Branches and Chapters
-- carry geographic hierarchy; everything else lives directly under the
-- Mainstream root.
--
-- Idempotent via ON CONFLICT DO NOTHING on the natural key (slug for
-- houses/sector, entry_year via the partial unique index for batches).

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
  'Batch ' || y::text,
  'batch-' || y::text,
  'batch',
  '00000000-0000-0000-0000-000000000001',
  y,
  'XAF'
FROM generate_series(1953, 2026) AS y
ON CONFLICT (slug) DO NOTHING;

-------------------------------------------------------------------------------
-- 3.2 Houses — the four seeded houses with colors (Phase 1 §2.3)
-------------------------------------------------------------------------------
-- Color lives in the metadata JSONB rather than a first-class column
-- because it's UI-only. If a future feature reads color for filtering,
-- lift it into a typed column then.

INSERT INTO core.scopes (
  id, name, slug, scope_type, parent_scope_id, currency_code, metadata
) VALUES
  ('33333333-0000-0000-0000-000000000001', 'St Thomas',  'st-thomas',  'house',
   '00000000-0000-0000-0000-000000000001', 'XAF', '{"color":"blue"}'::jsonb),
  ('33333333-0000-0000-0000-000000000002', 'St Peter',   'st-peter',   'house',
   '00000000-0000-0000-0000-000000000001', 'XAF', '{"color":"yellow"}'::jsonb),
  ('33333333-0000-0000-0000-000000000003', 'St Francis', 'st-francis', 'house',
   '00000000-0000-0000-0000-000000000001', 'XAF', '{"color":"green"}'::jsonb),
  ('33333333-0000-0000-0000-000000000004', 'St John',    'st-john',    'house',
   '00000000-0000-0000-0000-000000000001', 'XAF', '{"color":"red"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-------------------------------------------------------------------------------
-- 3.3 Sector — "Other" (Phase 1 §2.4)
-------------------------------------------------------------------------------
-- Mainstream Admin creates additional sectors via the create-sector Edge
-- Function; "Other" is the fallback every member-creation form can pick
-- so an incomplete import row still validates.

INSERT INTO core.scopes (
  id, name, slug, scope_type, parent_scope_id, currency_code
) VALUES
  ('44444444-0000-0000-0000-000000000001', 'Other', 'sector-other', 'sector',
   '00000000-0000-0000-0000-000000000001', 'XAF')
ON CONFLICT (id) DO NOTHING;
