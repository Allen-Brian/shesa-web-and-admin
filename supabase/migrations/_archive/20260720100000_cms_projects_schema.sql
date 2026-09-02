-- Migration: cms_projects_schema
--
-- Projects surface for the Editor persona. Same envelope as the
-- Leadership + News CMS: `cms` schema, public SELECT + `cms.edit`
-- write, RLS gated at Mainstream.
--
-- Shape mirrors the static Project type the web app used to serve:
--
--   * `cms.project_categories`  — small curated tag list (Education,
--     Health, Infrastructure, Community, Finance, Career, Culture).
--     Editor-managed via the compact dialog pattern.
--
--   * `cms.projects`            — the main content row. Rich content
--     is HTML (`description_html`). Optional fundraising fields sit
--     alongside as three nullable columns; when any is set, the
--     public site renders the fundraiser progress bar.
--
--   * `cms.project_categories_map` — many-to-many join.
--
-- Structured child content is stored as JSONB arrays on the parent
-- row: `milestones` and `impact_stats`. Both are ordered arrays of
-- small records, always rewritten atomically by the form. Keeping
-- them out of separate tables avoids cascade complexity — projects
-- rarely need per-milestone RLS or joins.

CREATE TABLE cms.project_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE cms.project_categories IS
  'Curated tag list for projects (Education, Health, …). Editor-managed.';

CREATE TABLE cms.projects (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT NOT NULL UNIQUE,
  title               TEXT NOT NULL,
  short_description   TEXT NULL,
  description_html    TEXT NOT NULL DEFAULT '',
  banner_url          TEXT NULL,

  status              TEXT NOT NULL DEFAULT 'Planning'
                      CHECK (status IN ('Active', 'Ongoing', 'Planning', 'Fundraising', 'Completed')),
  started_on          TEXT NULL,          -- free-text label ("January 2024")
  location            TEXT NULL,
  lead                TEXT NULL,

  is_featured         BOOLEAN NOT NULL DEFAULT FALSE,

  funding_raised      NUMERIC(20,2) NULL CHECK (funding_raised IS NULL OR funding_raised >= 0),
  funding_target      NUMERIC(20,2) NULL CHECK (funding_target IS NULL OR funding_target >= 0),
  funding_currency    TEXT NULL,

  -- Ordered array of { date, title, body?, done? } objects.
  milestones          JSONB NOT NULL DEFAULT '[]'::jsonb
                      CHECK (jsonb_typeof(milestones) = 'array'),
  -- Ordered array of { value, label } objects.
  impact_stats        JSONB NOT NULL DEFAULT '[]'::jsonb
                      CHECK (jsonb_typeof(impact_stats) = 'array'),

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX projects_status_idx   ON cms.projects (status);
CREATE INDEX projects_featured_idx ON cms.projects (is_featured) WHERE is_featured = TRUE;

COMMENT ON TABLE cms.projects IS
  'Public-site projects. Rich description in HTML; optional fundraising columns drive the progress bar. Milestones + impact stats are ordered JSONB arrays.';

CREATE TABLE cms.project_categories_map (
  project_id  UUID NOT NULL REFERENCES cms.projects(id)           ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES cms.project_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, category_id)
);
CREATE INDEX project_categories_map_cat_idx ON cms.project_categories_map (category_id);

-- ── RLS ─────────────────────────────────────────────────────────────

ALTER TABLE cms.project_categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms.projects               ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms.project_categories_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_categories_select_public ON cms.project_categories
  FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY projects_select_public ON cms.projects
  FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY project_categories_map_select_public ON cms.project_categories_map
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

CREATE POLICY project_categories_write_editor ON cms.project_categories
  FOR ALL TO authenticated
  USING      (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'))
  WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'));

CREATE POLICY projects_write_editor ON cms.projects
  FOR ALL TO authenticated
  USING      (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'))
  WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'));

CREATE POLICY project_categories_map_write_editor ON cms.project_categories_map
  FOR ALL TO authenticated
  USING      (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'))
  WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'));


-- Grants (same shape as leadership + articles).
GRANT SELECT ON cms.project_categories, cms.projects, cms.project_categories_map
  TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON cms.project_categories, cms.projects, cms.project_categories_map
  TO authenticated;
GRANT ALL ON cms.project_categories, cms.projects, cms.project_categories_map
  TO service_role;
