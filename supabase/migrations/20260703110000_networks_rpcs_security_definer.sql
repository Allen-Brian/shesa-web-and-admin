-- Migration: networks_rpcs_security_definer
--
-- `core.create_network` and `core.update_network` were defined as
-- SECURITY INVOKER by default (M7 / M8), so their INSERT/UPDATE on
-- `core.scopes` and `core.networks` runs as the caller's role —
-- `authenticated`. That role has no write privileges on either table
-- (writes are gated by Edge Functions + RLS elsewhere), and the RPC
-- immediately trips 42501 "permission denied for table scopes".
--
-- The fix is the same pattern `core.has_permission` uses: SECURITY
-- DEFINER + pinned `search_path`. Authorization is enforced by the
-- calling Edge Function's `authorize()` check BEFORE the RPC runs;
-- once the caller has cleared that gate, the SQL fn does the work
-- with owner privileges. `set search_path` to a known set prevents
-- the classic definer-privilege-escalation via schema shadowing.

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
SECURITY DEFINER
SET search_path = pg_catalog, core, public, auth
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
SECURITY DEFINER
SET search_path = pg_catalog, core, public, auth
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM core.scopes
    WHERE id = p_scope_id AND scope_type = 'network'
  ) THEN
    RAISE EXCEPTION 'network % not found', p_scope_id
      USING ERRCODE = '23503';
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

COMMENT ON FUNCTION core.create_network IS
  'Atomic scopes + networks insert. SECURITY DEFINER — the caller must have already cleared scope.create at Mainstream via the Edge Function''s authorize() check.';
COMMENT ON FUNCTION core.update_network IS
  'Atomic scopes + networks patch. SECURITY DEFINER — the caller must have already cleared scope.update at the network via the Edge Function''s authorize() check.';

-- Re-grant EXECUTE (CREATE OR REPLACE preserves them, but making it
-- explicit here means the grant is visible in-migration + future
-- readers know the surface).
REVOKE ALL ON FUNCTION core.create_network(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION core.update_network(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, core.scope_status) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION core.create_network(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, JSONB) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION core.update_network(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, core.scope_status) TO authenticated, service_role;
