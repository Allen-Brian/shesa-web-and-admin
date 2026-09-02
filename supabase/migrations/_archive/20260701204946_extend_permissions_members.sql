-- Migration: extend_permissions_members
--
-- Adds the member-management permissions E1.2's Edge Functions gate on.
-- Same pattern as E1.1's extend_permissions_org_scope migration — the
-- finer-grained keys land as they're actually needed rather than as a
-- big up-front dump.
--
-- Keys added:
--   * member.create — create a new member record (via UI or import)
--   * member.update — edit fields the owning member can't edit themselves
--
-- The existing `member.manage` remains as a super-key held by admins;
-- it implies the finer keys in the role bundles below.

INSERT INTO core.permissions (id, key, description) VALUES
  ('22222222-0000-0000-0000-000000000017', 'member.create',
   'Create a new member (via UI, import, or admin form).'),
  ('22222222-0000-0000-0000-000000000018', 'member.update',
   'Edit protected member fields (full_name, batch, house, sector, entry_year). Member-editable fields (display_name, current_*) don''t require this.')
ON CONFLICT (key) DO NOTHING;

-- mainstream_admin owns every permission via CROSS JOIN in seed.sql;
-- reaffirm here for staging/prod which don't re-run seed.
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key IN ('member.create', 'member.update')
WHERE r.key = 'mainstream_admin'
ON CONFLICT DO NOTHING;

-- branch_admin + batch_admin both manage members within their scope.
INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key IN ('member.create', 'member.update')
WHERE r.key IN ('branch_admin', 'batch_admin')
ON CONFLICT DO NOTHING;
