-- Migration: cms_leadership_schema
--
-- Creates the CMS surface for the public-website Leadership page. This
-- is content that lives OUTSIDE the operational membership graph:
-- leadership presentation is curated by the Editor persona, not derived
-- from position_assignments (which are the operational governance
-- source of truth). The two are deliberately decoupled so the site
-- editor can present a polished, ordered slate without waiting on the
-- exco governance flow to land.
--
-- Four content shapes, matching the site's four Leadership tabs:
--
--   1. Mainstream Executive — sectors ("Executive", "Council
--      Portfolios", "Coordinators", "Advisory Council") each holding
--      an ordered list of leaders. Every leader: photo, position,
--      name, location.
--   2. Branches — one row per branch's president. Fields: branch name,
--      person name, region, photo.
--   3. Diaspora — same shape as Branches. Kept as a separate table so
--      the site can query each strip independently without joining on
--      a discriminator.
--   4. Batches — one row per year's batch chair. Fields: batch label
--      (e.g. "2015"), person name, photo.
--
-- RLS shape:
--
--   * Public SELECT on every table (anon can read — these render on
--     the public website).
--   * INSERT / UPDATE / DELETE gated on `cms.edit` at the Mainstream
--     scope. `cms.edit` is already carried by the `editor` role
--     (unscoped NULL grant) and by branch_admin (scoped) — the
--     Mainstream-scope check filters branch admins out; only global
--     editors and mainstream admins can curate.
--
-- Photos are stored in the existing public `cms-media` bucket. Rows
-- carry the full public URL (`photo_url`) — the same shape the
-- announcement/event flows already use.

CREATE SCHEMA IF NOT EXISTS cms;
COMMENT ON SCHEMA cms IS
  'Public-website content managed by the Editor persona. Independent of the operational membership + governance graph.';

-- ── 1. Mainstream sectors + leaders ─────────────────────────────────

CREATE TABLE cms.mainstream_sectors (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL UNIQUE,
  caption      TEXT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX mainstream_sectors_sort_idx ON cms.mainstream_sectors (sort_order);
COMMENT ON TABLE cms.mainstream_sectors IS
  'Groupings of mainstream leaders (Executive, Council Portfolios, Coordinators, Advisory Council). Ordered display.';

CREATE TABLE cms.mainstream_leaders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id    UUID NOT NULL REFERENCES cms.mainstream_sectors(id) ON DELETE CASCADE,
  position     TEXT NOT NULL,
  name         TEXT NOT NULL,
  location     TEXT NULL,
  photo_url    TEXT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX mainstream_leaders_sector_sort_idx
  ON cms.mainstream_leaders (sector_id, sort_order);
COMMENT ON TABLE cms.mainstream_leaders IS
  'One row per mainstream executive slate member. Ordered inside each sector.';

-- ── 2. Branch leaders ───────────────────────────────────────────────

CREATE TABLE cms.branch_leaders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_name  TEXT NOT NULL,
  name         TEXT NOT NULL,
  region       TEXT NULL,
  photo_url    TEXT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX branch_leaders_sort_idx ON cms.branch_leaders (sort_order);
COMMENT ON TABLE cms.branch_leaders IS
  'Curated branch/chapter president list for the Leadership page.';

-- ── 3. Diaspora leaders ─────────────────────────────────────────────

CREATE TABLE cms.diaspora_leaders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_name  TEXT NOT NULL,
  name         TEXT NOT NULL,
  region       TEXT NULL,
  photo_url    TEXT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX diaspora_leaders_sort_idx ON cms.diaspora_leaders (sort_order);
COMMENT ON TABLE cms.diaspora_leaders IS
  'Curated diaspora chapter president list. Same shape as branch_leaders; kept separate so the public page can query each strip independently.';

-- ── 4. Batch leaders ────────────────────────────────────────────────

CREATE TABLE cms.batch_leaders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch        TEXT NOT NULL,
  name         TEXT NOT NULL,
  photo_url    TEXT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (batch)
);
CREATE INDEX batch_leaders_sort_idx ON cms.batch_leaders (sort_order);
COMMENT ON TABLE cms.batch_leaders IS
  'One row per batch year with the batch chair listed. Batch label is UNIQUE — only one chair per batch on the site.';

-- ── 5. RLS ──────────────────────────────────────────────────────────

ALTER TABLE cms.mainstream_sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms.mainstream_leaders ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms.branch_leaders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms.diaspora_leaders   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms.batch_leaders      ENABLE ROW LEVEL SECURITY;

-- Public read (anon + authenticated) on every table — the public site
-- calls Supabase via the anon key.
CREATE POLICY mainstream_sectors_select_public ON cms.mainstream_sectors
  FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY mainstream_leaders_select_public ON cms.mainstream_leaders
  FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY branch_leaders_select_public ON cms.branch_leaders
  FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY diaspora_leaders_select_public ON cms.diaspora_leaders
  FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY batch_leaders_select_public ON cms.batch_leaders
  FOR SELECT TO anon, authenticated USING (TRUE);

-- Editor write. `cms.edit` at the Mainstream scope covers global
-- editors (NULL-scope grant) and mainstream_admin (via NULL-scope
-- bypass in has_permission). Branch admins hold cms.edit at their
-- branch — that fails the Mainstream check, so they can't touch the
-- public-site content.
-- Editor writes: `cms.edit` at the Mainstream scope.
--
-- 2026-09-02: this block used to resolve the Mainstream scope id at
-- MIGRATION time and bake it into each policy as a literal, raising if
-- the scope was missing. But no migration creates that scope — it lives
-- only in the seed, and the CLI applies migrations BEFORE the seed. So
-- every fresh database (a clean `db reset`, a `db push` to an empty
-- project, CI's `supabase start`) aborted here, and the CMS migrations
-- after it never ran.
--
-- Resolving through `core.mainstream_scope_id()` at policy-evaluation
-- time removes the ordering dependency entirely, and the policy now
-- survives a re-seed that mints a different UUID. The helper is
-- SECURITY DEFINER + STABLE and is created in 20260701205044.

CREATE POLICY mainstream_sectors_write_editor ON cms.mainstream_sectors
  FOR ALL TO authenticated
  USING      (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'))
  WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'));

CREATE POLICY mainstream_leaders_write_editor ON cms.mainstream_leaders
  FOR ALL TO authenticated
  USING      (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'))
  WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'));

CREATE POLICY branch_leaders_write_editor ON cms.branch_leaders
  FOR ALL TO authenticated
  USING      (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'))
  WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'));

CREATE POLICY diaspora_leaders_write_editor ON cms.diaspora_leaders
  FOR ALL TO authenticated
  USING      (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'))
  WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'));

CREATE POLICY batch_leaders_write_editor ON cms.batch_leaders
  FOR ALL TO authenticated
  USING      (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'))
  WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'));


-- ── 6. Expose the schema via PostgREST ──────────────────────────────
-- The `postgrest` role needs USAGE on the schema + SELECT on tables
-- for the anon/authenticated public reads to work through supabase-js.

GRANT USAGE ON SCHEMA cms TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA cms TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA cms TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA cms TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA cms
  GRANT SELECT ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA cms
  GRANT INSERT, UPDATE, DELETE ON TABLES TO authenticated;
