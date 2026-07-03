-- Migration: create_core_houses
--
-- The first cluster-detail table lands. `core.houses` carries house-only
-- fields alongside the shared `core.scopes` spine — Option 1 of the
-- clusters spec (planning 2026-07-02): 1:1 detail table keyed by scope_id.
--
-- House invariants per spec:
--   - Fixed set of four (St Thomas, St Peter, St Francis, St John) —
--     seeded, never created or deleted through the UI.
--   - `color` (canonical name) + `color_hex` (precise CSS value) both
--     first-class typed columns since the UI reads them constantly.
--   - `sort_order` fixes the display order across every surface.
--   - `metadata` jsonb carries the free-form fields (motto, patron,
--     crest_asset) — not surfaced for edit in this phase.
--   - No `status` column — houses are always active; global-mainstream
--     fixed set. `core.scopes.status` is the fallback if we ever need it.
--
-- Constraint on color naming:
--   The four canonical colors (blue / yellow / green / red) are enforced
--   via CHECK so a future mistake — "purple house" — can't be inserted
--   without a follow-up migration explicitly widening the set.

-------------------------------------------------------------------------------
-- 1. Table
-------------------------------------------------------------------------------

CREATE TABLE core.houses (
  scope_id     UUID PRIMARY KEY REFERENCES core.scopes(id) ON DELETE CASCADE,
  color        TEXT NOT NULL,
  color_hex    TEXT NOT NULL,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- The seeded four. Widen this list only via a follow-up migration.
  CONSTRAINT houses_color_is_seeded
    CHECK (color IN ('blue', 'yellow', 'green', 'red')),

  -- Simple hex-shape guard (accepts #RGB, #RRGGBB, and 8-char with alpha).
  CONSTRAINT houses_color_hex_shape
    CHECK (color_hex ~* '^#[0-9a-f]{3}([0-9a-f]{3}([0-9a-f]{2})?)?$')
);

COMMENT ON TABLE core.houses IS
  'House-only fields per the clusters spec. 1:1 with core.scopes via scope_id. Fixed set of four; UI is view-only in Phase 2.';
COMMENT ON COLUMN core.houses.color IS
  'Canonical color name (blue / yellow / green / red). Members reference their house by scope_id; color is a display attribute here.';
COMMENT ON COLUMN core.houses.color_hex IS
  'Precise CSS color for accents/badges in the UI. #RGB / #RRGGBB / #RRGGBBAA.';
COMMENT ON COLUMN core.houses.metadata IS
  'Free-form house attributes not yet promoted to typed columns (motto, patron, crest_asset). Read-only in Phase 2.';

CREATE TRIGGER houses_set_updated_at
  BEFORE UPDATE ON core.houses
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

-------------------------------------------------------------------------------
-- 2. Index — sort_order for list rendering
-------------------------------------------------------------------------------

CREATE INDEX houses_sort_order_idx ON core.houses (sort_order);

-------------------------------------------------------------------------------
-- 3. RLS — open SELECT for authenticated (same policy as core.scopes)
-------------------------------------------------------------------------------
-- Houses are reference/roster data; anyone signed in should be able to
-- see the four houses. Writes go through Edge Functions later; for now
-- no INSERT/UPDATE/DELETE policies means only service_role can mutate.

ALTER TABLE core.houses ENABLE ROW LEVEL SECURITY;

CREATE POLICY houses_select_authenticated ON core.houses
  FOR SELECT TO authenticated
  USING (TRUE);

GRANT SELECT ON core.houses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.houses TO service_role;
