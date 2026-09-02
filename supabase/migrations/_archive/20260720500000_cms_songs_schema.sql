-- Migration: cms_songs_schema
--
-- Songs surface for the Editor persona. The catalogue of SHESA-related
-- songs (anthems, chapter songs, cultural pieces) with audio + cover
-- + attribution. Groups are pure curated tags (Anthems, Chapter Songs,
-- Cultural, …) — one song can only belong to one group at a time to
-- keep the browse UI simple.
--
--   * `cms.song_groups` — small curated grouping list.
--   * `cms.songs` — one row per song. `audio_url` is either a public
--     URL in the new `cms-audio` bucket or an external CDN link.
--     `duration_seconds` is captured on upload so the player can render
--     a length pill before the file loads.
--
-- Same envelope as prior CMS surfaces: public SELECT, editor-write RLS
-- gated on `cms.edit` at Mainstream scope.

CREATE TABLE cms.song_groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE cms.song_groups IS
  'Curated groupings for songs (Anthems, Chapter Songs, Cultural, …). Editor-managed.';

CREATE TABLE cms.songs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id          UUID NOT NULL REFERENCES cms.song_groups(id) ON DELETE RESTRICT,
  slug              TEXT NOT NULL UNIQUE,
  title             TEXT NOT NULL,
  subtitle          TEXT NULL,
  composer          TEXT NULL,
  performer         TEXT NULL,
  description       TEXT NULL,
  audio_url         TEXT NOT NULL,
  cover_url         TEXT NULL,
  duration_seconds  INTEGER NULL CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  released_year     INTEGER NULL,
  lyrics            TEXT NULL,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX songs_group_sort_idx ON cms.songs (group_id, sort_order);
CREATE INDEX songs_slug_idx        ON cms.songs (slug);

COMMENT ON TABLE cms.songs IS
  'Individual songs in the SHESA catalogue. Every song belongs to exactly one group; audio_url + cover_url are public URLs (self-hosted in cms-audio/cms-media or external CDN links).';

-- ── Storage bucket for audio ────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('cms-audio', 'cms-audio', TRUE, 50 * 1024 * 1024)  -- 50 MB per file
ON CONFLICT (id) DO NOTHING;

-- Public read; authenticated write (RLS at cms.edit level lives in the
-- server action which uses the service-role client).
CREATE POLICY cms_audio_public_read ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'cms-audio');

CREATE POLICY cms_audio_authed_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'cms-audio');

CREATE POLICY cms_audio_authed_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'cms-audio');

-- ── RLS ─────────────────────────────────────────────────────────────

ALTER TABLE cms.song_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms.songs        ENABLE ROW LEVEL SECURITY;

CREATE POLICY song_groups_select_public ON cms.song_groups
  FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY songs_select_public ON cms.songs
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

CREATE POLICY song_groups_write_editor ON cms.song_groups
  FOR ALL TO authenticated
  USING      (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'))
  WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'));

CREATE POLICY songs_write_editor ON cms.songs
  FOR ALL TO authenticated
  USING      (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'))
  WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'));


GRANT SELECT           ON cms.song_groups, cms.songs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON cms.song_groups, cms.songs TO authenticated;
GRANT ALL              ON cms.song_groups, cms.songs TO service_role;
