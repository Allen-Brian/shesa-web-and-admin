-- =============================================================================
-- Shesa Connect — bootstrap seed
-- =============================================================================
--
-- The authoritative cold-start seed. Safe to run against production, and the
-- one `supabase/config.toml` wires into `[db.seed]`, so it also runs on every
-- local reset and in CI.
--
-- What it populates:
--   1. The mainstream scope (root of the tree) + its capabilities.
--   2. The RBAC catalogue: 6 system roles, 42 permissions, role → permission
--      bundles.
--   3. All batches (1953 → 2026) + the four Houses.
--   4. Three human users — admin@ / finance@ / editor@shesaconnect.com — with
--      auth rows, identities, profiles and global (NULL-scope) role grants.
--   5. The `AGM 2026` finance group + its charges. The event runs to
--      13 November 2026, so this stays in the production bootstrap.
--   6. The five founding branches: Yaoundé, Douala, Buea, Tiko, Bamenda.
--   7. Public-website content — leadership, articles, projects, site events,
--      gallery, organs, songs.
--
-- Section 7 used to arrive as seven `*_seed.sql` MIGRATIONS, which meant demo
-- content shipped to every database whether it was wanted or not, and could
-- not be corrected without a new migration. It is real SHESA content, so it
-- belongs in the production bootstrap — but as seed data, not as schema.
--
-- ── NOT seeded, by decision ─────────────────────────────────────────────────
-- Chapters and networks are created through the Admin portal instead.
--
--   ⚠ One consequence to plan around: the member spreadsheet import treats
--     `network` as a REQUIRED column and rejects any row whose value does not
--     match a seeded network (packages/domain/src/imports/validation.ts and
--     its Deno mirror). Until someone creates the networks in the portal,
--     every member import will fail every row. Make that the first
--     post-reset admin task.
--
-- Members, memberships, payments, expenses, obligations, transfers,
-- announcements and events are all left empty — the apps populate those.
-- For a populated local environment, run `supabase/seed-demo.sql` afterwards.
--
-- ── Idempotency ─────────────────────────────────────────────────────────────
-- Every insert uses a stable hand-picked UUID with ON CONFLICT DO NOTHING.
-- Re-running is safe: rows that already exist stay put, and nothing an admin
-- changed in the app gets clobbered.
--
-- ── ⚠ Credentials ───────────────────────────────────────────────────────────
-- The auth.users passwords are literal in this file. That is a deliberate,
-- accepted decision — the three seeded accounts change their own passwords if
-- and when they choose. Be aware that repo history and any log surface that
-- captures this file therefore contain them.

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
-- 2.2 Permissions + role bundles
-------------------------------------------------------------------------------
-- Generated from the 112-migration database, not hand-written.
--
-- The old seed listed 42 permissions. The database had 70: the finance-grain
-- keys (treasury.read, payment.record, charge.create, expense.approve and 24
-- more) were added by MIGRATIONS rather than the seed, so a seed-only reading
-- of the catalogue was missing 28 of them — and so was
-- packages/types/src/permission-key.ts, which means those keys were untyped
-- everywhere they were used. Both are now complete and agree.
--
-- Reference data belongs in the seed, not in migrations: a migration cannot be
-- corrected without another migration, and the catalogue is not schema.

INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000015', 'scope.update', 'Edit an existing scope: name, geography, currency (until finance exists), metadata.', '2026-09-02 20:11:28.232845+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000016', 'scope.change_autonomy', 'Flip a chapter''s autonomy (autonomous ↔ grouping). Distinct permission from scope.update because the effect on membership + capabilities is severe.', '2026-09-02 20:11:28.232845+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000017', 'member.create', 'Create a new member (via UI, import, or admin form).', '2026-09-02 20:11:28.241426+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000019', 'member.import', 'Upload and confirm Excel member-import batches. Distinct from member.create because import operates on many members at once with duplicate-detection review.', '2026-09-02 20:11:28.253271+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000020', 'membership.approve', 'Approve a join request into a geographic body.', '2026-09-02 20:11:28.26835+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000021', 'membership.reject', 'Reject a join request into a geographic body.', '2026-09-02 20:11:28.26835+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000022', 'membership.transfer', 'Initiate, approve, or reject a member transfer between geographic bodies.', '2026-09-02 20:11:28.26835+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000023', 'membership.mark_passive', 'Flip a membership between active and passive (§2.16 — geographic-body admin only).', '2026-09-02 20:11:28.26835+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000024', 'registration.mark_paid', 'Mark a member''s registration fee as paid (§2.13; non-gating searchable flag).', '2026-09-02 20:11:28.26835+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000025', 'scope.manage_capabilities', 'Flip capability flags on a scope (treasury, dues, forum, active/passive labelling).', '2026-09-02 20:11:28.274481+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000026', 'member.export', 'Export the member directory as CSV or Excel. Distinct from member.read because exports carry data outside the RLS boundary.', '2026-09-02 20:11:28.274481+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000027', 'position.assign', 'Assign a position (badge) to a member at a scope. Distinct from role.grant — positions are titles, not authority.', '2026-09-02 20:11:28.281704+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000028', 'position.remove', 'Remove an active position assignment.', '2026-09-02 20:11:28.281704+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000029', 'registration.waive', 'Waive a member''s registration fee. Distinct from mark_paid because the audit action is different.', '2026-09-02 20:11:28.291776+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000030', 'event.create', 'Create a governance event (Meeting, AGM, Convention, etc.) at a scope.', '2026-09-02 20:11:28.291776+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000031', 'event.update', 'Edit a draft or scheduled event.', '2026-09-02 20:11:28.291776+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000032', 'event.publish', 'Transition an event from draft/scheduled to published; makes it visible to the target audience.', '2026-09-02 20:11:28.291776+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000033', 'event.cancel', 'Cancel a published or scheduled event.', '2026-09-02 20:11:28.291776+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000034', 'event.archive', 'Archive a completed or cancelled event.', '2026-09-02 20:11:28.291776+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000035', 'event.contribution.review', 'Review event contribution settings (Finance approval placeholder until Phase 3 finance ships).', '2026-09-02 20:11:28.291776+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000036', 'announcement.create', 'Create an announcement draft.', '2026-09-02 20:11:28.291776+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000037', 'announcement.update', 'Edit a draft or scheduled announcement.', '2026-09-02 20:11:28.291776+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000038', 'announcement.publish', 'Publish an announcement (immediate or scheduled).', '2026-09-02 20:11:28.291776+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000039', 'announcement.archive', 'Archive an announcement (published, expired, or draft).', '2026-09-02 20:11:28.291776+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000041', 'command.search', 'Consume command-palette search results across members/events/announcements. Permission-filtered per current context.', '2026-09-02 20:11:28.291776+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000042', 'admin_notification.read', 'Read + mark-read the admin notification bell + inbox.', '2026-09-02 20:11:28.291776+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000018', 'member.update', 'Edit protected member fields (full_name, batch, house, network, entry_year). Member-editable fields (display_name, current_*) don''t require this.', '2026-09-02 20:11:28.241426+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000040', 'member.bulk_action', 'Run a bulk action (invite, export, assign network, mark left, etc.) over a selected member list.', '2026-09-02 20:11:28.291776+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000014', 'scope.create', 'Create a new scope (Branch, Chapter, Network, Batch). Includes setting parent + initial capabilities.', '2026-09-02 20:11:28.232845+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000043', 'membership.engagement.set', 'Set / promote / demote the manual engagement tier on a membership (dormant / normal / engaged / committed).', '2026-09-02 20:11:28.335842+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000044', 'membership.remove', 'Remove a member from a scope (ends the membership row). Its own key — not shared with membership.approve.', '2026-09-02 20:11:28.335842+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000046', 'registration.pay_on_behalf', 'Record that someone paid a member''s registration fee on their behalf (records paid_on_behalf_at / paid_on_behalf_by / paid_on_behalf_note).', '2026-09-02 20:11:28.335842+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000047', 'charge.create', 'Create a charge (dues / levy) or contribution (goal / open / ticketed / fixed) at a finance-bearing scope.', '2026-09-02 20:11:28.397169+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000048', 'charge.update', 'Edit a draft or paused charge (name, description, target filter, dates).', '2026-09-02 20:11:28.397169+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000049', 'charge.archive', 'Archive a charge (soft delete; history stays).', '2026-09-02 20:11:28.397169+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000050', 'contribution.approve', 'Approve an Admin-proposed contribution so it can go live (Finance-only gate).', '2026-09-02 20:11:28.397169+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000051', 'contribution.extend', 'Extend a contribution''s close date after it has passed (audited).', '2026-09-02 20:11:28.397169+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000052', 'donation.record', 'Record a walk-in donation (freewill gift, no obligation).', '2026-09-02 20:11:28.397169+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000053', 'payment.record', 'Record a payment (auto via provider window, or manual/cash entered by a human).', '2026-09-02 20:11:28.397169+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000054', 'payment.record_on_behalf', 'Record a payment on behalf of a member (payer is not the member; Finance or Admin uses this).', '2026-09-02 20:11:28.397169+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000055', 'payment.reverse', 'Issue a reversing payment (reverses_payment_id + reason). The original row is untouched.', '2026-09-02 20:11:28.397169+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000056', 'obligation.cancel', 'Cancel an obligation that should never have existed (created-in-error). Sets status=cancelled.', '2026-09-02 20:11:28.397169+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000057', 'obligation.forgive', 'Forgive an obligation (write-off; hardship, president''s relief). Sensitive — grant explicitly per person, do not bundle by default.', '2026-09-02 20:11:28.397169+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000058', 'exception.create', 'Create a charge exception (relative / fixed / senior tier). Individual overrides use exception.apply_individual.', '2026-09-02 20:11:28.397169+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000059', 'exception.apply_individual', 'Apply an individual-form exception targeting one named member. Sensitive — grant explicitly per person.', '2026-09-02 20:11:28.397169+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000060', 'expense.record', 'Record an expense (money out of a treasury). Below the body''s threshold hits the ledger; above enters pending_approval.', '2026-09-02 20:11:28.397169+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000061', 'expense.approve', 'Approve a pending_approval expense (Admin''s tier; per-body approval threshold gate).', '2026-09-02 20:11:28.397169+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000062', 'expense.reverse', 'Issue a reversing expense (reverses_expense_id + reason). The original row is untouched.', '2026-09-02 20:11:28.397169+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000063', 'expense_settings.manage', 'Set / clear the per-body optional expense approval threshold. Admin''s tier.', '2026-09-02 20:11:28.397169+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000064', 'treasury.read', 'Read a scope''s treasury balance and treasury statement.', '2026-09-02 20:11:28.397169+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000065', 'finance.report', 'Run the finance report set (collections, arrears, contribution progress, member statement, etc.) under one''s permission scope.', '2026-09-02 20:11:28.397169+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000066', 'finance.export', 'Export any finance report or table as CSV/Excel under one''s permission scope.', '2026-09-02 20:11:28.397169+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000067', 'receipt.generate', 'Generate a printable receipt (with verification token) for a payment.', '2026-09-02 20:11:28.397169+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000068', 'exchange_rate.set', 'Set / override the stored exchange rate for a currency pair (audited; live-rate provider deferred).', '2026-09-02 20:11:28.397169+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000069', 'ticket.purchase', 'Buy tickets against a ticketed contribution (public flow; the permission is checked at the admin-side buy-on-behalf path).', '2026-09-02 20:11:28.397169+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000070', 'group.manage', 'Create, close, archive, or hide finance groups (mainstream-only).', '2026-09-02 20:11:28.497928+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000071', 'reconciliation.record', 'Mark payments as reconciled / undo reconciliation.', '2026-09-02 20:11:28.497928+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000001', 'scope.read', 'Read org-hierarchy nodes and their capabilities.', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000002', 'scope.manage', 'Create/edit/disable scopes (Branches, Chapters, etc.).', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000003', 'member.read', 'View member directory + profiles.', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000004', 'member.manage', 'Create / edit / invite / transfer / exit members.', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000005', 'role.grant', 'Grant a role to a user at a scope.', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000006', 'role.revoke', 'Revoke an active role assignment.', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000007', 'finance.read', 'Read charges, obligations, payments, treasury balances.', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000008', 'finance.write', 'Create/edit charges, record payments, run reports.', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000009', 'cms.edit', 'Draft, edit, publish CMS content (articles, pages, gallery).', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000010', 'connect.announce', 'Publish announcements to Connect forums.', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000011', 'connect.poll', 'Create polls in Connect.', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000012', 'connect.job.approve', 'Approve and publish Recruiter-submitted job postings.', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.permissions VALUES ('22222222-0000-0000-0000-000000000013', 'audit.read', 'Read audit_entries — full event log per scope.', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;

INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000015', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000016', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000017', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000019', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000020', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000021', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000022', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000023', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000024', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000025', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000026', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000027', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000028', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000029', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000030', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000031', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000032', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000033', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000034', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000035', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000036', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000037', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000038', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000039', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000041', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000042', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000018', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000040', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000014', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000043', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000044', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000046', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000047', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000048', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000049', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000050', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000051', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000052', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000053', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000054', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000055', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000056', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000057', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000058', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000059', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000060', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000061', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000062', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000063', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000064', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000065', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000066', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000067', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000068', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000069', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000070', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000071', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000003', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000004', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000005', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000006', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000007', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000008', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000009', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000010', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000011', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000012', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000013', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000014', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000015', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000016', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000017', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000018', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000019', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000020', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000021', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000022', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000023', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000024', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000025', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000026', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000027', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000028', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000029', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000030', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000031', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000032', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000033', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000034', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000036', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000037', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000038', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000039', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000040', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000041', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000042', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000002', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000003', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000004', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000005', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000006', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000007', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000009', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000010', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000011', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000013', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000047', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000048', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000049', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000050', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000051', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000052', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000053', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000054', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000055', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000056', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000058', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000060', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000062', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000064', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000065', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000066', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000067', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000068', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000069', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000070', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000071', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000001', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000003', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000007', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000008', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000013', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000001', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000005', '22222222-0000-0000-0000-000000000009', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000001', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000006', '22222222-0000-0000-0000-000000000003', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000001', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000003', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000010', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;
INSERT INTO core.role_permissions VALUES ('11111111-0000-0000-0000-000000000007', '22222222-0000-0000-0000-000000000011', '2026-09-02 20:11:28.556705+00') ON CONFLICT DO NOTHING;

-------------------------------------------------------------------------------
-- 2.4 Governance position catalogue
-------------------------------------------------------------------------------
-- The named offices a member can hold at each scope type (President,
-- Secretary, Treasurer, …). Also migration-supplied reference data.

INSERT INTO core.position_catalog VALUES ('73866f2d-d224-4828-954e-e67d104579d1', 'mainstream', 'President', 'Chief executive of Mainstream.', 10, true, '2026-09-02 20:11:28.275941+00', '2026-09-02 20:11:28.275941+00') ON CONFLICT DO NOTHING;
INSERT INTO core.position_catalog VALUES ('57321be5-ae0b-40d0-994c-1717a33f2eea', 'mainstream', 'Vice President', 'Deputy to the President.', 20, true, '2026-09-02 20:11:28.275941+00', '2026-09-02 20:11:28.275941+00') ON CONFLICT DO NOTHING;
INSERT INTO core.position_catalog VALUES ('219d6422-13cd-4132-b217-336ac510f09a', 'mainstream', 'Secretary', 'Records + correspondence.', 30, true, '2026-09-02 20:11:28.275941+00', '2026-09-02 20:11:28.275941+00') ON CONFLICT DO NOTHING;
INSERT INTO core.position_catalog VALUES ('71467d01-26a1-44c7-9e6b-e885cc98b62b', 'mainstream', 'Secretary General', 'Chief administrative officer.', 40, true, '2026-09-02 20:11:28.275941+00', '2026-09-02 20:11:28.275941+00') ON CONFLICT DO NOTHING;
INSERT INTO core.position_catalog VALUES ('f9d4c81f-37b8-4b39-b40a-e68c86a4b96e', 'mainstream', 'Treasurer', 'Custodian of funds.', 50, true, '2026-09-02 20:11:28.275941+00', '2026-09-02 20:11:28.275941+00') ON CONFLICT DO NOTHING;
INSERT INTO core.position_catalog VALUES ('f8094f06-fb21-479b-8250-1862275b9c77', 'mainstream', 'Financial Secretary', 'Financial books + dues collection.', 60, true, '2026-09-02 20:11:28.275941+00', '2026-09-02 20:11:28.275941+00') ON CONFLICT DO NOTHING;
INSERT INTO core.position_catalog VALUES ('c43c8088-0f29-4ed5-a091-7b535d9226e8', 'mainstream', 'PRO', 'Public relations officer.', 70, true, '2026-09-02 20:11:28.275941+00', '2026-09-02 20:11:28.275941+00') ON CONFLICT DO NOTHING;
INSERT INTO core.position_catalog VALUES ('c63ba0dc-6ee9-4fc9-8a41-0eb07c58b9db', 'mainstream', 'Adviser', 'Ex-officio guidance role.', 80, true, '2026-09-02 20:11:28.275941+00', '2026-09-02 20:11:28.275941+00') ON CONFLICT DO NOTHING;
INSERT INTO core.position_catalog VALUES ('391dcad9-8a8b-4a3a-8480-8fcf261794b0', 'branch', 'President', 'Chief executive of the Branch.', 10, true, '2026-09-02 20:11:28.275941+00', '2026-09-02 20:11:28.275941+00') ON CONFLICT DO NOTHING;
INSERT INTO core.position_catalog VALUES ('c2122f4b-a4b1-4120-92a8-fda80764ab3f', 'branch', 'Vice President', 'Deputy to the Branch President.', 20, true, '2026-09-02 20:11:28.275941+00', '2026-09-02 20:11:28.275941+00') ON CONFLICT DO NOTHING;
INSERT INTO core.position_catalog VALUES ('ba063b33-61b8-4d32-ae50-8f92cd32ca8c', 'branch', 'Secretary', 'Branch secretary.', 30, true, '2026-09-02 20:11:28.275941+00', '2026-09-02 20:11:28.275941+00') ON CONFLICT DO NOTHING;
INSERT INTO core.position_catalog VALUES ('6bf80149-5adb-48c8-a248-80a9ad7fe0cc', 'branch', 'Secretary General', 'Branch secretary-general.', 40, true, '2026-09-02 20:11:28.275941+00', '2026-09-02 20:11:28.275941+00') ON CONFLICT DO NOTHING;
INSERT INTO core.position_catalog VALUES ('155dd10b-426b-45d7-ba47-55d28e6406cc', 'branch', 'Treasurer', 'Branch treasurer.', 50, true, '2026-09-02 20:11:28.275941+00', '2026-09-02 20:11:28.275941+00') ON CONFLICT DO NOTHING;
INSERT INTO core.position_catalog VALUES ('ed9f7cc4-94fb-47c9-b7db-341c564fb885', 'branch', 'Financial Secretary', 'Branch financial secretary.', 60, true, '2026-09-02 20:11:28.275941+00', '2026-09-02 20:11:28.275941+00') ON CONFLICT DO NOTHING;
INSERT INTO core.position_catalog VALUES ('6d1d506a-89f5-4824-b65a-d58a8e3d4da9', 'branch', 'PRO', 'Branch PRO.', 70, true, '2026-09-02 20:11:28.275941+00', '2026-09-02 20:11:28.275941+00') ON CONFLICT DO NOTHING;
INSERT INTO core.position_catalog VALUES ('09ce9569-0c6d-43ad-bd0a-5d335fb7b5e7', 'branch', 'Adviser', 'Branch adviser.', 80, true, '2026-09-02 20:11:28.275941+00', '2026-09-02 20:11:28.275941+00') ON CONFLICT DO NOTHING;
INSERT INTO core.position_catalog VALUES ('0477b3f8-acf0-4a27-a533-36d4ad4524bc', 'chapter', 'President', 'Chief executive of an autonomous chapter.', 10, true, '2026-09-02 20:11:28.275941+00', '2026-09-02 20:11:28.275941+00') ON CONFLICT DO NOTHING;
INSERT INTO core.position_catalog VALUES ('a5a7e72e-5525-4284-81d2-efff91c8b3cc', 'chapter', 'Vice President', 'Deputy of an autonomous chapter president.', 20, true, '2026-09-02 20:11:28.275941+00', '2026-09-02 20:11:28.275941+00') ON CONFLICT DO NOTHING;
INSERT INTO core.position_catalog VALUES ('5eb7482f-9eb9-4245-ab78-c93c3e3d81a2', 'chapter', 'Secretary', 'Chapter secretary.', 30, true, '2026-09-02 20:11:28.275941+00', '2026-09-02 20:11:28.275941+00') ON CONFLICT DO NOTHING;
INSERT INTO core.position_catalog VALUES ('a9e39a2e-0868-4e16-be97-6bb858550fd3', 'chapter', 'Secretary General', 'Chapter secretary-general.', 40, true, '2026-09-02 20:11:28.275941+00', '2026-09-02 20:11:28.275941+00') ON CONFLICT DO NOTHING;
INSERT INTO core.position_catalog VALUES ('6c3a264b-58b0-4bb6-8716-7d7d26e3e308', 'chapter', 'Treasurer', 'Chapter treasurer.', 50, true, '2026-09-02 20:11:28.275941+00', '2026-09-02 20:11:28.275941+00') ON CONFLICT DO NOTHING;
INSERT INTO core.position_catalog VALUES ('58eea718-d9e2-40b1-bbb9-e489c213e55c', 'chapter', 'Financial Secretary', 'Chapter financial secretary.', 60, true, '2026-09-02 20:11:28.275941+00', '2026-09-02 20:11:28.275941+00') ON CONFLICT DO NOTHING;
INSERT INTO core.position_catalog VALUES ('54fb7a85-d476-421f-b003-b1819fd5f270', 'chapter', 'PRO', 'Chapter PRO.', 70, true, '2026-09-02 20:11:28.275941+00', '2026-09-02 20:11:28.275941+00') ON CONFLICT DO NOTHING;
INSERT INTO core.position_catalog VALUES ('fdb93c60-5786-4bef-ac57-67f20cc7c913', 'chapter', 'Adviser', 'Chapter adviser.', 80, true, '2026-09-02 20:11:28.275941+00', '2026-09-02 20:11:28.275941+00') ON CONFLICT DO NOTHING;
INSERT INTO core.position_catalog VALUES ('b38d52a3-9678-4b86-9973-17540d7f561a', 'batch', 'President', 'Batch president.', 10, true, '2026-09-02 20:11:28.275941+00', '2026-09-02 20:11:28.275941+00') ON CONFLICT DO NOTHING;
INSERT INTO core.position_catalog VALUES ('d3307aaf-0dbd-4c66-8faa-fa1ca836239a', 'batch', 'Coordinator', 'Batch coordinator.', 20, true, '2026-09-02 20:11:28.275941+00', '2026-09-02 20:11:28.275941+00') ON CONFLICT DO NOTHING;
INSERT INTO core.position_catalog VALUES ('b519777f-e1b5-480a-8387-416abf8c407a', 'batch', 'Secretary', 'Batch secretary.', 30, true, '2026-09-02 20:11:28.275941+00', '2026-09-02 20:11:28.275941+00') ON CONFLICT DO NOTHING;
INSERT INTO core.position_catalog VALUES ('2912d63f-7cad-4f7c-b487-ce48a05b5169', 'batch', 'Financial Secretary', 'Batch financial secretary.', 40, true, '2026-09-02 20:11:28.275941+00', '2026-09-02 20:11:28.275941+00') ON CONFLICT DO NOTHING;
INSERT INTO core.position_catalog VALUES ('079c5378-8e92-4dc9-b206-26e5228e7ca9', 'batch', 'PRO', 'Batch PRO.', 50, true, '2026-09-02 20:11:28.275941+00', '2026-09-02 20:11:28.275941+00') ON CONFLICT DO NOTHING;
INSERT INTO core.position_catalog VALUES ('0a1e8c48-16c7-44db-a31e-1104c1c32ace', 'batch', 'Adviser', 'Batch adviser.', 60, true, '2026-09-02 20:11:28.275941+00', '2026-09-02 20:11:28.275941+00') ON CONFLICT DO NOTHING;

-------------------------------------------------------------------------------
-- 2.5 Finance categories
-------------------------------------------------------------------------------
-- Charge and expense classifications used by the reporting surfaces.

INSERT INTO finance.charge_categories VALUES ('2555f19d-f68c-4db0-85a1-59249003f00c', 'dues', 'Dues', NULL, 10, true, '2026-09-02 20:11:28.368278+00') ON CONFLICT DO NOTHING;
INSERT INTO finance.charge_categories VALUES ('aee66dd3-e42a-4648-9699-397980287692', 'levy', 'Levy', NULL, 20, true, '2026-09-02 20:11:28.368278+00') ON CONFLICT DO NOTHING;
INSERT INTO finance.charge_categories VALUES ('5d33bf4b-c587-4d62-9fae-6f8a01680f73', 'registration', 'Registration', NULL, 30, true, '2026-09-02 20:11:28.368278+00') ON CONFLICT DO NOTHING;
INSERT INTO finance.charge_categories VALUES ('417c5b4e-4e9c-46c9-9cc4-c99e505b114a', 'agm', 'AGM', NULL, 40, true, '2026-09-02 20:11:28.368278+00') ON CONFLICT DO NOTHING;
INSERT INTO finance.charge_categories VALUES ('f2c512cc-3818-4c33-9c42-84676b6fe864', 'project_fund', 'Project fund', NULL, 50, true, '2026-09-02 20:11:28.368278+00') ON CONFLICT DO NOTHING;
INSERT INTO finance.charge_categories VALUES ('5ab4985e-95b6-4bbd-a8c5-7838ae644b98', 'emergency_fund', 'Emergency fund', NULL, 60, true, '2026-09-02 20:11:28.368278+00') ON CONFLICT DO NOTHING;
INSERT INTO finance.charge_categories VALUES ('838be3f3-0b29-42b2-b400-e2295a808d6d', 'other', 'Other', NULL, 99, true, '2026-09-02 20:11:28.368278+00') ON CONFLICT DO NOTHING;

INSERT INTO finance.expense_categories VALUES ('771bd559-d27d-484a-b695-c559d8a9d8c2', 'venue', 'Venue', NULL, 10, true, '2026-09-02 20:11:28.368278+00') ON CONFLICT DO NOTHING;
INSERT INTO finance.expense_categories VALUES ('de8a8105-fa5c-46df-8625-8dcb1a1c2165', 'transport', 'Transport', NULL, 20, true, '2026-09-02 20:11:28.368278+00') ON CONFLICT DO NOTHING;
INSERT INTO finance.expense_categories VALUES ('3eb3e171-0899-4cdc-be7d-56ee84b79618', 'printing', 'Printing', NULL, 30, true, '2026-09-02 20:11:28.368278+00') ON CONFLICT DO NOTHING;
INSERT INTO finance.expense_categories VALUES ('43078f57-6291-4778-961e-7e2dca0ed29b', 'fuel', 'Fuel', NULL, 40, true, '2026-09-02 20:11:28.368278+00') ON CONFLICT DO NOTHING;
INSERT INTO finance.expense_categories VALUES ('c729bb6b-ae9d-4a73-8ff1-611425d6f6dd', 'refreshments', 'Refreshments', NULL, 50, true, '2026-09-02 20:11:28.368278+00') ON CONFLICT DO NOTHING;
INSERT INTO finance.expense_categories VALUES ('275b1980-b6ab-4518-a756-06d32a482f6e', 'honorarium', 'Honorarium', NULL, 60, true, '2026-09-02 20:11:28.368278+00') ON CONFLICT DO NOTHING;
INSERT INTO finance.expense_categories VALUES ('3262fcac-837c-4524-aa57-a1c928e9bfc3', 'other', 'Other', NULL, 99, true, '2026-09-02 20:11:28.368278+00') ON CONFLICT DO NOTHING;


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

-- Funding tiers — donation-shape charges. The public site derives the
-- tier from the donor's amount (see `tierForAmount()` in
-- apps/web/src/components/agm/data.ts): Bronze catches 1 – 50 000,
-- Silver 50 001 – 250 000, Gold 250 001 – 1 000 000, Platinum
-- 1 000 001 and above (5 000 000 is the suggested Platinum headline
-- but the tier is unbounded).
--
-- `min_amount` on each charge mirrors the tier's LOWER BOUND, not its
-- headline amount — anything below that floor is a different tier's
-- gift and lands on that tier's campaign instead.
INSERT INTO finance.charges
  (id, scope_id, shape, name, description, currency, min_amount,
   target_filter, lifecycle, open_date, close_date, status, group_id,
   created_by, created_at, updated_at)
VALUES
  ('88888888-2026-1111-0000-000000000010',
   '00000000-0000-0000-0000-000000000001',
   'donation', 'Bronze Funding',
   'AGM 2026 funding tier — Bronze. Range 1 – 50 000 XAF.',
   'XAF', 1, '{}'::jsonb,
   'open',
   TIMESTAMPTZ '2026-01-01 00:00:00+00',
   TIMESTAMPTZ '2026-11-30 23:59:59+00',
   'active', '88888888-2026-0000-0000-000000000001',
   '55555555-0000-0000-0000-000000000002',
   NOW(), NOW()),
  ('88888888-2026-1111-0000-000000000011',
   '00000000-0000-0000-0000-000000000001',
   'donation', 'Silver Funding',
   'AGM 2026 funding tier — Silver. Range 50 001 – 250 000 XAF.',
   'XAF', 50001, '{}'::jsonb,
   'open',
   TIMESTAMPTZ '2026-01-01 00:00:00+00',
   TIMESTAMPTZ '2026-11-30 23:59:59+00',
   'active', '88888888-2026-0000-0000-000000000001',
   '55555555-0000-0000-0000-000000000002',
   NOW(), NOW()),
  ('88888888-2026-1111-0000-000000000012',
   '00000000-0000-0000-0000-000000000001',
   'donation', 'Gold Funding',
   'AGM 2026 funding tier — Gold. Range 250 001 – 1 000 000 XAF.',
   'XAF', 250001, '{}'::jsonb,
   'open',
   TIMESTAMPTZ '2026-01-01 00:00:00+00',
   TIMESTAMPTZ '2026-11-30 23:59:59+00',
   'active', '88888888-2026-0000-0000-000000000001',
   '55555555-0000-0000-0000-000000000002',
   NOW(), NOW()),
  ('88888888-2026-1111-0000-000000000013',
   '00000000-0000-0000-0000-000000000001',
   'donation', 'Platinum Funding',
   'AGM 2026 funding tier — Platinum. Range 1 000 001 XAF and above (suggested headline 5 000 000 XAF).',
   'XAF', 1000001, '{}'::jsonb,
   'open',
   TIMESTAMPTZ '2026-01-01 00:00:00+00',
   TIMESTAMPTZ '2026-11-30 23:59:59+00',
   'active', '88888888-2026-0000-0000-000000000001',
   '55555555-0000-0000-0000-000000000002',
   NOW(), NOW())
ON CONFLICT (id) DO NOTHING;



-- =============================================================================
-- Section 6. Founding branches
-- =============================================================================
--
-- The five branches the organisation starts with. Every other branch, and
-- every chapter, is created through the Admin portal.
--
-- A branch is two rows: the scope node (org tree, permissions, finance
-- anchoring) and the branch detail row (geography, registration fee, contact).
-- Both use the same stable UUID so the pair is easy to follow by eye.
--
-- Registration fee: 5 000 XAF, matching the founding Buea branch. A branch
-- admin can change their own via Settings; this is only the starting value.
--
-- Buea and Douala deliberately reuse the UUIDs they held before the
-- 2026-09-02 squash (…010 and …011). Their slugs already existed, so a new
-- id would have collided on the unique slug while leaving every fixture and
-- test that references the old id dangling. Yaoundé, Tiko and Bamenda are new.

INSERT INTO core.scopes
  (id, name, slug, scope_type, parent_scope_id, currency_code, country, region_state, city, status, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-00000000b001', 'Shesa Yaoundé',  'shesa-yaounde',  'branch',
   '00000000-0000-0000-0000-000000000001', 'XAF', 'CM', 'Centre',      'Yaoundé',  'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000011', 'Shesa Douala',   'shesa-douala',   'branch',
   '00000000-0000-0000-0000-000000000001', 'XAF', 'CM', 'Littoral',    'Douala',   'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000010', 'Shesa Buea',     'shesa-buea',     'branch',
   '00000000-0000-0000-0000-000000000001', 'XAF', 'CM', 'South-West',  'Buea',     'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-00000000b004', 'Shesa Tiko',     'shesa-tiko',     'branch',
   '00000000-0000-0000-0000-000000000001', 'XAF', 'CM', 'South-West',  'Tiko',     'active', NOW(), NOW()),
  ('00000000-0000-0000-0000-00000000b005', 'Shesa Bamenda',  'shesa-bamenda',  'branch',
   '00000000-0000-0000-0000-000000000001', 'XAF', 'CM', 'North-West',  'Bamenda',  'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO core.branches
  (scope_id, country_code, region, city, registration_fee_required, registration_fee_amount,
   registration_fee_currency, contact_email, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-00000000b001', 'CM', 'Centre',     'Yaoundé', TRUE, 5000.00, 'XAF', 'yaounde@shesaconnect.com', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000011', 'CM', 'Littoral',   'Douala',  TRUE, 5000.00, 'XAF', 'douala@shesaconnect.com',  NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000010', 'CM', 'South-West', 'Buea',    TRUE, 5000.00, 'XAF', 'buea@shesaconnect.com',    NOW(), NOW()),
  ('00000000-0000-0000-0000-00000000b004', 'CM', 'South-West', 'Tiko',    TRUE, 5000.00, 'XAF', 'tiko@shesaconnect.com',    NOW(), NOW()),
  ('00000000-0000-0000-0000-00000000b005', 'CM', 'North-West', 'Bamenda', TRUE, 5000.00, 'XAF', 'bamenda@shesaconnect.com', NOW(), NOW())
ON CONFLICT (scope_id) DO NOTHING;

-- Capabilities. A branch with none of these flags is inert — it cannot hold
-- members, run a treasury or levy dues, and the UI hides its sections. All
-- five open with the full set; a Mainstream admin narrows them per branch
-- from Settings if a body should not, say, collect binding dues.
INSERT INTO core.scope_capabilities (
  scope_id, can_manage_members, can_have_treasury, can_create_binding_dues,
  can_have_website_page, can_have_forum, can_label_active_passive
) VALUES
  ('00000000-0000-0000-0000-00000000b001', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  ('00000000-0000-0000-0000-000000000011', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  ('00000000-0000-0000-0000-000000000010', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  ('00000000-0000-0000-0000-00000000b004', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
  ('00000000-0000-0000-0000-00000000b005', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE)
ON CONFLICT (scope_id) DO NOTHING;


-- =============================================================================
-- Section 7. Public-website content
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
-- Generated from the live database, so it reflects what the seven migrations
-- actually produced rather than a re-reading of them. Editors change this
-- content through the Editor persona; re-running the seed will not overwrite
-- their edits, because every insert is ON CONFLICT DO NOTHING.

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

-- =============================================================================
-- End of bootstrap seed
-- =============================================================================
--   • 1 mainstream scope + capabilities
--   • 6 system roles + 42 permissions + full role → permission bundles
--   • 74 batches (1953 → 2026) + 4 houses
--   • 3 human users with auth rows, identities, profiles and global grants
--   • 1 finance group (AGM 2026) + 7 charges
--   • 5 founding branches
--   • Public-website content across 22 cms tables
--
-- Deliberately empty: chapters, networks, members, memberships, payments,
-- expenses, obligations, transfers, announcements, events.
-- Run supabase/seed-demo.sql on top for a populated local environment.
