-- Migration: finance_fapshi_reconcile_cron
--
-- Schedules the fapshi/reconcile edge function on a 2-minute cadence.
-- Fapshi's webhook fires exactly once with no retries; the reconcile
-- sweep exists so a dropped webhook still lands the intent in a
-- terminal state within a few minutes.
--
-- The cron statement reads its URL + shared secret from database GUCs,
-- so this migration is env-agnostic. Set them per env with:
--
--   ALTER DATABASE postgres
--     SET app.fapshi_reconcile_url = 'https://<project>.supabase.co/functions/v1/fapshi/reconcile';
--   ALTER DATABASE postgres
--     SET app.fapshi_reconcile_secret = '<same value as FAPSHI_RECONCILE_SECRET>';
--
-- Until both are set, the cron statement is a no-op via the WHERE
-- clause — safe to leave unconfigured until Fapshi credentials land.
--
-- Requires pg_net for outbound HTTP + pg_cron for scheduling. Both
-- ship with Supabase; if either is missing we skip with a NOTICE
-- (same pattern as generate_obligations_hourly).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron not installed; skipping fapshi-reconcile schedule.';
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE NOTICE 'pg_net not installed; skipping fapshi-reconcile schedule.';
    RETURN;
  END IF;

  -- Idempotent: drop any previous job with the same name.
  PERFORM cron.unschedule('fapshi-reconcile-every-2min')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'fapshi-reconcile-every-2min');

  -- Cron statement: fires every 2 minutes. Wrap the http_post in a DO
  -- block with an IF guard so PG never eagerly evaluates the fetch when
  -- either GUC is unset (a WHERE clause is unsafe here — the function
  -- call in SELECT can be evaluated before WHERE filters).
  PERFORM cron.schedule(
    'fapshi-reconcile-every-2min',
    '*/2 * * * *',
    $CRON$
      DO $inner$
      BEGIN
        IF current_setting('app.fapshi_reconcile_url',    true) IS NOT NULL
           AND current_setting('app.fapshi_reconcile_secret', true) IS NOT NULL THEN
          PERFORM net.http_post(
            url     := current_setting('app.fapshi_reconcile_url', true),
            headers := jsonb_build_object(
                         'content-type',       'application/json',
                         'x-reconcile-secret', current_setting('app.fapshi_reconcile_secret', true)
                       ),
            body    := '{}'::jsonb,
            timeout_milliseconds := 25000
          );
        END IF;
      END
      $inner$;
    $CRON$
  );
END $$;

-- Guarded like the schedule above: COMMENT ON EXTENSION is not a
-- no-op when the extension is absent, it errors (42704) and takes the
-- whole migration down with it — which is exactly what happened on a
-- project where pg_cron had not been enabled yet.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    EXECUTE $c$
      COMMENT ON EXTENSION pg_cron IS
        'Scheduled jobs. See job `fapshi-reconcile-every-2min` (finance) + `finance-generate-obligations-hourly` (finance).'
    $c$;
  END IF;
END $$;
