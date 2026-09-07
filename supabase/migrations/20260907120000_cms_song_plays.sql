-- Play counts for songs.
--
-- Views and plays answer different questions, which is why this is a third
-- number rather than a reinterpretation of an existing one:
--
--   * `views` counts *people* — one row per visitor per item, forever. It
--     is how many alumni have opened a song.
--   * `plays` counts *listens*. The same person playing the anthem every
--     morning is the signal, not noise to be deduplicated away, so this
--     one is deliberately cumulative: every press of play, every
--     auto-advance into a track, every replay.
--
-- That makes `plays` the only counter here that an anonymous caller can
-- move without limit. It is accepted rather than overlooked: it is a
-- popularity figure on a songbook, it is never summed into money or
-- permissions, and the alternative — deduplicating by visitor — would
-- make it a slower copy of `views`.
--
-- Existing songs are backfilled from their view count, so the number
-- starts from what we already know rather than resetting every song in
-- the archive to zero on the day the counter shipped. It understates a
-- song people have replayed, and it is the closest honest starting point
-- available; from here on it is counted properly.

-------------------------------------------------------------------------------
-- 1. Column
-------------------------------------------------------------------------------

ALTER TABLE cms.content_metrics
  ADD COLUMN IF NOT EXISTS plays bigint NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'content_metrics_plays_non_negative'
       AND conrelid = 'cms.content_metrics'::regclass
  ) THEN
    ALTER TABLE cms.content_metrics
      ADD CONSTRAINT content_metrics_plays_non_negative CHECK (plays >= 0);
  END IF;
END $$;

COMMENT ON COLUMN cms.content_metrics.plays IS
  'Cumulative playbacks. Unlike views this is not deduplicated by visitor: replays are the point. Songs only.';

-------------------------------------------------------------------------------
-- 2. Backfill
-------------------------------------------------------------------------------
-- Only where nothing has been counted yet, so re-running this migration
-- cannot overwrite real plays with a stale view count.

UPDATE cms.content_metrics
   SET plays = views
 WHERE kind = 'song'
   AND plays = 0
   AND views > 0;

-------------------------------------------------------------------------------
-- 3. Functions
-------------------------------------------------------------------------------

-- Count one playback. No visitor argument, because there is nothing to
-- deduplicate against — that is the whole difference from record_content_view.
--
-- Songs only. The other three kinds have no notion of a play, and a caller
-- passing one gets a clear refusal rather than a row in a column nothing
-- reads.
CREATE OR REPLACE FUNCTION cms.record_song_play(p_entity_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = cms, public
AS $$
DECLARE
  v_plays bigint;
BEGIN
  INSERT INTO cms.content_metrics (kind, entity_id, plays)
       VALUES ('song', p_entity_id, 1)
  ON CONFLICT (kind, entity_id)
    DO UPDATE SET plays = cms.content_metrics.plays + 1, updated_at = now()
  RETURNING plays INTO v_plays;

  RETURN v_plays;
END;
$$;

REVOKE ALL ON FUNCTION cms.record_song_play(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cms.record_song_play(uuid) TO anon, authenticated, service_role;

COMMENT ON FUNCTION cms.record_song_play IS
  'Count one playback of one song and return the new total. Deliberately not deduplicated: every play counts, including replays and auto-advances.';

-- `get_content_metrics` gains `plays`. Dropped rather than replaced because
-- the return type changes, which CREATE OR REPLACE cannot do.
DROP FUNCTION IF EXISTS cms.get_content_metrics(text, uuid[], text);

CREATE FUNCTION cms.get_content_metrics(
  p_kind       text,
  p_entity_ids uuid[],
  p_visitor_id text DEFAULT NULL
)
RETURNS TABLE (entity_id uuid, views bigint, likes bigint, plays bigint, liked boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = cms, public
AS $$
  SELECT
    id                                   AS entity_id,
    COALESCE(m.views, 0)                 AS views,
    COALESCE(m.likes, 0)                 AS likes,
    COALESCE(m.plays, 0)                 AS plays,
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
  'Views, likes, plays, and this visitor''s like state for a set of items of one kind. Missing rows read as zero, so an item nobody has opened needs no row.';
