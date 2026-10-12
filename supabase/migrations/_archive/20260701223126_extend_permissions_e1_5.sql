-- Migration: extend_permissions_e1_5
--
-- Finishes the §4.1 catalog by adding the two keys not yet needed by
-- earlier epics:
--
--   scope.manage_capabilities  — flipping the capability flags on a
--                                scope (can_have_treasury, etc.).
--                                Distinct from scope.update because
--                                capability changes affect downstream
--                                RLS behavior.
--   member.export              — CSV/Excel export of the members list.
--                                Distinct from member.read because
--                                export leaves the RLS boundary in
--                                a durable artifact.
--
-- The remaining §4.1 keys (`position.assign`, `position.remove`) land
-- in E1.6 with the position catalog itself.

INSERT INTO core.permissions (id, key, description) VALUES
  ('22222222-0000-0000-0000-000000000025', 'scope.manage_capabilities',
   'Flip capability flags on a scope (treasury, dues, forum, active/passive labelling).'),
  ('22222222-0000-0000-0000-000000000026', 'member.export',
   'Export the member directory as CSV or Excel. Distinct from member.read because exports carry data outside the RLS boundary.')
ON CONFLICT (key) DO NOTHING;

-- mainstream_admin holds every permission via seed's CROSS JOIN; reaffirm.
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key IN ('scope.manage_capabilities', 'member.export')
WHERE r.key = 'mainstream_admin'
ON CONFLICT DO NOTHING;

-- branch_admin: capability changes at their branch + export of their members.
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key IN ('scope.manage_capabilities', 'member.export')
WHERE r.key = 'branch_admin'
ON CONFLICT DO NOTHING;

-- batch_admin: no capability management (they don't own the scope's
-- capabilities), but export is fine.
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key = 'member.export'
WHERE r.key = 'batch_admin'
ON CONFLICT DO NOTHING;
