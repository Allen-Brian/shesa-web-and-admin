-- Migration: cms_site_events_schema
--
-- Site Events surface for the Editor persona. Public-website events —
-- distinct from `exco.events` which are the operational governance
-- calendar entries. The Editor curates what visitors see on the
-- public /events page here; a follow-up will add a "Publish to
-- website" button on exco events that clones the row into this table.
--
-- Shape mirrors the static event data the web app used to serve:
--
--   * `cms.site_event_categories` — small curated tag list (Reunion,
--     Ceremony, Community, Cultural, Fundraising, Career).
--
--   * `cms.site_events` — one row per event. Rich extended body sits
--     alongside a short description; program (schedule) + flyers are
--     ordered JSONB arrays keeping the child data atomic on save.
--     Ticketing is opt-in: `has_ticketing` flips a boolean and the
--     optional url / price / currency fill in when true.
--
--   * `cms.site_event_categories_map` — many-to-many join.
--
-- Featured event: `is_featured` is a UNIQUE partial index — only one
-- event can be featured at a time.

CREATE TABLE cms.site_event_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE cms.site_event_categories IS
  'Curated tag list for site events (Reunion, Ceremony, …). Editor-managed.';

CREATE TABLE cms.site_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT NOT NULL UNIQUE,
  title               TEXT NOT NULL,
  short_description   TEXT NULL,
  description_html    TEXT NOT NULL DEFAULT '',
  banner_url          TEXT NULL,

  -- Date + place
  starts_at           TIMESTAMPTZ NOT NULL,
  ends_at             TIMESTAMPTZ NULL,
  location            TEXT NULL,
  city                TEXT NULL,

  is_featured         BOOLEAN NOT NULL DEFAULT FALSE,

  -- Ticketing (opt-in — the three columns below are only meaningful
  -- when has_ticketing = TRUE)
  has_ticketing       BOOLEAN NOT NULL DEFAULT FALSE,
  ticket_url          TEXT NULL,
  ticket_price        NUMERIC(20,2) NULL CHECK (ticket_price IS NULL OR ticket_price >= 0),
  ticket_currency     TEXT NULL,

  -- Ordered JSONB children
  flyers              JSONB NOT NULL DEFAULT '[]'::jsonb
                      CHECK (jsonb_typeof(flyers) = 'array'),
  program             JSONB NOT NULL DEFAULT '[]'::jsonb
                      CHECK (jsonb_typeof(program) = 'array'),

  -- Optional link to a gallery album (free-text slug for now — a
  -- follow-up wires FK when cms.albums lands).
  album_slug          TEXT NULL,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX site_events_starts_idx ON cms.site_events (starts_at);
CREATE UNIQUE INDEX site_events_one_featured
  ON cms.site_events (is_featured) WHERE is_featured = TRUE;

COMMENT ON TABLE cms.site_events IS
  'Public-site events. `is_featured` is unique (only one at a time) via a partial index. Program + flyers are ordered JSONB arrays; ticketing is opt-in with an optional URL, price, currency triple.';

CREATE TABLE cms.site_event_categories_map (
  event_id    UUID NOT NULL REFERENCES cms.site_events(id)           ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES cms.site_event_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, category_id)
);
CREATE INDEX site_event_categories_map_cat_idx ON cms.site_event_categories_map (category_id);

-- ── RLS ─────────────────────────────────────────────────────────────

ALTER TABLE cms.site_event_categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms.site_events               ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms.site_event_categories_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY site_event_categories_select_public ON cms.site_event_categories
  FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY site_events_select_public ON cms.site_events
  FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY site_event_categories_map_select_public ON cms.site_event_categories_map
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

CREATE POLICY site_event_categories_write_editor ON cms.site_event_categories
  FOR ALL TO authenticated
  USING      (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'))
  WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'));

CREATE POLICY site_events_write_editor ON cms.site_events
  FOR ALL TO authenticated
  USING      (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'))
  WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'));

CREATE POLICY site_event_categories_map_write_editor ON cms.site_event_categories_map
  FOR ALL TO authenticated
  USING      (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'))
  WITH CHECK (core.has_permission(auth.uid(), core.mainstream_scope_id(), 'cms.edit'));


GRANT SELECT ON cms.site_event_categories, cms.site_events, cms.site_event_categories_map
  TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE
  ON cms.site_event_categories, cms.site_events, cms.site_event_categories_map
  TO authenticated;
GRANT ALL ON cms.site_event_categories, cms.site_events, cms.site_event_categories_map
  TO service_role;
