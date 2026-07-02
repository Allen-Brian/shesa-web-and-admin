-- Migration: extend_permissions_import
--
-- Adds `member.import` to the permissions catalog for Phase 1 E1.3.
-- Same pattern as extend_permissions_org_scope + extend_permissions_members.

INSERT INTO core.permissions (id, key, description) VALUES
  ('22222222-0000-0000-0000-000000000019', 'member.import',
   'Upload and confirm Excel member-import batches. Distinct from member.create because import operates on many members at once with duplicate-detection review.')
ON CONFLICT (key) DO NOTHING;

-- mainstream_admin holds everything via CROSS JOIN in seed.sql, but
-- staging/prod won't re-run seed so we reaffirm.
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key = 'member.import'
WHERE r.key = 'mainstream_admin'
ON CONFLICT DO NOTHING;

-- branch_admin + batch_admin can import members within their scope.
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key = 'member.import'
WHERE r.key IN ('branch_admin', 'batch_admin')
ON CONFLICT DO NOTHING;
