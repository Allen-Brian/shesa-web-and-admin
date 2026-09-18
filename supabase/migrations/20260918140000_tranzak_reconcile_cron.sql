-- Schedule the Tranzak reconciliation sweep.
--
-- ─── The gap this closes ─────────────────────────────────────────────────
-- Settlement had two paths and both are things that *might* happen: the
-- payer's browser returning to the receipt page, and Tranzak's webhook.
--
-- On 2026-09-16 a payer paid 20,000 XAF by MTN Momo at 17:44:33 and never
-- returned to the site. The webhook did not settle it either. The intent
-- sat at `pending` for two days with the money already in the account, and
-- it surfaced only because a human noticed the dashboard was short — then
-- recorded it by hand, producing a payment row with no payer on it.
--
-- Nothing was looking. This makes something look, every five minutes. The
-- first real run also closed ten intents stuck at `pending` since early
-- September, whose gateway requests had FAILED days earlier with nothing
-- ever going back to ask.
--
-- ─── Three things this needs, each found the hard way ────────────────────
-- Written against what this project actually permits, not what the docs
-- assume. Every one of these was a silent failure first:
--
--   1. `pg_cron` was never installed here. A migration that merely guards
--      on the extension does nothing at all and reports success, which is
--      how the notification consumers have been dormant since they were
--      written. Installed explicitly below.
--
--   2. Configuration cannot live in `current_setting('app.*')`. That needs
--      `ALTER DATABASE postgres SET …`, and on hosted Supabase `postgres`
--      is not superuser:
--
--        ERROR: permission denied to set parameter "app.functions_base_url"
--
--      So it lives in Supabase Vault, which `postgres` may write. The GUCs
--      stay as a fallback for a local or self-hosted database.
--
--   3. The request must carry an `Authorization` header. `pg_net` sends
--      only what it is given, and the Functions gateway enforces
--      `verify_jwt` before a handler ever runs — a call with the right
--      worker secret and no JWT gets a 401 from the gateway, which looks
--      exactly like a wrong secret.
--
-- The anon key satisfies the gateway; the worker secret is the actual
-- authorization. That distinction matters: `verify_jwt` is a signature
-- check, and the public anon key is a valid project JWT, so the gateway
-- alone would leave this open to anyone — letting them make us issue
-- unbounded outbound `request/details` calls against our Tranzak quota.
--
-- ─── Configuring it ─────────────────────────────────────────────────────
--   SELECT vault.create_secret('<value>', '<name>', '<description>');
--   -- vault.update_secret(<id>, '<value>') to change one
--
--     functions_base_url        https://<project>.supabase.co/functions/v1
--     functions_anon_key        the project's anon key
--     tranzak_reconcile_secret  same value as the TRANZAK_RECONCILE_SECRET
--                               Edge Function secret
--
-- Any one missing leaves the job a no-op rather than an error, so an
-- unconfigured project does not fill its logs.

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron unavailable; Tranzak reconciliation will not be scheduled.';
    RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE NOTICE 'pg_net unavailable; Tranzak reconciliation will not be scheduled.';
    RETURN;
  END IF;

  PERFORM cron.unschedule('tranzak-reconcile-every-5min')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'tranzak-reconcile-every-5min');

  PERFORM cron.schedule(
    'tranzak-reconcile-every-5min',
    '*/5 * * * *',
    $CRON$
      DO $inner$
      DECLARE
        v_base   TEXT;
        v_anon   TEXT;
        v_secret TEXT;
      BEGIN
        SELECT decrypted_secret INTO v_base
          FROM vault.decrypted_secrets WHERE name = 'functions_base_url';
        SELECT decrypted_secret INTO v_anon
          FROM vault.decrypted_secrets WHERE name = 'functions_anon_key';
        SELECT decrypted_secret INTO v_secret
          FROM vault.decrypted_secrets WHERE name = 'tranzak_reconcile_secret';

        v_base   := COALESCE(v_base,   current_setting('app.functions_base_url', true));
        v_anon   := COALESCE(v_anon,   current_setting('app.functions_anon_key', true));
        v_secret := COALESCE(v_secret, current_setting('app.tranzak_reconcile_secret', true));

        IF v_base IS NULL OR v_anon IS NULL OR v_secret IS NULL THEN RETURN; END IF;

        PERFORM net.http_post(
          url     := v_base || '/payments/tranzak-reconcile',
          headers := jsonb_build_object(
                       'content-type',    'application/json',
                       -- Gets past the gateway's verify_jwt. Not the
                       -- authorization; the header below is.
                       'authorization',   'Bearer ' || v_anon,
                       'x-worker-secret', v_secret
                     ),
          body    := '{}'::jsonb,
          -- Generous: a sweep that finds work makes one gateway round trip
          -- per intent, sequentially. Nothing waits on the response.
          timeout_milliseconds := 60000
        );
      END
      $inner$;
    $CRON$
  );
END $$;
