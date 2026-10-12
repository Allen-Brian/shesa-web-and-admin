-- Migration: extend_permissions_org_scope
--
-- Adds the org-management permission keys E1.1's Edge Functions gate on.
-- The full Phase 1 permission catalog expansion lands in E1.5 (member.*,
-- membership.*, position.*, registration.*, etc.) — this migration is
-- the subset E1.1 needs *right now* so create-scope / update-scope /
-- set-chapter-autonomy have real permissions to gate against, rather
-- than falling back to the coarser existing `scope.manage`.
--
-- Landing catalog additions as a MIGRATION (not just a seed edit) so
-- staging/prod pick them up on the next deploy — seed.sql only runs on
-- local `db:reset`.
--
-- Idempotent via ON CONFLICT DO NOTHING on (key) for permissions and
-- (role_id, permission_id) for mappings.

-------------------------------------------------------------------------------
-- 1. New permission keys
-------------------------------------------------------------------------------

INSERT INTO core.permissions (id, key, description) VALUES
  ('22222222-0000-0000-0000-000000000014', 'scope.create',
   'Create a new scope (Branch, Chapter, Sector, Batch). Includes setting parent + initial capabilities.'),
  ('22222222-0000-0000-0000-000000000015', 'scope.update',
   'Edit an existing scope: name, geography, currency (until finance exists), metadata.'),
  ('22222222-0000-0000-0000-000000000016', 'scope.change_autonomy',
   'Flip a chapter''s autonomy (autonomous ↔ grouping). Distinct permission from scope.update because the effect on membership + capabilities is severe.')
ON CONFLICT (key) DO NOTHING;

-------------------------------------------------------------------------------
-- 2. Bundle into mainstream_admin (has everything)
-------------------------------------------------------------------------------
-- The Phase 0 seed's mainstream_admin CROSS JOIN already covers this
-- for any env that runs seed.sql after this migration — but staging/prod
-- won't re-run seed, so the mapping needs an explicit INSERT.

INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key IN (
  'scope.create', 'scope.update', 'scope.change_autonomy'
)
WHERE r.key = 'mainstream_admin'
ON CONFLICT DO NOTHING;

-------------------------------------------------------------------------------
-- 3. Bundle into branch_admin
-------------------------------------------------------------------------------
-- Branch admins can create/update Chapters and Batches under their Branch
-- (scope-ancestry-checked at call time), and change chapter autonomy for
-- chapters they own. Sector creation stays Mainstream-only per §2.4 —
-- enforced in the Edge Function, not by permission granularity.

INSERT INTO core.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM core.roles r
INNER JOIN core.permissions p ON p.key IN (
  'scope.create', 'scope.update', 'scope.change_autonomy'
)
WHERE r.key = 'branch_admin'
ON CONFLICT DO NOTHING;

-------------------------------------------------------------------------------
-- 4. Keep seed.sql aligned (documentation only, no exec here)
-------------------------------------------------------------------------------
-- supabase/seed.sql section 2.2 grows a matching block for these three
-- rows in the same commit. Duplicating catalog seed between the migration
-- (for staging/prod) and seed.sql (for local `db:reset`) is intentional:
-- keeps local envs runnable without an "apply migrations then seed"
-- ordering trap.
