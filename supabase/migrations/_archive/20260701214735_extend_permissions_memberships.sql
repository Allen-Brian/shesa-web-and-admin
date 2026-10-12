-- Migration: extend_permissions_memberships
--
-- Adds the membership-lifecycle permission keys E1.4's Edge Functions
-- gate on. Same pattern as prior extend_permissions_* migrations —
-- catalog rows land here so staging/prod pick them up on next deploy,
-- and seed.sql mirrors them for local db:reset.
--
-- Keys added:
--   membership.approve        approve/reject join requests
--   membership.reject         (paired with approve)
--   membership.transfer       initiate/approve/reject transfers
--   membership.mark_passive   flip active ↔ passive at a body
--   registration.mark_paid    flip registration_status to paid

INSERT INTO core.permissions (id, key, description) VALUES
  ('22222222-0000-0000-0000-000000000020', 'membership.approve',
   'Approve a join request into a geographic body.'),
  ('22222222-0000-0000-0000-000000000021', 'membership.reject',
   'Reject a join request into a geographic body.'),
  ('22222222-0000-0000-0000-000000000022', 'membership.transfer',
   'Initiate, approve, or reject a member transfer between geographic bodies.'),
  ('22222222-0000-0000-0000-000000000023', 'membership.mark_passive',
   'Flip a membership between active and passive (§2.16 — geographic-body admin only).'),
  ('22222222-0000-0000-0000-000000000024', 'registration.mark_paid',
   'Mark a member''s registration fee as paid (§2.13; non-gating searchable flag).')
ON CONFLICT (key) DO NOTHING;

-- mainstream_admin holds all of these via seed's CROSS JOIN; reaffirm
-- for staging/prod.
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key IN (
  'membership.approve', 'membership.reject', 'membership.transfer',
  'membership.mark_passive', 'registration.mark_paid'
)
WHERE r.key = 'mainstream_admin'
ON CONFLICT DO NOTHING;

-- branch_admin owns geographic body governance — full membership lifecycle.
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key IN (
  'membership.approve', 'membership.reject', 'membership.transfer',
  'membership.mark_passive', 'registration.mark_paid'
)
WHERE r.key = 'branch_admin'
ON CONFLICT DO NOTHING;

-- batch_admin doesn't own geographic bodies but can mark registration paid
-- for their batch's members (a common tidying task).
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key = 'registration.mark_paid'
WHERE r.key = 'batch_admin'
ON CONFLICT DO NOTHING;
