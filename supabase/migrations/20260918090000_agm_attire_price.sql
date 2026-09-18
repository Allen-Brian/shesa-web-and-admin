-- AGM 2026 attire is 55 000 XAF, not 50 000.
--
-- The seed sets this charge's `base_amount`, so correcting `seed.sql` alone
-- fixes a database built from scratch and leaves every existing one wrong.
-- Staging and production already hold the row at 50 000.
--
-- It matters because the public form and the gateway read the price from two
-- different places. `AGM_ATTIRE_UNIT_PRICE_XAF` in apps/web drives the total
-- shown to the buyer and the amount written to `cms.agm_registrations`, while
-- the sum actually charged is computed server-side as
-- `finance.charges.base_amount × quantity` — the checkout never sends an
-- amount. Move one without the other and the form quotes 55 000 while the
-- gateway bills 50 000.
--
-- A direct UPDATE rather than `finance.schedule_amount_change`: that function
-- exists for recurring dues and refuses a one-time charge outright, and the
-- versions it writes are read by `effective_amount` on the obligations path,
-- which a ticketed public purchase never touches.
--
-- Payments already settled at 50 000 are left exactly as they are.
-- `finance.payments` is append-only by trigger, and a receipt states what was
-- paid on the day. Whether early buyers are asked for the difference or held
-- to the old price is the secretariat's call, not a migration's.

DO $$
DECLARE
  v_updated integer;
BEGIN
  UPDATE finance.charges
     SET base_amount = 55000,
         description = 'AGM 2026 attire order — 55 000 XAF. Measurements captured at purchase.',
         updated_at  = NOW()
   WHERE id = '88888888-2026-1111-0000-000000000003'
     AND base_amount = 50000;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    -- Either the charge is absent (a database seeded without the AGM group)
    -- or someone has already corrected it. Both are fine; neither is worth
    -- failing a deployment over.
    RAISE NOTICE 'AGM 2026 attire charge not at 50 000 — nothing to correct.';
  END IF;
END $$;
