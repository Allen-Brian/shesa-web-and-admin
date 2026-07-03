-- Migration: extend_permissions_memberships_v2
--
-- New permission keys for the 2026-07-03 Membership section rewrite:
--   membership.engagement.set  — set/promote/demote engagement tier
--   membership.remove          — remove a member from a scope
--   registration.waive         — waive a member's registration fee
--   registration.pay_on_behalf — record someone paying the fee for a member
--
-- Naming convention pinned (grep-verified):
--   VERB + OBJECT   — e.g. `registration.mark_paid`, `registration.waive`.
--   The STATE `paid_on_behalf` maps to ACTION `pay_on_behalf`.
--   Never `registration.paid` (state) as a permission-key string.
--
-- Role bundles:
--   mainstream_admin — everything (already via seed's CROSS JOIN, reaffirmed).
--   branch_admin     — all four keys.
--   batch_admin      — engagement.set + membership.remove only. Batch admins
--                      are the natural long-horizon judges of who's committed
--                      in their batch cohort AND can remove a member from
--                      their batch when needed. Batches have no registration
--                      fee, so waive / pay_on_behalf don't apply.
--   finance          — NONE of these. Registration write ops are admin
--                      actions, not money-mover actions. finance role owns
--                      contribution/dues movement (Phase 3), not this.
--
-- The four keys use IDs 22222222-…-000000000043 through …-000000000046.
-- Highest previously-used permission ID in the catalog is …000000000042
-- (grep-verified across migrations + seed); we start at 43 to stay
-- monotonically ordered. Seed also carries `registration.waive` at an
-- earlier ID (…000000000029) as a placeholder — that INSERT silently
-- skips via `ON CONFLICT (key) DO NOTHING` since our migration lands
-- the row first.

INSERT INTO core.permissions (id, key, description) VALUES
  ('22222222-0000-0000-0000-000000000043', 'membership.engagement.set',
   'Set / promote / demote the manual engagement tier on a membership (dormant / normal / engaged / committed).'),
  ('22222222-0000-0000-0000-000000000044', 'membership.remove',
   'Remove a member from a scope (ends the membership row). Its own key — not shared with membership.approve.'),
  ('22222222-0000-0000-0000-000000000045', 'registration.waive',
   'Waive a member''s registration fee (records waived_at / waived_by / waived_reason).'),
  ('22222222-0000-0000-0000-000000000046', 'registration.pay_on_behalf',
   'Record that someone paid a member''s registration fee on their behalf (records paid_on_behalf_at / paid_on_behalf_by / paid_on_behalf_note).')
ON CONFLICT (key) DO NOTHING;

-- mainstream_admin — reaffirm all four (already granted by seed's CROSS JOIN,
-- but staging/prod deploys need the explicit grant here).
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key IN (
  'membership.engagement.set',
  'membership.remove',
  'registration.waive',
  'registration.pay_on_behalf'
)
WHERE r.key = 'mainstream_admin'
ON CONFLICT DO NOTHING;

-- branch_admin — all four (branch admins run the full membership + reg lifecycle).
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key IN (
  'membership.engagement.set',
  'membership.remove',
  'registration.waive',
  'registration.pay_on_behalf'
)
WHERE r.key = 'branch_admin'
ON CONFLICT DO NOTHING;

-- batch_admin — engagement.set + membership.remove only. No registration.
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key IN (
  'membership.engagement.set',
  'membership.remove'
)
WHERE r.key = 'batch_admin'
ON CONFLICT DO NOTHING;
