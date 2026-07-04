-- Migration: create_exco_audience_resolver
--
-- Phase 2 — the shared Audience/Publishing engine's resolver core.
-- Given an audience definition (JSONB), returns the set of member
-- IDs that match. Used by Events (reminders + change-notifications),
-- Announcements (all delivery), and later Contributions targeting.
--
-- Full spec: docs/product/entities.md#shared-audience--publishing-engine
--
-------------------------------------------------------------------------------
-- The AudienceDefinition JSONB shape (validated at the Edge Function
-- layer via packages/domain/audience/):
-------------------------------------------------------------------------------
--
--   {
--     "version": 1,
--     "membership": { "mode": "all" }
--                    | { "mode": "specific", "scopeIds": [uuid, ...] },
--     "location":   { "mode": "all" }
--                    | { "mode": "specific",
--                        "countries": ["CM", ...],       -- ISO-2 codes (optional)
--                        "regions":   ["Centre", ...],   -- optional
--                        "cities":    ["Yaoundé", ...] }, -- optional
--     "houses":     { "mode": "all" } | { "mode": "specific", "scopeIds": [uuid, ...] },
--     "networks":   { "mode": "all" } | { "mode": "specific", "scopeIds": [uuid, ...] },
--     "batches":    { "mode": "all" } | { "mode": "specific", "scopeIds": [uuid, ...] }
--   }
--
-- Combination rules (locked in docs/product/entities.md):
--   * "All" drops out of the AND (no constraint on that dimension).
--   * Within a "specific" list — OR (matches any of the listed values).
--   * Across groups — AND (every group's predicate must be satisfied).
--   * For the Location group specifically: countries / regions / cities
--     are OR'd WITHIN the group (a country match OR a region match
--     OR a city match satisfies the location predicate).
--
-------------------------------------------------------------------------------
-- Location semantics
-------------------------------------------------------------------------------
-- A member's "location" is the CURRENT RESIDENCE captured on the
-- member row: core.members.current_country / current_region_state /
-- current_city. Not the branch/chapter geography — a Buea Branch
-- member who lives in Yaoundé should match "members in Yaoundé".
-- Members whose current-location fields are null match nothing (i.e.
-- they need a country/region/city on file to be findable this way).
--
-------------------------------------------------------------------------------
-- Security posture
-------------------------------------------------------------------------------
-- SECURITY INVOKER (default). EXECUTE is granted only to service_role;
-- authenticated cannot call the function. The Edge Functions that
-- invoke it (supabase/functions/audience/{resolve,count}.ts) use the
-- service-role client and enforce the actual authorization (must be
-- an admin at the calling scope) in-function per ADR-0033.
--
-- The membership_status filter is FIXED to 'active' for now. If future
-- product decisions need passive members in the resolver output (e.g.
-- re-engagement announcements), we add a status-filter parameter then.

-------------------------------------------------------------------------------
-- 1. Resolver — returns matching member IDs
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION exco.resolve_audience(def jsonb)
RETURNS TABLE(member_id uuid)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_membership_mode  text;
  v_membership_ids   uuid[];

  v_location_mode    text;
  v_location_countries text[];
  v_location_regions text[];
  v_location_cities  text[];

  v_houses_mode      text;
  v_houses_ids       uuid[];

  v_networks_mode    text;
  v_networks_ids     uuid[];

  v_batches_mode     text;
  v_batches_ids      uuid[];
BEGIN
  -- --- Extract + normalize the five group filters --------------------------

  v_membership_mode := COALESCE(def->'membership'->>'mode', 'all');
  v_membership_ids  := COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(def->'membership'->'scopeIds')::uuid),
    ARRAY[]::uuid[]
  );

  v_location_mode      := COALESCE(def->'location'->>'mode', 'all');
  v_location_countries := COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(def->'location'->'countries')),
    ARRAY[]::text[]
  );
  v_location_regions   := COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(def->'location'->'regions')),
    ARRAY[]::text[]
  );
  v_location_cities    := COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(def->'location'->'cities')),
    ARRAY[]::text[]
  );

  v_houses_mode := COALESCE(def->'houses'->>'mode', 'all');
  v_houses_ids  := COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(def->'houses'->'scopeIds')::uuid),
    ARRAY[]::uuid[]
  );

  v_networks_mode := COALESCE(def->'networks'->>'mode', 'all');
  v_networks_ids  := COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(def->'networks'->'scopeIds')::uuid),
    ARRAY[]::uuid[]
  );

  v_batches_mode := COALESCE(def->'batches'->>'mode', 'all');
  v_batches_ids  := COALESCE(
    ARRAY(SELECT jsonb_array_elements_text(def->'batches'->'scopeIds')::uuid),
    ARRAY[]::uuid[]
  );

  -- --- Mode-value sanity --------------------------------------------------

  IF v_membership_mode NOT IN ('all', 'specific')
     OR v_location_mode NOT IN ('all', 'specific')
     OR v_houses_mode NOT IN ('all', 'specific')
     OR v_networks_mode NOT IN ('all', 'specific')
     OR v_batches_mode NOT IN ('all', 'specific')
  THEN
    RAISE EXCEPTION 'exco.resolve_audience: mode must be "all" or "specific" for every group'
      USING ERRCODE = '22023';
  END IF;

  -- --- The query ----------------------------------------------------------
  --
  -- One pass across core.members. Each of the five groups contributes
  -- an AND-connected predicate; specific-mode groups activate a
  -- narrower condition, all-mode groups short-circuit to TRUE.
  --
  RETURN QUERY
  SELECT DISTINCT m.id
  FROM core.members m
  WHERE
    -- Baseline: member must have at least one active membership.
    -- Excludes 'left' / 'transferred' / 'pending' etc. — the deceased
    -- cascade closes memberships too. A member who has fully exited
    -- the org appears in no audience. If a future re-engagement
    -- feature needs 'passive' or 'left' members, add a status-filter
    -- parameter then; don't loosen this default.
    EXISTS (
      SELECT 1
      FROM core.memberships mb
      WHERE mb.member_id = m.id
        AND mb.membership_status = 'active'
    )

    -- Membership: does the member have an ACTIVE membership at any
    -- of the selected scope_ids?
    AND (
      v_membership_mode = 'all'
      OR EXISTS (
        SELECT 1
        FROM core.memberships ms
        WHERE ms.member_id = m.id
          AND ms.membership_status = 'active'
          AND ms.scope_id = ANY (v_membership_ids)
      )
    )

    -- Location: does the member's CURRENT RESIDENCE match country
    -- OR region OR city? OR-within-group per the spec. Uses the
    -- member-level current_* fields — a Buea branch member living
    -- in Yaoundé matches "members in Yaoundé". A member with no
    -- current-location fields matches nothing.
    AND (
      v_location_mode = 'all'
      OR (
        (cardinality(v_location_countries) > 0
          AND m.current_country = ANY (v_location_countries))
        OR (cardinality(v_location_regions) > 0
          AND m.current_region_state = ANY (v_location_regions))
        OR (cardinality(v_location_cities) > 0
          AND m.current_city = ANY (v_location_cities))
      )
    )

    -- Houses: attribute-based on the member row.
    AND (
      v_houses_mode = 'all'
      OR m.house_scope_id = ANY (v_houses_ids)
    )

    -- Networks: attribute-based.
    AND (
      v_networks_mode = 'all'
      OR m.network_scope_id = ANY (v_networks_ids)
    )

    -- Batches: attribute-based.
    AND (
      v_batches_mode = 'all'
      OR m.batch_scope_id = ANY (v_batches_ids)
    );
END;
$$;

COMMENT ON FUNCTION exco.resolve_audience(jsonb) IS
  'Given a shared-audience JSONB definition, returns the set of member IDs matching. Five-group AND-across / OR-within semantics. Used by announcements + events (Phase 2) and later contribution targeting. See docs/product/entities.md#shared-audience--publishing-engine.';

-------------------------------------------------------------------------------
-- 2. Count — the cheap live-preview endpoint
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION exco.count_audience(def jsonb)
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::int FROM exco.resolve_audience(def);
$$;

COMMENT ON FUNCTION exco.count_audience(jsonb) IS
  'Thin COUNT(*) wrapper on exco.resolve_audience. Backs the "reaches ~N members" live preview on the AudienceSelector UI. Cheap enough to run on every filter change.';

-------------------------------------------------------------------------------
-- 3. Grants
-------------------------------------------------------------------------------

-- Only service_role calls these. Edge Functions (audience/resolve,
-- audience/count) use the service-role client and enforce the actual
-- authorization (must be an admin at the calling scope) in-function
-- per ADR-0033.
--
-- NOT granted to authenticated: keeps the "leak member IDs at
-- arbitrary scopes" attack surface closed.
REVOKE ALL ON FUNCTION exco.resolve_audience(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION exco.count_audience(jsonb)   FROM PUBLIC;

GRANT EXECUTE ON FUNCTION exco.resolve_audience(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION exco.count_audience(jsonb)   TO service_role;
