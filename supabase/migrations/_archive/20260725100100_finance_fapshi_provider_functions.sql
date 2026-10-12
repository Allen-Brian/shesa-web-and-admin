-- Migration: finance_fapshi_provider (part 2 — RPCs)
--
-- Sibling to 20260725100000_finance_fapshi_provider.sql. Split because
-- Postgres refuses to USE a new enum value in the same transaction it
-- was ALTER TYPE-added; these RPCs reference the 'expired' status.
--
-- Public-facing anon RPCs (SECURITY DEFINER, granted to anon):
--   * initiate_public_ticket_intent  — AGM ticket + attire flow
--   * initiate_public_donation_intent — funding flow
--   * get_public_intent_status        — pending page polls by intent_id
--
-- Provider-side RPCs (SECURITY DEFINER, granted to service_role only):
--   * attach_fapshi_ref               — after Initiate Pay returns transId
--   * finalize_fapshi_intent          — SUCCESSFUL webhook / reconcile
--   * mark_fapshi_intent_terminal     — FAILED / EXPIRED webhook / reconcile
--   * list_pending_fapshi_intents_for_reconcile — the reconcile sweep
--
-- The public initiate RPCs deliberately mirror the existing
-- record_public_ticket_purchase / record_public_donation RPCs so the
-- finalize step produces a payment row indistinguishable from the
-- "marked cash" path — same metadata shape → same receipt renderer.

-------------------------------------------------------------------------------
-- 1. initiate_public_ticket_intent — AGM ticket / attire (anon)
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION finance.initiate_public_ticket_intent(
  p_charge_id       UUID,
  p_quantity        INTEGER,
  p_method          finance.payment_method,
  p_payer_name      TEXT DEFAULT NULL,
  p_payer_email     TEXT DEFAULT NULL,
  p_payer_phone     TEXT DEFAULT NULL,
  p_payer_location  TEXT DEFAULT NULL,
  p_metadata        JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  intent_id UUID,
  amount    NUMERIC(20, 4),
  currency  TEXT,
  scope_id  UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, finance, public
AS $$
DECLARE
  v_charge   finance.charges%ROWTYPE;
  v_amount   NUMERIC(20, 4);
  v_intent_id UUID;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'quantity must be positive' USING ERRCODE = '22023';
  END IF;
  IF p_payer_name IS NOT NULL AND length(p_payer_name) > 200 THEN
    RAISE EXCEPTION 'payer_name too long' USING ERRCODE = '22023';
  END IF;
  IF p_payer_email IS NOT NULL AND length(p_payer_email) > 320 THEN
    RAISE EXCEPTION 'payer_email too long' USING ERRCODE = '22023';
  END IF;
  IF p_payer_phone IS NOT NULL AND length(p_payer_phone) > 80 THEN
    RAISE EXCEPTION 'payer_phone too long' USING ERRCODE = '22023';
  END IF;
  IF p_payer_location IS NOT NULL AND length(p_payer_location) > 300 THEN
    RAISE EXCEPTION 'payer_location too long' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_charge FROM finance.charges WHERE id = p_charge_id;

  -- Bland "not accepting" error on any invalid target — never leak
  -- which check failed to an anonymous caller.
  IF NOT FOUND
     OR v_charge.shape       <> 'ticketed'
     OR v_charge.status      <> 'active'
     OR v_charge.lifecycle IS DISTINCT FROM 'open'
     OR v_charge.base_amount IS NULL
  THEN
    RAISE EXCEPTION 'this item is not on sale' USING ERRCODE = '42501';
  END IF;

  v_amount := v_charge.base_amount * p_quantity;

  INSERT INTO finance.payment_intents
    (obligation_id, charge_id, scope_id, payer_member_id,
     amount, currency, method, status,
     available_from,
     payer_name, payer_email, payer_phone, payer_location,
     quantity,
     metadata,
     created_by,
     provider)
  VALUES
    (NULL, v_charge.id, v_charge.scope_id, NULL,
     v_amount, v_charge.currency, p_method, 'pending',
     NOW(),
     p_payer_name, p_payer_email, p_payer_phone, p_payer_location,
     p_quantity,
     COALESCE(p_metadata, '{}'::jsonb)
       || jsonb_build_object('public_ticket_purchase', TRUE),
     NULL,
     'fapshi')
  RETURNING id INTO v_intent_id;

  RETURN QUERY
  SELECT v_intent_id, v_amount, v_charge.currency, v_charge.scope_id;
END;
$$;

REVOKE ALL ON FUNCTION finance.initiate_public_ticket_intent(UUID, INTEGER, finance.payment_method, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finance.initiate_public_ticket_intent(UUID, INTEGER, finance.payment_method, TEXT, TEXT, TEXT, TEXT, JSONB)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION finance.initiate_public_ticket_intent IS
  'Public entry to start a Fapshi-backed ticket/attire purchase. SECURITY DEFINER, anon-executable. Creates a pending payment_intents row and returns {intent_id, amount, currency, scope_id}. Server action then hits Fapshi Initiate Pay and calls attach_fapshi_ref with the returned transId.';

-------------------------------------------------------------------------------
-- 2. initiate_public_donation_intent — AGM funding (anon)
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION finance.initiate_public_donation_intent(
  p_charge_id    UUID,
  p_amount       NUMERIC,
  p_currency     TEXT,
  p_method       finance.payment_method,
  p_donor_name   TEXT DEFAULT NULL,
  p_donor_email  TEXT DEFAULT NULL,
  p_donor_phone  TEXT DEFAULT NULL,
  p_note         TEXT DEFAULT NULL
)
RETURNS TABLE (
  intent_id UUID,
  amount    NUMERIC(20, 4),
  currency  TEXT,
  scope_id  UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, finance, public
AS $$
DECLARE
  v_charge   finance.charges%ROWTYPE;
  v_intent_id UUID;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive' USING ERRCODE = '22023';
  END IF;
  IF p_currency IS NULL OR length(p_currency) <> 3 THEN
    RAISE EXCEPTION 'currency must be ISO 4217' USING ERRCODE = '22023';
  END IF;
  IF p_donor_name IS NOT NULL AND length(p_donor_name) > 200 THEN
    RAISE EXCEPTION 'donor_name too long' USING ERRCODE = '22023';
  END IF;
  IF p_donor_email IS NOT NULL AND length(p_donor_email) > 320 THEN
    RAISE EXCEPTION 'donor_email too long' USING ERRCODE = '22023';
  END IF;
  IF p_donor_phone IS NOT NULL AND length(p_donor_phone) > 80 THEN
    RAISE EXCEPTION 'donor_phone too long' USING ERRCODE = '22023';
  END IF;
  IF p_note IS NOT NULL AND length(p_note) > 500 THEN
    RAISE EXCEPTION 'note too long' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_charge FROM finance.charges WHERE id = p_charge_id;

  IF NOT FOUND
     OR v_charge.shape     <> 'donation'
     OR v_charge.status    <> 'active'
     OR v_charge.lifecycle <> 'open'
     OR v_charge.currency  <> upper(p_currency)
  THEN
    RAISE EXCEPTION 'this campaign is not accepting donations' USING ERRCODE = '42501';
  END IF;

  INSERT INTO finance.payment_intents
    (obligation_id, charge_id, scope_id, payer_member_id,
     amount, currency, method, status,
     available_from,
     payer_name, payer_email, payer_phone,
     note,
     metadata,
     created_by,
     provider)
  VALUES
    (NULL, v_charge.id, v_charge.scope_id, NULL,
     p_amount, upper(p_currency), p_method, 'pending',
     NOW(),
     p_donor_name, p_donor_email, p_donor_phone,
     p_note,
     jsonb_build_object('public_donation', TRUE),
     NULL,
     'fapshi')
  RETURNING id INTO v_intent_id;

  RETURN QUERY
  SELECT v_intent_id, p_amount, upper(p_currency), v_charge.scope_id;
END;
$$;

REVOKE ALL ON FUNCTION finance.initiate_public_donation_intent(UUID, NUMERIC, TEXT, finance.payment_method, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finance.initiate_public_donation_intent(UUID, NUMERIC, TEXT, finance.payment_method, TEXT, TEXT, TEXT, TEXT)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION finance.initiate_public_donation_intent IS
  'Public entry to start a Fapshi-backed donation. SECURITY DEFINER, anon-executable. Mirrors initiate_public_ticket_intent for donation-shape charges.';

-------------------------------------------------------------------------------
-- 3. attach_fapshi_ref — server-action side, after Fapshi returns transId
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION finance.attach_fapshi_ref(
  p_intent_id    UUID,
  p_provider_ref TEXT,
  p_hosted_link  TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, finance, public
AS $$
BEGIN
  IF p_provider_ref IS NULL OR length(p_provider_ref) = 0 THEN
    RAISE EXCEPTION 'provider_ref is required' USING ERRCODE = '22023';
  END IF;

  UPDATE finance.payment_intents
     SET provider_ref = p_provider_ref,
         hosted_link  = p_hosted_link,
         updated_at   = NOW()
   WHERE id = p_intent_id
     AND provider = 'fapshi'
     AND provider_ref IS NULL;

  -- No FOUND check: if the intent already has a ref (retry), we leave
  -- the original untouched and treat the second attach as a no-op.
END;
$$;

REVOKE ALL ON FUNCTION finance.attach_fapshi_ref(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finance.attach_fapshi_ref(UUID, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION finance.attach_fapshi_ref IS
  'Attaches a Fapshi transId + hosted link to an intent after Initiate Pay. Idempotent — a second attach is silently ignored.';

-------------------------------------------------------------------------------
-- 4. finalize_fapshi_intent — SUCCESSFUL webhook / reconcile
-------------------------------------------------------------------------------
-- Called from two paths: the Fapshi webhook (fires once) AND the
-- reconciliation cron (in case the webhook is lost). Both must land
-- on the exact same DB state, so this function is idempotent and locks
-- the intent row via SELECT ... FOR UPDATE.

CREATE OR REPLACE FUNCTION finance.finalize_fapshi_intent(
  p_provider_ref  TEXT,
  p_medium        TEXT DEFAULT NULL,
  p_webhook_body  JSONB DEFAULT NULL
)
RETURNS TABLE (
  payment_id     UUID,
  receipt_token  TEXT,
  receipt_number TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, finance, public
AS $$
DECLARE
  v_intent      finance.payment_intents%ROWTYPE;
  v_charge      finance.charges%ROWTYPE;
  v_payment_id  UUID;
  v_method      finance.payment_method;
  v_public      BOOLEAN;
  v_meta_bag    JSONB;
BEGIN
  -- Lock the intent to serialize concurrent webhook + reconcile calls.
  SELECT * INTO v_intent
    FROM finance.payment_intents
   WHERE provider = 'fapshi' AND provider_ref = p_provider_ref
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'intent not found for provider_ref %', p_provider_ref
      USING ERRCODE = 'P0002';
  END IF;

  -- Idempotent short-circuit: already succeeded → return existing token.
  IF v_intent.status = 'succeeded' THEN
    RETURN QUERY
    SELECT v_intent.resulting_payment_id, rv.token, rv.receipt_number
      FROM finance.receipt_verifications rv
     WHERE rv.payment_id = v_intent.resulting_payment_id;
    RETURN;
  END IF;

  -- Refuse to finalize a locally-marked terminal — a late SUCCESSFUL
  -- after failed/expired is a genuine anomaly worth surfacing.
  IF v_intent.status IN ('failed', 'cancelled', 'expired') THEN
    RAISE EXCEPTION 'intent % is in terminal state %, cannot finalize',
      v_intent.id, v_intent.status
      USING ERRCODE = '55000';
  END IF;

  IF v_intent.charge_id IS NULL THEN
    RAISE EXCEPTION 'intent % has no charge_id, cannot finalize', v_intent.id
      USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_charge FROM finance.charges WHERE id = v_intent.charge_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'charge % missing on finalize', v_intent.charge_id
      USING ERRCODE = 'P0002';
  END IF;

  -- Prefer Fapshi's actual medium (MTN → mtn_momo, ORANGE → orange_money)
  -- when supplied; otherwise trust the intent's original method.
  v_method := CASE upper(coalesce(p_medium, ''))
    WHEN 'MTN'    THEN 'mtn_momo'::finance.payment_method
    WHEN 'ORANGE' THEN 'orange_money'::finance.payment_method
    ELSE v_intent.method
  END;

  v_public := coalesce((v_intent.metadata->>'public_ticket_purchase')::boolean, FALSE)
           OR coalesce((v_intent.metadata->>'public_donation')::boolean, FALSE);

  -- Build the payment metadata bag in the exact shape the receipt
  -- page + record_public_* RPCs use, so no branch downstream.
  v_meta_bag := coalesce(v_intent.metadata, '{}'::jsonb)
    || jsonb_build_object(
      'provider',       'fapshi',
      'provider_ref',   p_provider_ref,
      'intent_id',      v_intent.id,
      'medium',         p_medium
    );

  IF coalesce((v_intent.metadata->>'public_ticket_purchase')::boolean, FALSE) THEN
    v_meta_bag := v_meta_bag || jsonb_build_object(
      'quantity',       v_intent.quantity,
      'payer_name',     v_intent.payer_name,
      'payer_email',    v_intent.payer_email,
      'payer_phone',    v_intent.payer_phone,
      'payer_location', v_intent.payer_location
    );
  ELSIF coalesce((v_intent.metadata->>'public_donation')::boolean, FALSE) THEN
    v_meta_bag := v_meta_bag || jsonb_build_object(
      'donor_name',  v_intent.payer_name,
      'donor_email', v_intent.payer_email,
      'donor_phone', v_intent.payer_phone,
      'note',        v_intent.note
    );
  END IF;

  INSERT INTO finance.payments
    (obligation_id, charge_id, scope_id, payer_member_id,
     amount, currency, method, source, recorded_by,
     external_ref, metadata)
  VALUES
    (v_intent.obligation_id, v_intent.charge_id, v_intent.scope_id, v_intent.payer_member_id,
     v_intent.amount, v_intent.currency, v_method, 'auto', v_intent.created_by,
     p_provider_ref, v_meta_bag)
  RETURNING id INTO v_payment_id;

  -- Ticket row for ticketed shapes so tickets + attendance reports work.
  IF v_charge.shape = 'ticketed' AND v_charge.base_amount IS NOT NULL THEN
    INSERT INTO finance.tickets (charge_id, payment_id, buyer_member_id, quantity, unit_price)
    VALUES (v_charge.id, v_payment_id, v_intent.payer_member_id,
            coalesce(v_intent.quantity, 1), v_charge.base_amount);
  END IF;

  UPDATE finance.payment_intents
     SET status              = 'succeeded',
         resulting_payment_id = v_payment_id,
         webhook_payload     = coalesce(p_webhook_body, webhook_payload),
         updated_at          = NOW()
   WHERE id = v_intent.id;

  PERFORM audit.log_event(
    CASE WHEN v_charge.shape = 'donation' THEN 'donation.recorded'
         ELSE 'ticket.recorded' END,
    'finance', 'payments', v_payment_id,
    v_intent.scope_id,
    jsonb_build_object(
      'chargeId',    v_charge.id,
      'chargeName',  v_charge.name,
      'amount',      v_intent.amount,
      'currency',    v_intent.currency,
      'method',      v_method,
      'provider',    'fapshi',
      'providerRef', p_provider_ref,
      'public',      v_public
    )
  );

  RETURN QUERY
  SELECT v_payment_id, rv.token, rv.receipt_number
    FROM finance.receipt_verifications rv
   WHERE rv.payment_id = v_payment_id;
END;
$$;

REVOKE ALL ON FUNCTION finance.finalize_fapshi_intent(TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finance.finalize_fapshi_intent(TEXT, TEXT, JSONB) TO service_role;

COMMENT ON FUNCTION finance.finalize_fapshi_intent IS
  'Idempotently transitions a Fapshi intent to succeeded: inserts the payment (source=auto) + ticket row if ticketed, updates intent, audits. Safe to call from both the webhook and the reconcile cron — locks the intent row and short-circuits on already-succeeded.';

-------------------------------------------------------------------------------
-- 5. mark_fapshi_intent_terminal — FAILED / EXPIRED webhook / reconcile
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION finance.mark_fapshi_intent_terminal(
  p_provider_ref  TEXT,
  p_status        finance.payment_intent_status,
  p_reason        TEXT DEFAULT NULL,
  p_webhook_body  JSONB DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, finance, public
AS $$
DECLARE
  v_intent finance.payment_intents%ROWTYPE;
BEGIN
  IF p_status NOT IN ('failed', 'expired', 'cancelled') THEN
    RAISE EXCEPTION 'p_status must be a non-succeeded terminal, got %', p_status
      USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_intent
    FROM finance.payment_intents
   WHERE provider = 'fapshi' AND provider_ref = p_provider_ref
   FOR UPDATE;

  IF NOT FOUND THEN
    -- Silently drop unknown refs. The x-wh-secret gate upstream rules
    -- out spoofed webhooks; a genuine miss here is a bug not a threat.
    RETURN;
  END IF;

  -- Idempotent: if already at the requested terminal or already
  -- succeeded, no-op.
  IF v_intent.status = p_status OR v_intent.status = 'succeeded' THEN
    RETURN;
  END IF;

  UPDATE finance.payment_intents
     SET status          = p_status,
         failure_reason  = coalesce(p_reason, failure_reason),
         webhook_payload = coalesce(p_webhook_body, webhook_payload),
         expired_at      = CASE WHEN p_status = 'expired' THEN NOW() ELSE expired_at END,
         updated_at      = NOW()
   WHERE id = v_intent.id;
END;
$$;

REVOKE ALL ON FUNCTION finance.mark_fapshi_intent_terminal(TEXT, finance.payment_intent_status, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finance.mark_fapshi_intent_terminal(TEXT, finance.payment_intent_status, TEXT, JSONB) TO service_role;

COMMENT ON FUNCTION finance.mark_fapshi_intent_terminal IS
  'Idempotently transitions a Fapshi intent to a non-succeeded terminal (failed / expired / cancelled). Silent on unknown ref. Called from webhook + reconcile.';

-------------------------------------------------------------------------------
-- 6. get_public_intent_status — anon polling for the pending page
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION finance.get_public_intent_status(
  p_intent_id UUID
)
RETURNS TABLE (
  status         finance.payment_intent_status,
  receipt_token  TEXT,
  hosted_link    TEXT,
  failure_reason TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, finance, public
AS $$
BEGIN
  RETURN QUERY
  SELECT pi.status,
         rv.token,
         pi.hosted_link,
         pi.failure_reason
    FROM finance.payment_intents pi
    LEFT JOIN finance.receipt_verifications rv
      ON rv.payment_id = pi.resulting_payment_id
   WHERE pi.id = p_intent_id
     AND pi.payer_member_id IS NULL
     AND pi.provider = 'fapshi';
END;
$$;

REVOKE ALL ON FUNCTION finance.get_public_intent_status(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finance.get_public_intent_status(UUID)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION finance.get_public_intent_status IS
  'Anon-safe polling endpoint. Returns {status, receipt_token, hosted_link, failure_reason} for one public-flow Fapshi intent by ID. UUIDs are unguessable — no additional auth required.';

-------------------------------------------------------------------------------
-- 7. list_pending_fapshi_intents_for_reconcile — reconcile sweep
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION finance.list_pending_fapshi_intents_for_reconcile(
  p_older_than_seconds INTEGER DEFAULT 120,
  p_limit              INTEGER DEFAULT 100
)
RETURNS TABLE (
  intent_id     UUID,
  provider_ref  TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, finance, public
AS $$
  SELECT id, provider_ref
    FROM finance.payment_intents
   WHERE provider     = 'fapshi'
     AND status       = 'pending'
     AND provider_ref IS NOT NULL
     AND created_at   < NOW() - make_interval(secs => p_older_than_seconds)
   ORDER BY created_at
   LIMIT p_limit;
$$;

REVOKE ALL ON FUNCTION finance.list_pending_fapshi_intents_for_reconcile(INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finance.list_pending_fapshi_intents_for_reconcile(INTEGER, INTEGER) TO service_role;

COMMENT ON FUNCTION finance.list_pending_fapshi_intents_for_reconcile IS
  'Pending Fapshi intents older than N seconds. Fed to the reconcile sweep so the edge function only polls the ones that could plausibly be behind.';
