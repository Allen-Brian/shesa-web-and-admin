-- Migration: close_storage_and_throttle_public_forms
--
-- Two Phase-2 findings:
--
--   SEC-06 — `cms-audio` granted every authenticated user INSERT and
--            DELETE on every object in the bucket, with no owner and no
--            permission predicate. A database-level grant, so it held
--            regardless of what the Server Actions checked.
--
--   SEC-09 — the public AGM forms have no throttle. They are linked from
--            the homepage and take anonymous writes, so they are trivially
--            floodable.

BEGIN;

-------------------------------------------------------------------------------
-- 1. SEC-06 — remove the open cms-audio write/delete policies
-------------------------------------------------------------------------------
-- From 20260720500000_cms_songs_schema.sql:
--
--   CREATE POLICY cms_audio_authed_write ON storage.objects
--     FOR INSERT TO authenticated WITH CHECK (bucket_id = 'cms-audio');
--   CREATE POLICY cms_audio_authed_delete ON storage.objects
--     FOR DELETE TO authenticated USING (bucket_id = 'cms-audio');
--
-- Any account with a login could therefore replace or destroy the entire
-- published song catalogue straight through the Storage API. The
-- migration's own comment said the real check "lives in the server
-- action" — but the policy did not implement that, and a DB grant is not
-- something an application-layer check can take back.
--
-- Dropping them breaks nothing: uploads and deletes flow through Server
-- Actions on the service-role client, which bypasses RLS entirely. Every
-- other public bucket already keeps writes to service_role only; this
-- brings cms-audio in line.

DROP POLICY IF EXISTS cms_audio_authed_write  ON storage.objects;
DROP POLICY IF EXISTS cms_audio_authed_delete ON storage.objects;

-- Public read stays — the song catalogue is public content.
-- (cms_audio_public_read is untouched.)

-------------------------------------------------------------------------------
-- 2. SEC-09 — throttle for anonymous public submissions
-------------------------------------------------------------------------------
-- Counting happens against a caller-supplied bucket key rather than an
-- IP read from the database session, because the database never sees the
-- visitor: submissions arrive via a Next.js Server Action, so the session
-- IP is the app server's. The Server Action reads the real client IP from
-- its request headers and passes a hash of it.
--
-- A hash, not the address itself: this table would otherwise become a log
-- of who visited the site from where, which is more PII than a rate
-- limiter needs to hold.

CREATE TABLE cms.submission_throttle (
  bucket_key    TEXT PRIMARY KEY,
  window_start  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hit_count     INTEGER     NOT NULL DEFAULT 0 CHECK (hit_count >= 0),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX submission_throttle_window_idx ON cms.submission_throttle (window_start);

COMMENT ON TABLE cms.submission_throttle IS
  'Fixed-window rate-limit counters for anonymous public forms. bucket_key is opaque and caller-supplied (a salted hash of the client IP plus the form name) — never a raw address.';

ALTER TABLE cms.submission_throttle ENABLE ROW LEVEL SECURITY;
-- No policies at all. The only access path is the SECURITY DEFINER
-- function below; nothing reads this table directly.

REVOKE ALL ON cms.submission_throttle FROM anon;
REVOKE ALL ON cms.submission_throttle FROM authenticated;
GRANT ALL ON cms.submission_throttle TO service_role;

-------------------------------------------------------------------------------
-- 3. consume_submission_slot — atomic take-a-slot
-------------------------------------------------------------------------------
-- Returns TRUE when the caller may proceed, FALSE when the window is
-- exhausted. The INSERT ... ON CONFLICT DO UPDATE is a single statement,
-- so concurrent callers serialise on the row lock and cannot both slip
-- past the limit.

CREATE OR REPLACE FUNCTION cms.consume_submission_slot(
  p_bucket_key      TEXT,
  p_limit           INTEGER DEFAULT 5,
  p_window_seconds  INTEGER DEFAULT 3600
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, cms, public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_bucket_key IS NULL OR length(p_bucket_key) = 0 THEN
    -- No key means we cannot attribute the request. Fail closed.
    RETURN FALSE;
  END IF;
  IF p_limit <= 0 OR p_window_seconds <= 0 THEN
    RAISE EXCEPTION 'limit and window must be positive' USING ERRCODE = '22023';
  END IF;

  INSERT INTO cms.submission_throttle AS t (bucket_key, window_start, hit_count, updated_at)
  VALUES (p_bucket_key, NOW(), 1, NOW())
  ON CONFLICT (bucket_key) DO UPDATE
    SET
      -- Window expired → start a fresh one at 1. Otherwise increment.
      window_start = CASE
        WHEN t.window_start < NOW() - make_interval(secs => p_window_seconds)
          THEN NOW()
        ELSE t.window_start
      END,
      hit_count = CASE
        WHEN t.window_start < NOW() - make_interval(secs => p_window_seconds)
          THEN 1
        ELSE t.hit_count + 1
      END,
      updated_at = NOW()
  RETURNING t.hit_count INTO v_count;

  RETURN v_count <= p_limit;
END;
$$;

REVOKE ALL ON FUNCTION cms.consume_submission_slot(TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cms.consume_submission_slot(TEXT, INTEGER, INTEGER)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION cms.consume_submission_slot IS
  'Atomically consumes one slot in a fixed window. TRUE = proceed, FALSE = rate limited. Fails closed on a missing key.';

-------------------------------------------------------------------------------
-- 4. Reaper — keep the counter table from growing without bound
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION cms.prune_submission_throttle(
  p_older_than_seconds INTEGER DEFAULT 86400
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, cms, public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM cms.submission_throttle
   WHERE window_start < NOW() - make_interval(secs => p_older_than_seconds);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION cms.prune_submission_throttle(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cms.prune_submission_throttle(INTEGER) TO service_role;

-- Daily prune. Guarded — pg_cron is not installed everywhere, and an
-- unguarded reference takes the whole migration down (see 20260725100200
-- for the incident that established this pattern).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('cms-prune-submission-throttle-daily')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cms-prune-submission-throttle-daily');
    PERFORM cron.schedule(
      'cms-prune-submission-throttle-daily',
      '17 3 * * *',
      $CRON$ SELECT cms.prune_submission_throttle(86400) $CRON$
    );
  ELSE
    RAISE NOTICE 'pg_cron not installed; skipping submission-throttle prune schedule.';
  END IF;
END $$;

COMMIT;
