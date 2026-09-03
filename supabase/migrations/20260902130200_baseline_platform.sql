-- Baseline 3/3 — platform objects outside the application schemas
--
-- Part of the 2026-09-02 squash. Everything here lives in a schema the
-- schema baseline cannot carry (`pgmq`, `storage`, `cron`), or is imperative
-- rather than declarative, so it is expressed as statements instead.
--
--   1. pgmq queues + grants
--   2. Storage buckets + their storage.objects policies
--   3. Scheduled jobs
--
-- Every block is guarded: pgmq and pg_cron are not available on every
-- project, and an unguarded reference takes the whole migration down.

-------------------------------------------------------------------------------
-- 1. pgmq queues
-------------------------------------------------------------------------------
-- Four queues (ADR-0008): the dispatch fan-in, the two per-channel senders,
-- and a background lane for audit work.
--
-- Access is service_role only, and even that goes through the SECURITY
-- DEFINER wrappers in the `notifications` schema rather than direct calls —
-- pgmq is deliberately NOT a PostgREST-exposed schema, so a wrapper is the
-- only way to reach it from an Edge Function.

DO $$
DECLARE
  q_name  text;
  rel     text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgmq') THEN
    RAISE NOTICE 'pgmq not installed; skipping queue creation.';
    RETURN;
  END IF;

  FOREACH q_name IN ARRAY
    ARRAY['notification_dispatch', 'email_send', 'sms_send', 'audit_background']
  LOOP
    -- `supabase db reset --linked` drops the application schemas but leaves
    -- `pgmq` standing, and it does not leave it whole. On the 2026-09-03
    -- cutover it emptied `pgmq.meta` and dropped the queues' sequences while
    -- the `q_*` and `a_*` tables survived. `pgmq.create()` then finds its
    -- table already there, skips creating it, and dies on
    -- `ALTER EXTENSION pgmq ADD SEQUENCE pgmq.q_<name>_msg_id_seq` — a
    -- sequence that no longer exists — taking the whole migration with it.
    --
    -- A queue absent from `pgmq.meta` is not a queue, whatever tables are
    -- lying around, so clear the wreckage before creating it. The tables
    -- dropped here are empty by construction: pgmq cannot read or write a
    -- queue it has no meta row for.
    --
    -- The tables may still be extension members, in which case DROP TABLE is
    -- refused outright, so they are released from the extension first. That
    -- release is attempted per-relation and its failure ignored, because
    -- "not a member" is the normal case and is not an error worth stopping
    -- a baseline for.
    IF NOT EXISTS (SELECT 1 FROM pgmq.meta m WHERE m.queue_name = q_name) THEN
      FOREACH rel IN ARRAY ARRAY['q_' || q_name, 'a_' || q_name]
      LOOP
        IF EXISTS (
          SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'pgmq' AND c.relname = rel
        ) THEN
          BEGIN
            EXECUTE format('ALTER EXTENSION pgmq DROP TABLE pgmq.%I', rel);
          EXCEPTION
            WHEN OTHERS THEN NULL;
          END;
          BEGIN
            EXECUTE format('ALTER EXTENSION pgmq DROP SEQUENCE pgmq.%I', rel || '_msg_id_seq');
          EXCEPTION
            WHEN OTHERS THEN NULL;
          END;
          EXECUTE format('DROP TABLE IF EXISTS pgmq.%I CASCADE', rel);
        END IF;
      END LOOP;
    END IF;

    PERFORM pgmq.create(q_name);
  END LOOP;

  REVOKE ALL ON ALL FUNCTIONS IN SCHEMA pgmq FROM PUBLIC;
  GRANT USAGE ON SCHEMA pgmq TO service_role;
  GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pgmq TO service_role;
  GRANT SELECT ON ALL TABLES IN SCHEMA pgmq TO service_role;
END $$;

-------------------------------------------------------------------------------
-- 2. Storage buckets
-------------------------------------------------------------------------------
-- Privacy model:
--   PUBLIC  — anyone may SELECT the object row and fetch via the CDN URL.
--             Writes are service_role only; uploads go through a Server
--             Action that authorizes the caller first (`cms.edit`, or
--             `event.create` for event adverts).
--   PRIVATE — no SELECT policy at all. Access is via signed URLs, which
--             bypass RLS through the Storage service.
--
-- No bucket grants anon or authenticated a direct write. `cms-audio` used to
-- (SEC-06) — any account with a login could replace or destroy the published
-- song catalogue through the Storage API — and `supabase/tests/
-- security_hardening.test.sql` now asserts no bucket ever does again.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('public-gallery',       'public-gallery',       TRUE,   10485760, ARRAY['image/jpeg','image/png','image/webp','image/avif']),
  ('cms-media',            'cms-media',            TRUE,   10485760, ARRAY['image/jpeg','image/png','image/webp','image/avif','image/svg+xml']),
  ('cms-audio',            'cms-audio',            TRUE,   52428800, NULL),
  ('echoes-audio',         'echoes-audio',         TRUE,   52428800, ARRAY['audio/mpeg','audio/mp4','audio/wav','audio/ogg']),
  ('event-advert-images',  'event-advert-images',  TRUE,    5242880, ARRAY['image/jpeg','image/png','image/webp','image/avif']),
  ('member-imports',       'member-imports',       FALSE,  10485760, ARRAY['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-excel','text/csv','text/plain','application/csv','application/octet-stream']),
  ('member-documents',     'member-documents',     FALSE,  10485760, ARRAY['application/pdf','image/jpeg','image/png']),
  ('receipts',             'receipts',             FALSE,   5242880, ARRAY['application/pdf']),
  ('private-stream-assets','private-stream-assets',FALSE, 524288000, ARRAY['video/mp4','audio/mpeg','audio/mp4'])
ON CONFLICT (id) DO NOTHING;

-- Public buckets: anyone may read the object row.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
                  AND policyname='storage_objects_public_buckets_select') THEN
    CREATE POLICY storage_objects_public_buckets_select ON storage.objects
      FOR SELECT TO anon, authenticated
      USING (bucket_id IN ('public-gallery', 'cms-media', 'echoes-audio'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
                  AND policyname='storage_objects_event_advert_images_select') THEN
    CREATE POLICY storage_objects_event_advert_images_select ON storage.objects
      FOR SELECT TO anon, authenticated
      USING (bucket_id = 'event-advert-images');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
                  AND policyname='cms_audio_public_read') THEN
    CREATE POLICY cms_audio_public_read ON storage.objects
      FOR SELECT TO anon, authenticated
      USING (bucket_id = 'cms-audio');
  END IF;

  -- The one deliberate end-user write path: an importer uploads their own
  -- spreadsheet into member-imports, scoped to a folder they administer.
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
                  AND policyname='storage_objects_member_imports_insert') THEN
    CREATE POLICY storage_objects_member_imports_insert ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'member-imports'
        AND core.has_permission_at_any_scope(auth.uid(), 'member.import')
      );
  END IF;
END $$;

-- Private buckets get no SELECT policy: default-deny, signed URLs only.

-------------------------------------------------------------------------------
-- 3. Scheduled jobs
-------------------------------------------------------------------------------
-- Guarded on pg_cron. Job bodies that reach the network additionally guard on
-- their GUCs being set, so an unconfigured environment is inert rather than
-- noisy.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron not installed; skipping scheduled jobs.';
    RETURN;
  END IF;

  -- 3a. Hourly obligation generation over every active recurring charge.
  PERFORM cron.unschedule('finance-generate-obligations-hourly')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'finance-generate-obligations-hourly');
  PERFORM cron.schedule(
    'finance-generate-obligations-hourly',
    '0 * * * *',
    $CRON$ SELECT finance.generate_obligations_sweep(); $CRON$
  );

  -- 3b. Daily prune of the public-form rate-limit counters.
  PERFORM cron.unschedule('cms-prune-submission-throttle-daily')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cms-prune-submission-throttle-daily');
  PERFORM cron.schedule(
    'cms-prune-submission-throttle-daily',
    '17 3 * * *',
    $CRON$ SELECT cms.prune_submission_throttle(86400) $CRON$
  );

  -- 3c. Notification pipeline.
  --
  -- Nothing drove these consumers before, which is part of why the pipeline
  -- being completely broken went unnoticed for months. They need pg_net plus
  -- two GUCs; until those are set each job is a no-op rather than an error:
  --
  --   ALTER DATABASE postgres SET app.functions_base_url =
  --     'https://<project>.supabase.co/functions/v1';
  --   ALTER DATABASE postgres SET app.notifications_worker_secret =
  --     '<same value as NOTIFICATIONS_WORKER_SECRET>';
  --
  -- The secret is what the handlers check (SEC-07): `verify_jwt` is a
  -- signature check, not authorization, and the anon key is a valid project
  -- JWT — so without the header these endpoints are effectively public.
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    PERFORM cron.unschedule('notifications-dispatch-every-minute')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notifications-dispatch-every-minute');
    PERFORM cron.schedule(
      'notifications-dispatch-every-minute',
      '* * * * *',
      $CRON$
        DO $inner$
        DECLARE
          v_base   TEXT := current_setting('app.functions_base_url', true);
          v_secret TEXT := current_setting('app.notifications_worker_secret', true);
          v_action TEXT;
        BEGIN
          IF v_base IS NULL OR v_secret IS NULL THEN RETURN; END IF;
          FOREACH v_action IN ARRAY ARRAY['dispatch-notifications','send-email','send-sms-stub'] LOOP
            PERFORM net.http_post(
              url     := v_base || '/notifications/' || v_action,
              headers := jsonb_build_object(
                           'content-type',     'application/json',
                           'x-worker-secret',  v_secret
                         ),
              body    := '{}'::jsonb,
              timeout_milliseconds := 20000
            );
          END LOOP;
        END
        $inner$;
      $CRON$
    );
  ELSE
    RAISE NOTICE 'pg_net not installed; notification consumers will not be scheduled.';
  END IF;
END $$;
