-- Migration: cms_articles_schema
--
-- News/Articles surface for the Editor persona. Same envelope as the
-- Leadership CMS: `cms` schema, public SELECT + `cms.edit` write, RLS
-- gated at the Mainstream scope.
--
-- Model:
--
--   * `cms.article_categories`  — small curated list (News,
--     Announcement, Announcement, Diaspora, …). Editor-managed via a
--     compact dialog identical to the Leadership sectors manager.
--
--   * `cms.articles`            — the main content row. Rich content
--     is stored as HTML (`content_html`) so the site can render it as
--     a rendered fragment; the Quill editor in the admin already
--     produces this shape. Banner picture is a public URL from the
--     `cms-media` bucket.
--
--   * `cms.article_categories_map` — many-to-many join. An article
--     can belong to multiple categories.
--
-- Author:
--   Free-text — the Editor types "The National Secretariat" or
--   "Programs Secretariat". Optional avatar_url; when NULL the public
--   site renders the initials as an avatar.
--
-- Scheduling:
--   `publish_at` is the target publish time; `status` derives on read:
--     draft     — status='draft'
--     scheduled — status='scheduled' AND publish_at > now()
--     published — status='published' OR (publish_at <= now())
--   The public site filters WHERE status='published' AND publish_at <= now().

CREATE TABLE cms.article_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE cms.article_categories IS
  'Article category tags (News, Announcement, Diaspora, …). Editor-managed.';

CREATE TABLE cms.articles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT NOT NULL UNIQUE,
  title             TEXT NOT NULL,
  excerpt           TEXT NULL,
  content_html      TEXT NOT NULL DEFAULT '',
  banner_url        TEXT NULL,

  author_name       TEXT NOT NULL,
  author_title      TEXT NULL,
  author_photo_url  TEXT NULL,

  status            TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  publish_at        TIMESTAMPTZ NULL,
  is_featured       BOOLEAN NOT NULL DEFAULT FALSE,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX articles_status_publish_idx ON cms.articles (status, publish_at DESC);
CREATE INDEX articles_featured_idx       ON cms.articles (is_featured) WHERE is_featured = TRUE;

COMMENT ON TABLE cms.articles IS
  'Public-site articles. Rich content stored as HTML. Publish date + optional scheduling; is_featured surfaces on the hero carousel.';

CREATE TABLE cms.article_categories_map (
  article_id  UUID NOT NULL REFERENCES cms.articles(id)           ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES cms.article_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, category_id)
);
CREATE INDEX article_categories_map_cat_idx ON cms.article_categories_map (category_id);

-- ── RLS ─────────────────────────────────────────────────────────────

ALTER TABLE cms.article_categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms.articles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms.article_categories_map ENABLE ROW LEVEL SECURITY;

-- Public SELECT (anon can read categories + published articles + their
-- category maps). We DON'T filter draft/scheduled at the RLS layer —
-- the reading queries do that. This keeps the admin surface (which
-- shows drafts) simple.
CREATE POLICY article_categories_select_public ON cms.article_categories
  FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY articles_select_public ON cms.articles
  FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY article_categories_map_select_public ON cms.article_categories_map
  FOR SELECT TO anon, authenticated USING (TRUE);

-- Editor writes: `cms.edit` at Mainstream scope. Same pattern as the
-- Leadership tables.
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

CREATE POLICY article_categories_write_editor ON cms.article_categories
  FOR ALL TO authenticated
  USING      (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'))
  WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'));

CREATE POLICY articles_write_editor ON cms.articles
  FOR ALL TO authenticated
  USING      (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'))
  WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'));

CREATE POLICY article_categories_map_write_editor ON cms.article_categories_map
  FOR ALL TO authenticated
  USING      (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'))
  WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'));


-- Grants (same shape as the leadership tables).
GRANT SELECT ON cms.article_categories, cms.articles, cms.article_categories_map
  TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON cms.article_categories, cms.articles, cms.article_categories_map
  TO authenticated;
GRANT ALL ON cms.article_categories, cms.articles, cms.article_categories_map
  TO service_role;
