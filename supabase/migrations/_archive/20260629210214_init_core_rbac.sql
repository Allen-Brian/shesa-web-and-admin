-- Migration: init_core_rbac
--
-- The RBAC tables for Shesa per spec §8:
--
--   core.roles               named role keys ('branch_admin', 'finance', ...)
--   core.permissions         resource.action keys ('charge.create', 'audit.read', ...)
--   core.role_permissions    many-to-many between the two
--   core.role_assignments    grants of a (user, role, scope) tuple, with
--                            audit columns (granted_by, revoked_at, revoked_by)
--                            and a lifecycle window (starts_at, ends_at).
--
-- These tables seed the catalog the permission checker function (next
-- migration) reads. Seed data for the system roles + permissions +
-- role_permission mappings is added to supabase/seed.sql in this commit.
--
-- RLS is enabled on every table with NO policies — same defense-in-depth
-- default as the E2 tables. Real policies land in E5 once we can reference
-- the permission checker from within them.

-------------------------------------------------------------------------------
-- 1. core.roles
-------------------------------------------------------------------------------

CREATE TABLE core.roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT,
  is_system   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE core.roles IS
  'Named role keys seeded by Phase 0 + extensible later. `is_system` distinguishes the seeded system roles from any future user-created roles.';

COMMENT ON COLUMN core.roles.key IS
  'Stable string key used in code (mirrors @shesa/types ROLE_KEYS literal).';

-------------------------------------------------------------------------------
-- 2. core.permissions
-------------------------------------------------------------------------------

CREATE TABLE core.permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE core.permissions IS
  'Catalog of resource.action keys checkable via core.has_permission. Mirrors @shesa/types PERMISSION_KEYS literal.';

-------------------------------------------------------------------------------
-- 3. core.role_permissions  (m2m)
-------------------------------------------------------------------------------

CREATE TABLE core.role_permissions (
  role_id       UUID NOT NULL REFERENCES core.roles(id)       ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES core.permissions(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_id, permission_id)
);

-- Reverse-lookup index: "which roles grant permission X?". Useful when
-- auditing the blast radius of a permission, and for the checker's
-- join order if Postgres ever chooses it.
CREATE INDEX role_permissions_permission_id_idx
  ON core.role_permissions (permission_id);

COMMENT ON TABLE core.role_permissions IS
  'Many-to-many: which permissions does each role grant?';

-------------------------------------------------------------------------------
-- 4. core.role_assignments  (the actual grants)
-------------------------------------------------------------------------------

CREATE TABLE core.role_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id     UUID NOT NULL REFERENCES auth.users(id)  ON DELETE CASCADE,
  scope_id    UUID NOT NULL REFERENCES core.scopes(id) ON DELETE CASCADE,
  role_id     UUID NOT NULL REFERENCES core.roles(id)  ON DELETE RESTRICT,

  -- Lifecycle window. `starts_at = now()` for immediate grants;
  -- `ends_at` is open-ended (NULL = no expiry).
  starts_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at     TIMESTAMPTZ NULL,

  -- Audit columns: who granted, who revoked.
  -- `SET NULL` on user delete so an assignment's history survives a
  -- grantor leaving the system (a revoked role still shows it was
  -- revoked, just by an unknown actor).
  granted_by  UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at  TIMESTAMPTZ NULL,
  revoked_by  UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Sanity: revoked rows must have both columns set together.
  CONSTRAINT role_assignments_revocation_consistent
    CHECK ((revoked_at IS NULL) = (revoked_by IS NULL)),

  -- Sanity: an end can't precede a start.
  CONSTRAINT role_assignments_window_ordered
    CHECK (ends_at IS NULL OR ends_at > starts_at)
);

-- Permission lookups are by (user_id, scope_id) — that's the dominant
-- query shape from has_permission. Composite index serves both filters.
CREATE INDEX role_assignments_user_scope_idx
  ON core.role_assignments (user_id, scope_id);

-- Reverse lookups ("who has role X at scope Y") use scope_id alone.
CREATE INDEX role_assignments_scope_id_idx
  ON core.role_assignments (scope_id);

-- Prevent duplicate ACTIVE (non-revoked) assignments of the same role at
-- the same scope to the same user. Re-granting after revocation is fine
-- (the index is partial, only applying to revoked_at IS NULL rows).
CREATE UNIQUE INDEX role_assignments_unique_active
  ON core.role_assignments (user_id, scope_id, role_id)
  WHERE revoked_at IS NULL;

COMMENT ON TABLE core.role_assignments IS
  'Concrete grants of (user, role, scope). Append-only in spirit: revocations set revoked_at/revoked_by rather than deleting the row, so the audit trail survives.';

-------------------------------------------------------------------------------
-- 5. RLS — enable with NO policies (defense-in-depth default)
-------------------------------------------------------------------------------

ALTER TABLE core.roles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.permissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.role_assignments ENABLE ROW LEVEL SECURITY;
