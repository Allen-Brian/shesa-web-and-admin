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
--      15 November 2026, so this stays in the production bootstrap.
--   6. The five founding branches: Yaoundé, Douala, Buea, Tiko, Bamenda.
--
-- ── Public-website content is NOT here ──────────────────────────────────────
-- Leadership, articles, projects, gallery, organs and songs used to arrive as
-- seven `*_seed.sql` MIGRATIONS, so they shipped to every database whether
-- wanted or not. Their own headers describe them as the "placeholder arrays"
-- and "static data" the web app carried before it read from `cms` — and
-- production bears that out: the content was seeded by those migrations and
-- then deleted by hand, leaving a single editor-made sector behind.
--
-- It therefore lives in seed-demo.sql. Production starts with an empty CMS and
-- the Editor persona fills it, which is the state the team already chose.
--
--   8. The four launch networks: Legal, Santé, Tech, Education.
--
-- ── NOT seeded, by decision ─────────────────────────────────────────────────
-- Chapters are created through the Admin portal.
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
   TIMESTAMPTZ '2026-11-15 23:59:59+00',
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
   TIMESTAMPTZ '2026-11-15 23:59:59+00',
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
   'AGM 2026 attire order — 55 000 XAF. Measurements captured at purchase.',
   55000, 'XAF', '{}'::jsonb, 'member',
   'open',
   TIMESTAMPTZ '2026-01-01 00:00:00+00',
   TIMESTAMPTZ '2026-11-15 23:59:59+00',
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
   TIMESTAMPTZ '2026-11-15 23:59:59+00',
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
   TIMESTAMPTZ '2026-11-15 23:59:59+00',
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
   TIMESTAMPTZ '2026-11-15 23:59:59+00',
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
   TIMESTAMPTZ '2026-11-15 23:59:59+00',
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

-- ── Networks ────────────────────────────────────────────────────────────────
-- The four professional networks that go live with production. A network is a
-- mainstream-parented scope, like a batch or a house — a membership dimension,
-- not a place.
--
-- These are seeded rather than left to the portal because
-- `core.members.network_scope_id` is REQUIRED: a trigger rejects any member
-- row without one. A database with no networks cannot hold a single member,
-- by any route — not the admin form, not the spreadsheet import. Seeding them
-- is what makes the system usable from first login.
--
-- Shesa Gov exists too but is not part of the initial four; it is in
-- seed-demo.sql, and an admin can create it in the portal when wanted.

INSERT INTO core.scopes (
  id, name, slug, scope_type, parent_scope_id, currency_code
) VALUES
  ('44444444-0000-0000-0000-000000000001', 'Shesa Legal',     'shesa-legal',
   'network', '00000000-0000-0000-0000-000000000001', 'XAF'),
  ('44444444-0000-0000-0000-000000000002', 'Shesa Santé',     'shesa-sante',
   'network', '00000000-0000-0000-0000-000000000001', 'XAF'),
  ('44444444-0000-0000-0000-000000000003', 'Shesa Tech',      'shesa-tech',
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
  ('44444444-0000-0000-0000-000000000005', 'Education',
   'Teachers, lecturers, researchers and academic staff.',
   'GraduationCap', '#D97706', 5)
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
-- End of bootstrap seed
-- =============================================================================
--   • 1 mainstream scope + capabilities
--   • 6 system roles + 42 permissions + full role → permission bundles
--   • 74 batches (1953 → 2026) + 4 houses
--   • 3 human users with auth rows, identities, profiles and global grants
--   • 1 finance group (AGM 2026) + 7 charges
--   • 5 founding branches + 4 networks
--
-- Deliberately empty: chapters, all CMS content, members, memberships,
-- payments, expenses, obligations, transfers, announcements, events.
-- Run supabase/seed-demo.sql on top for a populated local environment.
