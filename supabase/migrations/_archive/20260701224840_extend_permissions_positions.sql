-- Migration: extend_permissions_positions
--
-- Adds the two position-lifecycle permission keys E1.6 gates on. Same
-- catalog pattern as the earlier extend_permissions_* migrations.

INSERT INTO core.permissions (id, key, description) VALUES
  ('22222222-0000-0000-0000-000000000027', 'position.assign',
   'Assign a position (badge) to a member at a scope. Distinct from role.grant — positions are titles, not authority.'),
  ('22222222-0000-0000-0000-000000000028', 'position.remove',
   'Remove an active position assignment.')
ON CONFLICT (key) DO NOTHING;

-- mainstream_admin holds everything via CROSS JOIN in seed.sql;
-- reaffirm for staging/prod.
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key IN ('position.assign', 'position.remove')
WHERE r.key = 'mainstream_admin'
ON CONFLICT DO NOTHING;

-- branch_admin governs the branch's Exco.
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key IN ('position.assign', 'position.remove')
WHERE r.key = 'branch_admin'
ON CONFLICT DO NOTHING;

-- batch_admin owns batch positions (President, Coordinator, etc.).
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key IN ('position.assign', 'position.remove')
WHERE r.key = 'batch_admin'
ON CONFLICT DO NOTHING;
