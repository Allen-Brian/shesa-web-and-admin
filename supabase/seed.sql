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
--   1. Org hierarchy fixtures (E2)
--   2. RBAC system roles, permissions, role_permissions (E3)

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
  ('22222222-0000-0000-0000-000000000013', 'audit.read',          'Read audit_entries — full event log per scope.')
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
  'member.read', 'member.manage',
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
