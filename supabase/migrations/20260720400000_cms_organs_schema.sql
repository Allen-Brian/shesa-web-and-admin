-- Migration: cms_organs_schema
--
-- Organs surface for the Editor persona. An "organ" is a unit of the
-- SHESA structure — the National body, a regional Sector (Europe,
-- North-America), or a local branch/chapter (Berlin, Bamenda, …).
-- Sectors are pure groupings, curated per the categories pattern.
--
--   * `cms.organ_sectors` — small curated list of top-level groupings
--     (National (Cameroon), Europe, North America, …). Editor-managed.
--
--   * `cms.organs` — one row per organ. `sector_id` places the organ
--     under a grouping; `member_count` is the running headcount the
--     public page surfaces. Optional location / founded_year / logo /
--     contact fields keep the profile useful but concise.
--
-- Same envelope as the earlier CMS surfaces: public SELECT, editor-write
-- RLS gated on `cms.edit` at Mainstream scope.

CREATE TABLE cms.organ_sectors (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  slug       TEXT NOT NULL UNIQUE,
  description TEXT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE cms.organ_sectors IS
  'Top-level groupings for organs (National (Cameroon), Europe, North America, …). Sectors are curated by the Editor.';

CREATE TABLE cms.organs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id     UUID NOT NULL REFERENCES cms.organ_sectors(id) ON DELETE RESTRICT,
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  short_name    TEXT NULL,
  location      TEXT NULL,               -- "Bamenda", "Berlin", …
  country       TEXT NULL,               -- ISO-friendly country label
  founded_year  INTEGER NULL,
  member_count  INTEGER NOT NULL DEFAULT 0 CHECK (member_count >= 0),
  description   TEXT NULL,
  logo_url      TEXT NULL,
  contact_email TEXT NULL,
  contact_phone TEXT NULL,
  website_url   TEXT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX organs_sector_sort_idx ON cms.organs (sector_id, sort_order);
CREATE INDEX organs_slug_idx        ON cms.organs (slug);

COMMENT ON TABLE cms.organs IS
  'Individual SHESA organs — National body, sectors, branches, chapters. Every organ belongs to a sector (the grouping surfaced on the public page).';

-- ── RLS ─────────────────────────────────────────────────────────────

ALTER TABLE cms.organ_sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms.organs        ENABLE ROW LEVEL SECURITY;

CREATE POLICY organ_sectors_select_public ON cms.organ_sectors
  FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY organs_select_public ON cms.organs
  FOR SELECT TO anon, authenticated USING (TRUE);

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

CREATE POLICY organ_sectors_write_editor ON cms.organ_sectors
  FOR ALL TO authenticated
  USING      (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'))
  WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'));

CREATE POLICY organs_write_editor ON cms.organs
  FOR ALL TO authenticated
  USING      (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'))
  WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'));


GRANT SELECT           ON cms.organ_sectors, cms.organs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON cms.organ_sectors, cms.organs TO authenticated;
GRANT ALL              ON cms.organ_sectors, cms.organs TO service_role;
