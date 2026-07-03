-- Migration: create_core_networks
--
-- Networks detail table — the second cluster shipping the Option-1
-- two-table model (planning conversation 2026-07-02). Structure mirrors
-- core.houses: 1:1 with core.scopes via scope_id, only network-specific
-- fields land here.
--
-- Network invariants per spec:
--   - Global + Mainstream-owned (parent is always Mainstream — enforced
--     at the app layer, not by DB; the scope-validation shared helper
--     already blocks other parent types).
--   - Attribute-based, not joined: members carry `network_scope_id`,
--     there is no `core.memberships` row against a network.
--   - No geography, no currency, no registration — the shared columns
--     that would carry those on branches/chapters stay unused for
--     networks (currency_code defaults to 'XAF' and is ignored).
--   - Two display names: `scopes.name` for formal headers ("Shesa
--     Legal"), `networks.short_name` for chips/columns ("Legal").
--
-- Detail fields:
--   - `short_name` — case-insensitive UNIQUE. Compact label used in
--     chips + filter dropdowns + roster columns.
--   - `description` — free text.
--   - `icon` — a lucide-react key (e.g. "Scale", "Stethoscope"). Stored
--     as text; the UI dereferences dynamically. Invalid keys render a
--     placeholder — no server-side allow-list.
--   - `color_hex` — CSS #RGB / #RRGGBB / #RRGGBBAA. Nullable; UI falls
--     back to a neutral accent when unset.
--   - `sort_order` — display order across every network dropdown /
--     list.
--   - `metadata` — cosmetic fields not yet promoted to typed columns.
--
-- Notably ABSENT:
--   - `is_default` is not defined. The "Other" safety-net network was
--     removed 2026-07-02; every seeded network is a real profession
--     and imports without a network fail (member.network_scope_id is
--     NOT NULL). If a default-pick UX is ever wanted, add the column
--     via a follow-up migration rather than baking it in speculatively.

-------------------------------------------------------------------------------
-- 1. Table
-------------------------------------------------------------------------------

CREATE TABLE core.networks (
  scope_id     UUID PRIMARY KEY REFERENCES core.scopes(id) ON DELETE CASCADE,
  short_name   TEXT NOT NULL,
  description  TEXT,
  icon         TEXT,
  color_hex    TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Shape guard on hex — same predicate used by core.houses.
  CONSTRAINT networks_color_hex_shape
    CHECK (color_hex IS NULL OR color_hex ~* '^#[0-9a-f]{3}([0-9a-f]{3}([0-9a-f]{2})?)?$'),

  -- Short name has a length ceiling to keep chips tidy.
  CONSTRAINT networks_short_name_len
    CHECK (char_length(short_name) BETWEEN 1 AND 40)
);

COMMENT ON TABLE core.networks IS
  'Network-only fields. 1:1 with core.scopes via scope_id. Every seeded row + Mainstream-created network has a companion row here.';
COMMENT ON COLUMN core.networks.short_name IS
  'Compact label ("Legal" for "Shesa Legal") used in chips / dropdowns / roster columns. Case-insensitive UNIQUE.';
COMMENT ON COLUMN core.networks.icon IS
  'lucide-react key (e.g. "Scale"). UI looks the component up dynamically; invalid keys render a neutral placeholder.';

CREATE TRIGGER networks_set_updated_at
  BEFORE UPDATE ON core.networks
  FOR EACH ROW EXECUTE FUNCTION core.set_updated_at();

-------------------------------------------------------------------------------
-- 2. Indexes
-------------------------------------------------------------------------------

-- Case-insensitive uniqueness on short_name — "Legal" can only apply to
-- one network. Postgres UNIQUE on LOWER(x) achieves this.
CREATE UNIQUE INDEX networks_short_name_ci_unique
  ON core.networks (LOWER(short_name));

-- Sort order drives every list rendering.
CREATE INDEX networks_sort_order_idx
  ON core.networks (sort_order);

-------------------------------------------------------------------------------
-- 3. RLS — same open-SELECT pattern as core.scopes / core.houses
-------------------------------------------------------------------------------

ALTER TABLE core.networks ENABLE ROW LEVEL SECURITY;

CREATE POLICY networks_select_authenticated ON core.networks
  FOR SELECT TO authenticated
  USING (TRUE);

GRANT SELECT ON core.networks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON core.networks TO service_role;

-------------------------------------------------------------------------------
-- 4. RPC: atomic create + update
-------------------------------------------------------------------------------
-- Two-table writes benefit from being a single call site so the Edge
-- Function stays thin and can't half-commit. Both fns run SECURITY
-- INVOKER — they inherit the caller's RLS / grants and rely on the
-- Edge Function's authorize() check to gate access.

CREATE OR REPLACE FUNCTION core.create_network(
  p_name        TEXT,
  p_slug        TEXT,
  p_short_name  TEXT,
  p_description TEXT,
  p_icon        TEXT,
  p_color_hex   TEXT,
  p_sort_order  INTEGER,
  p_metadata    JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_mainstream_id UUID;
  v_scope_id      UUID;
BEGIN
  SELECT id INTO v_mainstream_id FROM core.scopes WHERE scope_type = 'mainstream';
  IF v_mainstream_id IS NULL THEN
    RAISE EXCEPTION 'no mainstream scope found — seed has not run';
  END IF;

  INSERT INTO core.scopes (
    name, slug, scope_type, parent_scope_id, currency_code, metadata, created_by
  ) VALUES (
    p_name, p_slug, 'network', v_mainstream_id, 'XAF', p_metadata, auth.uid()
  )
  RETURNING id INTO v_scope_id;

  INSERT INTO core.networks (
    scope_id, short_name, description, icon, color_hex, sort_order
  ) VALUES (
    v_scope_id, p_short_name, p_description, p_icon, p_color_hex,
    COALESCE(p_sort_order, 0)
  );

  RETURN v_scope_id;
END;
$$;

COMMENT ON FUNCTION core.create_network IS
  'Atomic create for a network: scopes + networks rows in one transaction. Called from the create-network Edge Function via RPC.';

REVOKE ALL ON FUNCTION core.create_network(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core.create_network(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, JSONB) TO authenticated, service_role;


CREATE OR REPLACE FUNCTION core.update_network(
  p_scope_id    UUID,
  p_name        TEXT,
  p_short_name  TEXT,
  p_description TEXT,
  p_icon        TEXT,
  p_color_hex   TEXT,
  p_sort_order  INTEGER,
  p_status      core.scope_status
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_status core.scope_status;
  v_member_count   INTEGER;
BEGIN
  SELECT status INTO v_current_status
  FROM core.scopes
  WHERE id = p_scope_id AND scope_type = 'network';

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'network % not found', p_scope_id
      USING ERRCODE = '23503';
  END IF;

  -- Archive guard — refuse if any member still points at this network.
  IF p_status = 'archived' AND v_current_status <> 'archived' THEN
    SELECT COUNT(*) INTO v_member_count
    FROM core.members
    WHERE network_scope_id = p_scope_id;

    IF v_member_count > 0 THEN
      RAISE EXCEPTION 'cannot archive network with % member(s) still attached', v_member_count
        USING ERRCODE = '23514',
              HINT = 'Reassign these members to another network before archiving.';
    END IF;
  END IF;

  UPDATE core.scopes
     SET name   = COALESCE(p_name,   name),
         status = COALESCE(p_status, status)
   WHERE id = p_scope_id;

  UPDATE core.networks
     SET short_name  = COALESCE(p_short_name,  short_name),
         description = COALESCE(p_description, description),
         icon        = COALESCE(p_icon,        icon),
         color_hex   = COALESCE(p_color_hex,   color_hex),
         sort_order  = COALESCE(p_sort_order,  sort_order)
   WHERE scope_id = p_scope_id;
END;
$$;

COMMENT ON FUNCTION core.update_network IS
  'Atomic update for a network: patches both scopes + networks rows. Blocks status=archived transitions when members are still attached (per clusters spec).';

REVOKE ALL ON FUNCTION core.update_network(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, core.scope_status) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core.update_network(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, core.scope_status) TO authenticated, service_role;
