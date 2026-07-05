-- Migration: finance_permissions
--
-- Phase 3 M1 third migration. Adds the grain-level permission keys the
-- finance engine's Edge Functions will check against. Spec Part XV:
--
--   Finance role  — creates and runs money (charges, contributions,
--                   payments, expenses, exceptions, reports).
--   Admin role    — SEES all money, cannot CREATE financial entries.
--                   Approves Admin-proposed contributions; approves
--                   over-threshold expenses (when a threshold is set).
--   Sensitive     — waivers/forgiveness. NOT bundled into any role
--                   by default; granted explicitly per person to
--                   preserve the "sensitive tier" property.
--
-- Naming convention (grep-verified against the existing catalog):
--   verb+object   — 'payment.record', 'expense.approve', 'obligation.forgive'
--   state nouns   — enum values ('paid', 'paid_on_behalf', 'forgiven')
--   never overlap — 'obligation.forgive' is the ACTION; 'forgiven' is
--                   the resulting state stored on the row.
--
-- Highest previously-used permission ID: ...000000000046 (from
-- extend_permissions_memberships_v2, 2026-07-04). We start at ...047
-- to stay monotonically ordered.

-------------------------------------------------------------------------------
-- 1. Permission keys
-------------------------------------------------------------------------------

INSERT INTO core.permissions (id, key, description) VALUES
  -- Charges + contributions + donations
  ('22222222-0000-0000-0000-000000000047', 'charge.create',
   'Create a charge (dues / levy) or contribution (goal / open / ticketed / fixed) at a finance-bearing scope.'),
  ('22222222-0000-0000-0000-000000000048', 'charge.update',
   'Edit a draft or paused charge (name, description, target filter, dates).'),
  ('22222222-0000-0000-0000-000000000049', 'charge.archive',
   'Archive a charge (soft delete; history stays).'),
  ('22222222-0000-0000-0000-000000000050', 'contribution.approve',
   'Approve an Admin-proposed contribution so it can go live (Finance-only gate).'),
  ('22222222-0000-0000-0000-000000000051', 'contribution.extend',
   'Extend a contribution''s close date after it has passed (audited).'),
  ('22222222-0000-0000-0000-000000000052', 'donation.record',
   'Record a walk-in donation (freewill gift, no obligation).'),

  -- Payments
  ('22222222-0000-0000-0000-000000000053', 'payment.record',
   'Record a payment (auto via provider window, or manual/cash entered by a human).'),
  ('22222222-0000-0000-0000-000000000054', 'payment.record_on_behalf',
   'Record a payment on behalf of a member (payer is not the member; Finance or Admin uses this).'),
  ('22222222-0000-0000-0000-000000000055', 'payment.reverse',
   'Issue a reversing payment (reverses_payment_id + reason). The original row is untouched.'),

  -- Obligations (hidden layer but the write keys are real)
  ('22222222-0000-0000-0000-000000000056', 'obligation.cancel',
   'Cancel an obligation that should never have existed (created-in-error). Sets status=cancelled.'),
  ('22222222-0000-0000-0000-000000000057', 'obligation.forgive',
   'Forgive an obligation (write-off; hardship, president''s relief). Sensitive — grant explicitly per person, do not bundle by default.'),

  -- Exceptions
  ('22222222-0000-0000-0000-000000000058', 'exception.create',
   'Create a charge exception (relative / fixed / senior tier). Individual overrides use exception.apply_individual.'),
  ('22222222-0000-0000-0000-000000000059', 'exception.apply_individual',
   'Apply an individual-form exception targeting one named member. Sensitive — grant explicitly per person.'),

  -- Expenses
  ('22222222-0000-0000-0000-000000000060', 'expense.record',
   'Record an expense (money out of a treasury). Below the body''s threshold hits the ledger; above enters pending_approval.'),
  ('22222222-0000-0000-0000-000000000061', 'expense.approve',
   'Approve a pending_approval expense (Admin''s tier; per-body approval threshold gate).'),
  ('22222222-0000-0000-0000-000000000062', 'expense.reverse',
   'Issue a reversing expense (reverses_expense_id + reason). The original row is untouched.'),
  ('22222222-0000-0000-0000-000000000063', 'expense_settings.manage',
   'Set / clear the per-body optional expense approval threshold. Admin''s tier.'),

  -- Treasury + reports + exports
  ('22222222-0000-0000-0000-000000000064', 'treasury.read',
   'Read a scope''s treasury balance and treasury statement.'),
  ('22222222-0000-0000-0000-000000000065', 'finance.report',
   'Run the finance report set (collections, arrears, contribution progress, member statement, etc.) under one''s permission scope.'),
  ('22222222-0000-0000-0000-000000000066', 'finance.export',
   'Export any finance report or table as CSV/Excel under one''s permission scope.'),

  -- Receipts + exchange rate + tickets
  ('22222222-0000-0000-0000-000000000067', 'receipt.generate',
   'Generate a printable receipt (with verification token) for a payment.'),
  ('22222222-0000-0000-0000-000000000068', 'exchange_rate.set',
   'Set / override the stored exchange rate for a currency pair (audited; live-rate provider deferred).'),
  ('22222222-0000-0000-0000-000000000069', 'ticket.purchase',
   'Buy tickets against a ticketed contribution (public flow; the permission is checked at the admin-side buy-on-behalf path).')
ON CONFLICT (key) DO NOTHING;

-------------------------------------------------------------------------------
-- 2. Role bundles
-------------------------------------------------------------------------------
-- mainstream_admin — everything (the seed CROSS JOIN already grants
-- every permission; re-affirm here so staging/prod deploys land the
-- explicit rows too).

INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key IN (
  'charge.create', 'charge.update', 'charge.archive',
  'contribution.approve', 'contribution.extend', 'donation.record',
  'payment.record', 'payment.record_on_behalf', 'payment.reverse',
  'obligation.cancel', 'obligation.forgive',
  'exception.create', 'exception.apply_individual',
  'expense.record', 'expense.approve', 'expense.reverse', 'expense_settings.manage',
  'treasury.read', 'finance.report', 'finance.export',
  'receipt.generate', 'exchange_rate.set', 'ticket.purchase'
)
WHERE r.key = 'mainstream_admin'
ON CONFLICT DO NOTHING;

-- branch_admin — the Admin tier per spec Part XV. Sees money, does not
-- create it. Approves over-threshold expenses; sets the per-body
-- threshold; records pay-on-behalf entries. Does NOT get sensitive
-- keys (obligation.forgive, exception.apply_individual) — those are
-- granted explicitly per person.

INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key IN (
  'treasury.read',
  'finance.report',
  'finance.export',
  'expense.approve',
  'expense_settings.manage',
  'payment.record_on_behalf',
  'receipt.generate'
)
WHERE r.key = 'branch_admin'
ON CONFLICT DO NOTHING;

-- finance — money movement. Every write except the sensitive tier and
-- the admin-only expense.approve / expense_settings.manage keys.

INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key IN (
  'charge.create', 'charge.update', 'charge.archive',
  'contribution.approve', 'contribution.extend', 'donation.record',
  'payment.record', 'payment.record_on_behalf', 'payment.reverse',
  'obligation.cancel',
  'exception.create',
  'expense.record', 'expense.reverse',
  'treasury.read', 'finance.report', 'finance.export',
  'receipt.generate', 'exchange_rate.set', 'ticket.purchase'
)
WHERE r.key = 'finance'
ON CONFLICT DO NOTHING;

-- SENSITIVE tier is NOT bundled into any role. `obligation.forgive` and
-- `exception.apply_individual` land on individual users via
-- core.role_assignments carrying the permission override (or by
-- attaching a purpose-built role later — decision deferred to when the
-- first sensitive grant needs to be issued). Bundling them into
-- branch_admin now would defeat the tier.

COMMENT ON COLUMN core.permissions.key IS
  'Stable permission key. Naming convention: verb+object (e.g. payment.record, obligation.forgive). State nouns like ''paid'' or ''forgiven'' are enum values, never permission-key strings.';
