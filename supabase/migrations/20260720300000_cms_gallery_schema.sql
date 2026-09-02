-- Migration: cms_gallery_schema
--
-- Gallery surface for the Editor persona. Albums group photos + videos
-- shot at a single event or drive; each media item is either an image
-- URL or a video URL (self-hosted or an external CDN link). Same
-- envelope as Leadership / News / Projects / Site Events: public
-- SELECT, editor-write RLS gated on `cms.edit` at Mainstream.
--
--   * `cms.gallery_album_categories` — small curated tag list (AGM,
--     Homecoming, Ceremony, Community, Cultural, Summit).
--
--   * `cms.gallery_albums` — one row per album. Cover image drives the
--     album card; `linked_event_id` (nullable FK to cms.site_events)
--     lets the editor tie an album to a specific site event, and the
--     public event detail page picks it up to render a "View album"
--     button.
--
--   * `cms.gallery_media` — one row per photo or video in an album.
--     `kind` splits them; `poster_url` is the video still.
--
--   * `cms.gallery_album_categories_map` — many-to-many join.

CREATE TABLE cms.gallery_album_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE cms.gallery_album_categories IS
  'Curated tag list for gallery albums (AGM, Homecoming, …). Editor-managed.';

CREATE TABLE cms.gallery_albums (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT NOT NULL UNIQUE,
  title               TEXT NOT NULL,
  date_label          TEXT NULL,       -- free-text label ("November 2024")
  location            TEXT NULL,
  description         TEXT NULL,
  cover_url           TEXT NULL,
  photographer        TEXT NULL,

  linked_event_id     UUID NULL REFERENCES cms.site_events(id) ON DELETE SET NULL,

  sort_order          INTEGER NOT NULL DEFAULT 0,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX gallery_albums_sort_idx       ON cms.gallery_albums (sort_order);
CREATE INDEX gallery_albums_event_link_idx ON cms.gallery_albums (linked_event_id) WHERE linked_event_id IS NOT NULL;

COMMENT ON TABLE cms.gallery_albums IS
  'Public-site albums. Optional linked_event_id ties an album back to a Site Event so the event''s detail page can render a "View album" button.';

CREATE TABLE cms.gallery_media (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id            UUID NOT NULL REFERENCES cms.gallery_albums(id) ON DELETE CASCADE,
  kind                TEXT NOT NULL CHECK (kind IN ('photo', 'video')),
  src                 TEXT NOT NULL,        -- full-resolution source URL
  thumbnail_url       TEXT NULL,            -- optional smaller thumbnail
  poster_url          TEXT NULL,            -- video-only still frame
  alt                 TEXT NULL,
  aspect              TEXT NOT NULL DEFAULT '3/2'
                      CHECK (aspect IN ('1/1', '3/4', '4/3', '3/2', '2/3', '16/9', '9/16')),
  sort_order          INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX gallery_media_album_sort_idx ON cms.gallery_media (album_id, sort_order);
CREATE INDEX gallery_media_kind_idx        ON cms.gallery_media (kind);

COMMENT ON TABLE cms.gallery_media IS
  'Photo or video items inside an album. src is the full source URL; poster_url + thumbnail_url are optional variants. CASCADE-deleted with the parent album.';

CREATE TABLE cms.gallery_album_categories_map (
  album_id    UUID NOT NULL REFERENCES cms.gallery_albums(id)           ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES cms.gallery_album_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (album_id, category_id)
);
CREATE INDEX gallery_album_categories_map_cat_idx ON cms.gallery_album_categories_map (category_id);

-- ── RLS ─────────────────────────────────────────────────────────────

ALTER TABLE cms.gallery_album_categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms.gallery_albums               ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms.gallery_media                ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms.gallery_album_categories_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY gallery_album_categories_select_public ON cms.gallery_album_categories
  FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY gallery_albums_select_public ON cms.gallery_albums
  FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY gallery_media_select_public ON cms.gallery_media
  FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY gallery_album_categories_map_select_public ON cms.gallery_album_categories_map
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

CREATE POLICY gallery_album_categories_write_editor ON cms.gallery_album_categories
  FOR ALL TO authenticated
  USING      (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'))
  WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'));

CREATE POLICY gallery_albums_write_editor ON cms.gallery_albums
  FOR ALL TO authenticated
  USING      (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'))
  WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'));

CREATE POLICY gallery_media_write_editor ON cms.gallery_media
  FOR ALL TO authenticated
  USING      (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'))
  WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'));

CREATE POLICY gallery_album_categories_map_write_editor ON cms.gallery_album_categories_map
  FOR ALL TO authenticated
  USING      (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'))
  WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'));


GRANT SELECT
  ON cms.gallery_album_categories, cms.gallery_albums, cms.gallery_media,
     cms.gallery_album_categories_map
  TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE
  ON cms.gallery_album_categories, cms.gallery_albums, cms.gallery_media,
     cms.gallery_album_categories_map
  TO authenticated;
GRANT ALL
  ON cms.gallery_album_categories, cms.gallery_albums, cms.gallery_media,
     cms.gallery_album_categories_map
  TO service_role;
