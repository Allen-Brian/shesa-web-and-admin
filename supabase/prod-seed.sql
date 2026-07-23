-- =============================================================================
-- Production seed — Shesa Connect
-- =============================================================================
--
-- Cold-start seed for production. Everything the platform NEEDS before the
-- first login, nothing else:
--   1. The mainstream scope (root of the tree) + its capabilities.
--   2. The four Houses + all Batches from 1953 through 2026.
--   3. The RBAC catalogue: system roles, permissions, role → permission
--      bundles.
--   4. Three human users — admin@ / finance@ / editor@shesaconnect.com —
--      with auth rows, identity rows, profile rows, and global (NULL-scope)
--      role assignments.
--   5. The `AGM 2026` finance group + its charges (Ticket / Attire /
--      default donation / Bronze / Silver / Gold / Platinum funding) so
--      the public /agm-2026 forms have somewhere to write.
--
-- Every other table is left empty. Members, memberships, branches, chapters,
-- payments, expenses, CMS content, etc. are all populated through the app.
--
-- HOW TO RUN
-- ----------
-- This file is NOT the default `seed.sql` (that one carries dev fixtures).
-- Run it explicitly against a linked prod database:
--
--     supabase link --project-ref <project-ref>
--     supabase db reset --linked --no-seed           # migrations only
--     psql "$SUPABASE_DB_URL" -f supabase/prod-seed.sql
--
-- See docs/runbooks/prod-database-reset.md for the full walkthrough
-- (rotating the DB password, confirming state, first login, etc.).
--
-- IDEMPOTENT: every insert uses a stable hand-picked UUID and
-- ON CONFLICT DO NOTHING. Re-running this file is safe — it will not
-- clobber changes admins have made in the app after the initial run.
-- Rows that already exist stay put; rows the seed adds are additive.
--
-- WARNING: the auth.users passwords are literal in this file. Chat logs
-- and repo history are NOT a safe place for prod credentials. Rotate
-- each user's password via Supabase Auth immediately after first login,
-- then delete or scrub this file's password lines from any log surface
-- you archive.


-- =============================================================================
-- Section 1. Mainstream scope + capabilities
-- =============================================================================
--
-- Single mainstream node — the root of the org tree. Every other scope
-- (branches, chapters, batches, houses, networks, sectors) hangs off this.

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
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  TRUE, TRUE, TRUE, TRUE, TRUE, TRUE
)
ON CONFLICT (scope_id) DO NOTHING;


-- =============================================================================
-- Section 2. RBAC catalogue — roles, permissions, role → permission bundles
-- =============================================================================
--
-- The seven system roles + the full permission catalogue + the default
-- role → permission bundles. Keys mirror @shesa/types ROLE_KEYS and
-- PERMISSION_KEYS. Editing this section without editing @shesa/types
-- (or vice versa) will fail TypeScript compilation in the apps.

-------------------------------------------------------------------------------
-- 2.1 Roles
-------------------------------------------------------------------------------

INSERT INTO core.roles (id, key, name, description) VALUES
  ('11111111-0000-0000-0000-000000000001', 'mainstream_admin', 'Mainstream Admin',
   'Top-level admin: full authority across every scope (granted globally with NULL scope; reaches autonomous chapters).'),
  ('11111111-0000-0000-0000-000000000002', 'branch_admin', 'Branch Admin',
   'Authority over a Branch and everything under it.'),
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
--
-- The migrations that ship these permission rows also insert them, but
-- listing them here explicitly protects the seed against a migration
-- being re-tagged or squashed later. ON CONFLICT (key) on the natural
-- key keeps re-runs harmless.

INSERT INTO core.permissions (id, key, description) VALUES
  ('22222222-0000-0000-0000-000000000001', 'scope.read',          'Read org-hierarchy nodes and their capabilities.'),
  ('22222222-0000-0000-0000-000000000002', 'scope.manage',        'Create/edit/disable scopes (Branches, Chapters, etc.).'),
  ('22222222-0000-0000-0000-000000000003', 'member.read',         'View member directory + profiles.'),
  ('22222222-0000-0000-0000-000000000004', 'member.manage',       'Create / edit / invite / transfer / exit members.'),
  ('22222222-0000-0000-0000-000000000005', 'role.grant',          'Grant a role to a user at a scope.'),
  ('22222222-0000-0000-0000-000000000006', 'role.revoke',         'Revoke an active role assignment.'),
  ('22222222-0000-0000-0000-000000000007', 'finance.read',        'Read charges, obligations, payments, treasury balances.'),
  ('22222222-0000-0000-0000-000000000008', 'finance.write',       'Create/edit charges, record payments, run reports.'),
  ('22222222-0000-0000-0000-000000000009', 'cms.edit',            'Draft, edit, publish CMS content (articles, pages, gallery).'),
  ('22222222-0000-0000-0000-000000000010', 'connect.announce',    'Publish announcements to Connect forums.'),
  ('22222222-0000-0000-0000-000000000011', 'connect.poll',        'Create polls in Connect.'),
  ('22222222-0000-0000-0000-000000000012', 'connect.job.approve', 'Approve and publish Recruiter-submitted job postings.'),
  ('22222222-0000-0000-0000-000000000013', 'audit.read',          'Read audit_entries — full event log per scope.'),
  ('22222222-0000-0000-0000-000000000014', 'scope.create',        'Create a new scope (Branch, Chapter, Sector, Batch) with parent + initial capabilities.'),
  ('22222222-0000-0000-0000-000000000015', 'scope.update',        'Edit an existing scope: name, geography, currency (until finance exists), metadata.'),
  ('22222222-0000-0000-0000-000000000016', 'scope.change_autonomy','Flip a chapter''s autonomy (autonomous ↔ grouping).'),
  ('22222222-0000-0000-0000-000000000017', 'member.create',       'Create a new member (via UI, import, or admin form).'),
  ('22222222-0000-0000-0000-000000000018', 'member.update',       'Edit protected member fields (full_name, batch, house, network, entry_year).'),
  ('22222222-0000-0000-0000-000000000019', 'member.import',       'Upload and confirm Excel member-import batches.'),
  ('22222222-0000-0000-0000-000000000020', 'membership.approve',  'Approve a join request into a geographic body.'),
  ('22222222-0000-0000-0000-000000000021', 'membership.reject',   'Reject a join request into a geographic body.'),
  ('22222222-0000-0000-0000-000000000022', 'membership.transfer', 'Initiate, approve, or reject a member transfer between geographic bodies.'),
  ('22222222-0000-0000-0000-000000000023', 'membership.mark_passive', 'Flip a membership between active and passive.'),
  ('22222222-0000-0000-0000-000000000024', 'registration.mark_paid',  'Mark a member''s registration fee as paid (non-gating flag).'),
  ('22222222-0000-0000-0000-000000000025', 'scope.manage_capabilities', 'Flip capability flags on a scope (treasury, dues, forum, active/passive labelling).'),
  ('22222222-0000-0000-0000-000000000026', 'member.export',        'Export the member directory as CSV or Excel (crosses the RLS boundary).'),
  ('22222222-0000-0000-0000-000000000027', 'position.assign',      'Assign a position (badge) to a member at a scope.'),
  ('22222222-0000-0000-0000-000000000028', 'position.remove',      'Remove an active position assignment.'),
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
-- Resolved by KEY, not UUID, so this file survives UUID edits upstream.
-- The composite PK (role_id, permission_id) makes each bundle re-runnable.

-- Mainstream Admin — the everything role.
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
CROSS JOIN core.permissions p
WHERE r.key = 'mainstream_admin'
ON CONFLICT DO NOTHING;

-- Branch Admin — governance + members + role management + CMS + announcements
-- + event + palette. Excludes finance.write (Finance owns money) and
-- connect.job.approve (Recruiter workflow).
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key IN (
  'scope.read', 'scope.manage',
  'scope.create', 'scope.update', 'scope.change_autonomy',
  'member.read', 'member.manage', 'member.create', 'member.update',
  'member.import',
  'membership.approve', 'membership.reject',
  'membership.transfer', 'membership.mark_passive',
  'registration.mark_paid', 'registration.waive',
  'scope.manage_capabilities', 'member.export',
  'position.assign', 'position.remove',
  'role.grant', 'role.revoke',
  'finance.read',
  'cms.edit',
  'connect.announce', 'connect.poll',
  'audit.read',
  'event.create', 'event.update', 'event.publish', 'event.cancel', 'event.archive',
  'announcement.create', 'announcement.update', 'announcement.publish', 'announcement.archive',
  'member.bulk_action', 'command.search', 'admin_notification.read'
)
WHERE r.key = 'branch_admin'
ON CONFLICT DO NOTHING;

-- Finance — money movement + visibility + audit. Includes the Phase 3
-- fine-grained keys (charge.*, payment.*, expense.*, etc.) that the
-- finance_permissions migration ships, and the Module 4 group /
-- reconciliation keys.
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key IN (
  'scope.read',
  'member.read',
  'finance.read', 'finance.write',
  'audit.read',
  'charge.create', 'charge.update', 'charge.archive',
  'contribution.approve', 'contribution.extend', 'donation.record',
  'payment.record', 'payment.record_on_behalf', 'payment.reverse',
  'obligation.cancel',
  'exception.create',
  'expense.record', 'expense.reverse',
  'treasury.read', 'finance.report', 'finance.export',
  'receipt.generate', 'exchange_rate.set', 'ticket.purchase',
  'group.manage', 'reconciliation.record'
)
WHERE r.key = 'finance'
ON CONFLICT DO NOTHING;

-- Editor — CMS only.
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key IN ('scope.read', 'cms.edit')
WHERE r.key = 'editor'
ON CONFLICT DO NOTHING;

-- Recruiter — read-only members (so they can eventually invite candidates).
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key IN ('scope.read', 'member.read')
WHERE r.key = 'recruiter'
ON CONFLICT DO NOTHING;

-- Announcer — Connect announcements + polls, plus read members to
-- target audiences.
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key IN (
  'scope.read', 'member.read',
  'connect.announce', 'connect.poll'
)
WHERE r.key = 'announcer'
ON CONFLICT DO NOTHING;


-- =============================================================================
-- Section 3. Batches (1953–2026) + Houses (4)
-- =============================================================================

-------------------------------------------------------------------------------
-- 3.1 Batches — every intake year 1953 through 2026
-------------------------------------------------------------------------------
-- Adding a batch year: bump the upper bound in generate_series and rerun
-- this file. Phase 2 ships a `create-next-year-batch` Edge Function
-- that keeps prod current via pg_cron so this seed only needs to catch
-- up to the current year at the moment of the reset.

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

-- Detail-table row per batch (currently just the FK; more fields land
-- here in later phases).
INSERT INTO core.batches (scope_id)
SELECT id FROM core.scopes WHERE scope_type = 'batch'
ON CONFLICT (scope_id) DO NOTHING;

-------------------------------------------------------------------------------
-- 3.2 Houses — the four canonical houses
-------------------------------------------------------------------------------
-- Two rows per house: the scope spine + the detail row (colour + hex +
-- display order). Houses are view-only in the app — never created,
-- edited, or deleted through the UI.

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
  ('33333333-0000-0000-0000-000000000001', 'blue',   '#1E40AF', 1),
  ('33333333-0000-0000-0000-000000000002', 'yellow', '#EAB308', 2),
  ('33333333-0000-0000-0000-000000000003', 'green',  '#15803D', 3),
  ('33333333-0000-0000-0000-000000000004', 'red',    '#B91C1C', 4)
ON CONFLICT (scope_id) DO NOTHING;


-- =============================================================================
-- Section 4. Human users — auth + identities + profiles
-- =============================================================================
--
-- Three admin humans, one per portal:
--   admin@shesaconnect.com     → Mainstream Admin  (exco persona)
--   finance@shesaconnect.com   → Finance           (finance persona)
--   editor@shesaconnect.com    → Editor            (editor persona)
--
-- Passwords are literal in this file. ROTATE EACH via Supabase Auth
-- (Users → “…” → Send password reset) immediately after first login.
-- Chat logs, PR reviews, and Git history are NOT a safe place for
-- prod credentials.
--
-- We write directly into auth.users + auth.identities because the seed
-- runs as the superuser and the admin API isn't reachable at seed time.
-- Every column not defaulted by the schema is set explicitly to keep
-- the seed forward-compatible across supabase-cli versions.
--
-- Idempotent via hand-picked UUIDs + ON CONFLICT DO NOTHING.

-------------------------------------------------------------------------------
-- 4.1 auth.users
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
    'admin@shesaconnect.com',
    crypt('ShesaAdmin2026!', gen_salt('bf')),
    NOW(), NULL, '', NULL,
    '', NULL, '', '',
    NULL, NULL,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Mainstream Admin"}'::jsonb,
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
    'finance@shesaconnect.com',
    crypt('ShesaFinance2026!', gen_salt('bf')),
    NOW(), NULL, '', NULL,
    '', NULL, '', '',
    NULL, NULL,
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Mainstream Finance"}'::jsonb,
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
    'editor@shesaconnect.com',
    crypt('ShesaEditor2026!', gen_salt('bf')),
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
-- 4.2 auth.identities — required by GoTrue's email-provider lookup
-------------------------------------------------------------------------------
-- `provider_id` is the identity's stable id from the provider. For the
-- email provider it's the user id itself (there's no external OAuth sub).

INSERT INTO auth.identities (
  provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) VALUES
  (
    '55555555-0000-0000-0000-000000000001',
    '55555555-0000-0000-0000-000000000001',
    jsonb_build_object(
      'sub',   '55555555-0000-0000-0000-000000000001',
      'email', 'admin@shesaconnect.com',
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
      'email', 'finance@shesaconnect.com',
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
      'email', 'editor@shesaconnect.com',
      'email_verified', true,
      'phone_verified', false
    ),
    'email', NOW(), NOW(), NOW()
  )
ON CONFLICT (provider, provider_id) DO NOTHING;

-------------------------------------------------------------------------------
-- 4.3 core.profiles — 1:1 mirrors with auth.users
-------------------------------------------------------------------------------

INSERT INTO core.profiles (id, display_name, email, preferred_persona)
VALUES
  ('55555555-0000-0000-0000-000000000001', 'Mainstream Admin',   'admin@shesaconnect.com',   'exco'),
  ('55555555-0000-0000-0000-000000000002', 'Mainstream Finance', 'finance@shesaconnect.com', 'finance'),
  ('55555555-0000-0000-0000-000000000020', 'Site Editor',        'editor@shesaconnect.com',  'editor')
ON CONFLICT (id) DO NOTHING;

-------------------------------------------------------------------------------
-- 4.4 core.role_assignments — global (NULL-scope) grants
-------------------------------------------------------------------------------
-- All three admins get their role globally so their reach is
-- unconditional. Scoped grants would clip on the autonomy walk in
-- `has_permission`; a NULL-scope grant is the canonical shape for a
-- platform-wide role.

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
    '55555555-0000-0000-0000-000000000020',
    NULL,
    '11111111-0000-0000-0000-000000000005',  -- editor
    NOW()
  )
ON CONFLICT DO NOTHING;


-- =============================================================================
-- Section 5. AGM 2026 finance group + its charges
-- =============================================================================
--
-- The public /agm-2026 page has three form flows that hit finance:
--   • Registration   — `Ticket` charge (ticketed, 20 000 XAF per head)
--   • Attire         — `Attire` charge (ticketed, 50 000 XAF per piece)
--   • Funding        — donation-shape charges keyed by tier
--                      (Bronze / Silver / Gold / Platinum) + a
--                      default `AGM 2026` catch-all for tier-less gifts.
--
-- Every one of these charges is filed under the `agm-2026` finance
-- group so Finance can browse the AGM's money-flow in isolation while
-- the mainstream pages still show every row.

-------------------------------------------------------------------------------
-- 5.1 The group
-------------------------------------------------------------------------------

INSERT INTO finance.groups
  (id, slug, name, description, starts_on, ends_on, status, show_in_sidebar,
   scope_id, created_by, created_at, updated_at)
VALUES
  ('88888888-2026-0000-0000-000000000001',
   'agm-2026',
   'AGM 2026',
   'Annual General Meeting 2026 — tickets, attire orders, and funding tiers all roll up here.',
   DATE '2026-11-13',
   DATE '2026-11-15',
   'active', TRUE,
   '00000000-0000-0000-0000-000000000001',
   '55555555-0000-0000-0000-000000000002',
   NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-------------------------------------------------------------------------------
-- 5.2 Charges — default donation + Ticket + Attire + 4 funding tiers
-------------------------------------------------------------------------------

-- Default catch-all donation campaign — "donate to AGM 2026" without a tier.
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
   TIMESTAMPTZ '2026-01-01 00:00:00+00',
   TIMESTAMPTZ '2026-11-30 23:59:59+00',
   'active', '88888888-2026-0000-0000-000000000001',
   '55555555-0000-0000-0000-000000000002',
   NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Ticket — 20 000 XAF flat entry.
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
   TIMESTAMPTZ '2026-01-01 00:00:00+00',
   TIMESTAMPTZ '2026-11-13 23:59:59+00',
   'active', '88888888-2026-0000-0000-000000000001',
   '55555555-0000-0000-0000-000000000002',
   NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Attire — 50 000 XAF custom-tailored piece; measurements ride in
-- payments.metadata.
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
   TIMESTAMPTZ '2026-01-01 00:00:00+00',
   TIMESTAMPTZ '2026-10-31 23:59:59+00',
   'active', '88888888-2026-0000-0000-000000000001',
   '55555555-0000-0000-0000-000000000002',
   NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Funding tiers — donation-shape charges with suggested minima.
-- The public site collects the tier tag + payer identity into
-- payments.metadata; Finance rolls up by tier in the group's
-- Donations tab.
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
   TIMESTAMPTZ '2026-01-01 00:00:00+00',
   TIMESTAMPTZ '2026-11-30 23:59:59+00',
   'active', '88888888-2026-0000-0000-000000000001',
   '55555555-0000-0000-0000-000000000002',
   NOW(), NOW()),
  ('88888888-2026-1111-0000-000000000011',
   '00000000-0000-0000-0000-000000000001',
   'donation', 'Silver Funding',
   'AGM 2026 funding tier — Silver. Suggested 250 000 XAF.',
   'XAF', 250000, '{}'::jsonb,
   'open',
   TIMESTAMPTZ '2026-01-01 00:00:00+00',
   TIMESTAMPTZ '2026-11-30 23:59:59+00',
   'active', '88888888-2026-0000-0000-000000000001',
   '55555555-0000-0000-0000-000000000002',
   NOW(), NOW()),
  ('88888888-2026-1111-0000-000000000012',
   '00000000-0000-0000-0000-000000000001',
   'donation', 'Gold Funding',
   'AGM 2026 funding tier — Gold. Suggested 1 000 000 XAF.',
   'XAF', 1000000, '{}'::jsonb,
   'open',
   TIMESTAMPTZ '2026-01-01 00:00:00+00',
   TIMESTAMPTZ '2026-11-30 23:59:59+00',
   'active', '88888888-2026-0000-0000-000000000001',
   '55555555-0000-0000-0000-000000000002',
   NOW(), NOW()),
  ('88888888-2026-1111-0000-000000000013',
   '00000000-0000-0000-0000-000000000001',
   'donation', 'Platinum Funding',
   'AGM 2026 funding tier — Platinum. Suggested 5 000 000 XAF.',
   'XAF', 5000000, '{}'::jsonb,
   'open',
   TIMESTAMPTZ '2026-01-01 00:00:00+00',
   TIMESTAMPTZ '2026-11-30 23:59:59+00',
   'active', '88888888-2026-0000-0000-000000000001',
   '55555555-0000-0000-0000-000000000002',
   NOW(), NOW())
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- End of production seed
-- =============================================================================
--
-- Summary of what this file has just populated:
--   • 1 mainstream scope + capabilities
--   • 74 batches (1953 → 2026) + 4 houses
--   • 6 system roles + 42 permissions + full role → permission bundles
--   • 3 human users (admin / finance / editor @shesaconnect.com)
--     with auth rows, identities, profiles, and global role grants
--   • 1 finance group (AGM 2026) + 7 charges
--     (default donation + Ticket + Attire + 4 funding tiers)
--
-- Everything else — members, memberships, branches, chapters, networks,
-- CMS content, payments, expenses, transfers, etc. — is intentionally
-- empty. The apps populate those through the standard flows.
