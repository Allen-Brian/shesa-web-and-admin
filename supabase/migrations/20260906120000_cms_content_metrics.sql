-- Views and likes for public content.
--
-- Four surfaces want the same two numbers — news articles, events, gallery
-- albums, and songs — so this is one pair of tables keyed by (kind, id)
-- rather than four pairs of columns. A fifth surface later is one value in
-- a CHECK, not another migration per table.
--
-- Counts live apart from the content itself on purpose. `cms.articles` and
-- friends are editor-owned rows with their own RLS; a view counter that
-- anonymous visitors increment has no business being a column on them,
-- because granting the write would grant it to the whole row.
--
-- Identity is a visitor id the browser generates and keeps in localStorage,
-- not the caller's IP address. Deliberately:
--
--   * An IP is shared. Carrier-grade NAT puts whole mobile networks behind
--     a handful of addresses, and an office or a campus behind one — a
--     school reading an article would count as a single view.
--   * An IP is not stable. The same phone changes address moving between
--     wifi and data, so one reader becomes several.
--   * An IP is personal data under most privacy regimes; a random string
--     the browser made up about itself is not.
--
-- So both counters key off the visitor id: a view is recorded once per
-- visitor per item forever, and a like is one row per visitor per item.
-- The honest limit is that clearing storage yields a new identity. That
-- is true of every unauthenticated counter on the web, and the alternative
-- is accounts, which the public site does not have.

-------------------------------------------------------------------------------
-- 1. Tables
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cms.content_metrics (
  kind        text        NOT NULL,
  entity_id   uuid        NOT NULL,
  views       bigint      NOT NULL DEFAULT 0,
  likes       bigint      NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, entity_id),
  CONSTRAINT content_metrics_kind_check
    CHECK (kind = ANY (ARRAY['article'::text, 'event'::text, 'album'::text, 'song'::text])),
  CONSTRAINT content_metrics_non_negative CHECK (views >= 0 AND likes >= 0)
);

COMMENT ON TABLE cms.content_metrics IS
  'View and like counts for public content, keyed by (kind, entity_id). Written only through the SECURITY DEFINER functions below.';

-- One row per visitor per item: the primary key is what makes a like
-- idempotent, and what lets toggling off be a plain DELETE.
CREATE TABLE IF NOT EXISTS cms.content_likes (
  kind        text        NOT NULL,
  entity_id   uuid        NOT NULL,
  visitor_id  text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, entity_id, visitor_id),
  CONSTRAINT content_likes_kind_check
    CHECK (kind = ANY (ARRAY['article'::text, 'event'::text, 'album'::text, 'song'::text])),
  -- Long enough for a UUID, short enough that the column cannot be used
  -- as free storage by anyone calling the function directly.
  CONSTRAINT content_likes_visitor_len CHECK (length(visitor_id) BETWEEN 8 AND 64)
);

COMMENT ON TABLE cms.content_likes IS
  'One row per browser per liked item. visitor_id is a client-generated identifier, not an authenticated user.';

CREATE INDEX IF NOT EXISTS content_likes_visitor_idx
  ON cms.content_likes (visitor_id, kind);

-- One row the first time a visitor opens an item, and never again. This is
-- what makes `views` a count of people rather than a count of page loads;
-- the alternative, incrementing on every request, turns one enthusiast
-- with a back button into a hundred readers.
CREATE TABLE IF NOT EXISTS cms.content_views (
  kind          text        NOT NULL,
  entity_id     uuid        NOT NULL,
  visitor_id    text        NOT NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (kind, entity_id, visitor_id),
  CONSTRAINT content_views_kind_check
    CHECK (kind = ANY (ARRAY['article'::text, 'event'::text, 'album'::text, 'song'::text])),
  CONSTRAINT content_views_visitor_len CHECK (length(visitor_id) BETWEEN 8 AND 64)
);

COMMENT ON TABLE cms.content_views IS
  'One row per browser per item, written the first time it is opened. Makes views unique rather than cumulative.';

-------------------------------------------------------------------------------
-- 2. RLS
-------------------------------------------------------------------------------
-- Counts are public knowledge — they are rendered on the page. Who liked
-- or read what is not, so `content_likes` and `content_views` have no
-- policy at all and are reachable only through the definer functions.

ALTER TABLE cms.content_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms.content_likes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE cms.content_views   ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'cms' AND tablename = 'content_metrics'
       AND policyname = 'content_metrics_public_read'
  ) THEN
    CREATE POLICY content_metrics_public_read ON cms.content_metrics
      FOR SELECT TO anon, authenticated USING (true);
  END IF;
END $$;

GRANT SELECT ON cms.content_metrics TO anon, authenticated;

-------------------------------------------------------------------------------
-- 3. Functions
-------------------------------------------------------------------------------

-- Record a view, once per visitor per item.
--
-- Returns the new total. A visitor who has been here before gets the
-- current number back and no increment, so the page can call this on
-- every open without inflating anything.
--
-- A null visitor id (storage disabled in the browser) still counts: an
-- uncountable reader is worse than a slightly generous number, and it
-- cannot be deduped by definition.
CREATE OR REPLACE FUNCTION cms.record_content_view(
  p_kind       text,
  p_entity_id  uuid,
  p_visitor_id text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = cms, public
AS $$
DECLARE
  v_first  boolean := true;
  v_views  bigint;
BEGIN
  IF p_visitor_id IS NOT NULL AND length(p_visitor_id) BETWEEN 8 AND 64 THEN
    INSERT INTO cms.content_views (kind, entity_id, visitor_id)
         VALUES (p_kind, p_entity_id, p_visitor_id)
    ON CONFLICT DO NOTHING;

    -- No row inserted means this browser has already been counted.
    v_first := FOUND;
  END IF;

  IF NOT v_first THEN
    SELECT COALESCE(views, 0) INTO v_views
      FROM cms.content_metrics
     WHERE kind = p_kind AND entity_id = p_entity_id;
    RETURN COALESCE(v_views, 0);
  END IF;

  INSERT INTO cms.content_metrics (kind, entity_id, views)
       VALUES (p_kind, p_entity_id, 1)
  ON CONFLICT (kind, entity_id)
    DO UPDATE SET views = cms.content_metrics.views + 1, updated_at = now()
  RETURNING views INTO v_views;

  RETURN v_views;
END;
$$;

REVOKE ALL ON FUNCTION cms.record_content_view(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cms.record_content_view(text, uuid, text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION cms.record_content_view IS
  'Count one visitor''s first view of an item and return the new total. Repeat opens by the same browser return the current count unchanged.';

-- Like or unlike, in one call. Returns both the resulting state and the
-- new total, which is everything the button needs to re-render.
CREATE OR REPLACE FUNCTION cms.toggle_content_like(
  p_kind      text,
  p_entity_id uuid,
  p_visitor_id text
)
RETURNS TABLE (liked boolean, likes bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = cms, public
AS $$
DECLARE
  v_deleted int;
  v_liked   boolean;
  v_likes   bigint;
BEGIN
  DELETE FROM cms.content_likes
   WHERE kind = p_kind AND entity_id = p_entity_id AND visitor_id = p_visitor_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted = 0 THEN
    INSERT INTO cms.content_likes (kind, entity_id, visitor_id)
         VALUES (p_kind, p_entity_id, p_visitor_id)
    ON CONFLICT DO NOTHING;
    v_liked := true;
  ELSE
    v_liked := false;
  END IF;

  -- Counted from the rows rather than kept as a running total, so the
  -- number cannot drift away from the truth after a retry or a race.
  SELECT count(*) INTO v_likes
    FROM cms.content_likes
   WHERE kind = p_kind AND entity_id = p_entity_id;

  INSERT INTO cms.content_metrics (kind, entity_id, likes)
       VALUES (p_kind, p_entity_id, v_likes)
  ON CONFLICT (kind, entity_id)
    DO UPDATE SET likes = EXCLUDED.likes, updated_at = now();

  RETURN QUERY SELECT v_liked, v_likes;
END;
$$;

REVOKE ALL ON FUNCTION cms.toggle_content_like(text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cms.toggle_content_like(text, uuid, text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION cms.toggle_content_like IS
  'Toggle one visitor''s like on one item. Returns the resulting state and the recounted total.';

-- Counts for a set of items, plus whether this visitor has liked each.
-- One call per listing page rather than one per card.
CREATE OR REPLACE FUNCTION cms.get_content_metrics(
  p_kind       text,
  p_entity_ids uuid[],
  p_visitor_id text DEFAULT NULL
)
RETURNS TABLE (entity_id uuid, views bigint, likes bigint, liked boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = cms, public
AS $$
  SELECT
    id                                   AS entity_id,
    COALESCE(m.views, 0)                 AS views,
    COALESCE(m.likes, 0)                 AS likes,
    (l.visitor_id IS NOT NULL)           AS liked
  FROM unnest(p_entity_ids) AS id
  LEFT JOIN cms.content_metrics m
    ON m.kind = p_kind AND m.entity_id = id
  LEFT JOIN cms.content_likes l
    ON l.kind = p_kind AND l.entity_id = id
   AND p_visitor_id IS NOT NULL AND l.visitor_id = p_visitor_id;
$$;

REVOKE ALL ON FUNCTION cms.get_content_metrics(text, uuid[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cms.get_content_metrics(text, uuid[], text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION cms.get_content_metrics IS
  'Views, likes, and this visitor''s like state for a set of items of one kind. Missing rows read as zero, so an item nobody has opened needs no row.';
