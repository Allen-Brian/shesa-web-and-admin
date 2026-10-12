-- Migration: init_core_schema
--
-- Creates the `core` schema and its first three tables — profiles, scopes,
-- and scope_capabilities — per the Phase 0 spec §7. RLS is enabled with
-- NO policies in this migration so the tables are LOCKED to non-superuser
-- access by default; the real policies land in E5 once RBAC exists.
-- The service-role key (and direct Postgres connections, which the seed
-- uses) bypass RLS, so seeding and E3's RBAC work continues to function.
--
-- Per ADR-0003 and the Phase 0 planning decision, schemas are created by
-- the phase that owns them. This migration owns `core`. Future schemas
-- (`audit` in E4, `notifications` in E6, etc.) are created in their own
-- migrations within their own epics.
--
-- Naming note (ADR-0007): we use `core.scopes` / `scope_type` /
-- `parent_scope_id`. Earlier drafts called these `org_nodes` / `node_type`.

-------------------------------------------------------------------------------
-- 1. Schema
-------------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS core;
COMMENT ON SCHEMA core IS
  'Identity, members, scopes (org hierarchy), roles & permissions. Owned by Phase 0 (E2 + E3).';

-------------------------------------------------------------------------------
-- 2. Reusable helpers
-------------------------------------------------------------------------------

-- Auto-bump updated_at on UPDATE. Reused by every table in `core` that has
-- an updated_at column. SECURITY DEFINER is NOT needed here — it just sets
-- a column value on the row being updated.
CREATE OR REPLACE FUNCTION core.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION core.set_updated_at IS
  'BEFORE UPDATE trigger that stamps updated_at = NOW(). Attached to every core.* table with an updated_at column.';

-------------------------------------------------------------------------------
-- 3. Enum: scope_type
-------------------------------------------------------------------------------

-- The org hierarchy node kinds. Adding a value later requires `ALTER TYPE
-- core.scope_type ADD VALUE ...`, which is intentionally a deliberate
-- migration rather than a code-only change.
CREATE TYPE core.scope_type AS ENUM (
  'mainstream',
  'branch',
  'chapter',
  'batch',
  'house',
  'sector'
);

-------------------------------------------------------------------------------
-- 4. Table: core.profiles
-------------------------------------------------------------------------------
-- One row per Supabase Auth user, linked 1:1 via the shared id.
-- Holds the user-visible profile fields the apps consume.

CREATE TABLE core.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT,
  email           TEXT,
  phone           TEXT,
  avatar_url      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON core.profiles
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

COMMENT ON TABLE core.profiles IS
  'User-visible profile fields, 1:1 with auth.users. Linked via shared id.';

-------------------------------------------------------------------------------
-- 5. Table: core.scopes  (the org hierarchy)
-------------------------------------------------------------------------------
-- Single table for every level of the hierarchy (Mainstream → Branch →
-- Chapter → Batch → House) plus the cross-cutting Sector. The
-- `parent_scope_id` self-reference forms the tree; recursive CTEs over
-- it answer "everything under Branch X" cleanly.

CREATE TABLE core.scopes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  scope_type      core.scope_type NOT NULL,
  parent_scope_id UUID REFERENCES core.scopes(id) ON DELETE RESTRICT,
  is_autonomous   BOOLEAN NOT NULL DEFAULT FALSE,
  currency_code   TEXT NOT NULL DEFAULT 'XAF',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Structural invariant: only the single 'mainstream' node may have a
  -- NULL parent. Every other scope must be rooted somewhere in the tree.
  CONSTRAINT scopes_parent_required_unless_mainstream
    CHECK (scope_type = 'mainstream' OR parent_scope_id IS NOT NULL)
);

-- Children-of-X lookups are the hottest query — index the FK.
CREATE INDEX scopes_parent_scope_id_idx ON core.scopes (parent_scope_id);

-- "All active branches", "all sectors", etc. — composite index serves
-- both filters cheaply.
CREATE INDEX scopes_type_active_idx ON core.scopes (scope_type, is_active);

-- Enforce exactly one Mainstream row (the single root of the tree).
-- Partial unique index is the idiomatic Postgres way to express
-- "at most one row matching this predicate."
CREATE UNIQUE INDEX scopes_only_one_mainstream
  ON core.scopes ((TRUE))
  WHERE scope_type = 'mainstream';

CREATE TRIGGER scopes_set_updated_at
  BEFORE UPDATE ON core.scopes
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

COMMENT ON TABLE core.scopes IS
  'Every node in the Shesa org hierarchy: Mainstream → Branch → Chapter → Batch → House, plus Sector (cross-cutting). Parent/child via parent_scope_id.';

-------------------------------------------------------------------------------
-- 6. Table: core.scope_capabilities  (per spec §7.3)
-------------------------------------------------------------------------------
-- Optional capability profile per scope — which features that scope can
-- use. Separated from `core.scopes` so a scope can exist without yet
-- having its capabilities decided (e.g. during initial onboarding).

CREATE TABLE core.scope_capabilities (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_id                    UUID NOT NULL UNIQUE
                              REFERENCES core.scopes(id) ON DELETE CASCADE,
  can_manage_members          BOOLEAN NOT NULL DEFAULT FALSE,
  can_have_treasury           BOOLEAN NOT NULL DEFAULT FALSE,
  can_create_binding_dues     BOOLEAN NOT NULL DEFAULT FALSE,
  can_have_website_page       BOOLEAN NOT NULL DEFAULT FALSE,
  can_have_forum              BOOLEAN NOT NULL DEFAULT FALSE,
  can_label_active_passive    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER scope_capabilities_set_updated_at
  BEFORE UPDATE ON core.scope_capabilities
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

COMMENT ON TABLE core.scope_capabilities IS
  'Per-scope feature toggles (treasury, members, forum, etc.). One row per scope; absence means "no capabilities set yet".';

-------------------------------------------------------------------------------
-- 7. RLS — enable with NO policies (defense-in-depth default)
-------------------------------------------------------------------------------
-- Enabling RLS without policies blocks all anon/authenticated access.
-- Real policies are added in E5, after E3 lands the RBAC tables that
-- the policies depend on. Service-role connections (Supabase service-role
-- key) and direct Postgres connections (the seed, supabase db reset)
-- bypass RLS and continue to work.
--
-- This ordering — enable RLS in the table's creation migration, add
-- policies later — means we cannot ever ship a forgotten-RLS hole.
-- If E5 is delayed, the worst-case is "no app can read these tables"
-- (loud failure), not "everyone can read them" (silent disaster).

ALTER TABLE core.profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.scopes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE core.scope_capabilities  ENABLE ROW LEVEL SECURITY;
