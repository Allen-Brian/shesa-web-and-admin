-- Migration: finance_contributions_m3
--
-- Phase 3 M3 — the contribution engine's schema-level pieces.
--
-- Two additions:
--   1. A real FK from finance.charges.event_id to exco.events(id). M1
--      created event_id as a bare UUID with a note that the FK would
--      land "once exco.events is finance-visible" — that time is now.
--      ON DELETE RESTRICT so the DB refuses to drop an event that still
--      has a contribution referencing it.
--   2. A trigger on exco.events UPDATE that blocks moving an event to
--      status='archived' when it carries a live contribution with at
--      least one non-reversed payment. Locked spec (Part IV):
--        "Deleting/archiving an event that has a live contribution
--         with recorded payments is BLOCKED; the contribution must be
--         settled/archived first."
--      The trigger is scoped narrowly: it only fires on the archive
--      transition, only checks contributions with lifecycle IN ('open',
--      'closed'), and only rejects if there's at least one payment
--      that hasn't been fully reversed.

-------------------------------------------------------------------------------
-- 1. FK charges.event_id -> exco.events(id)
-------------------------------------------------------------------------------
-- Deferred from M1 because at that time the finance schema was landing
-- without any exco visibility. Now it's safe. RESTRICT (not CASCADE)
-- so a rogue DELETE on the event surfaces as an error, not silent
-- financial-record loss.

ALTER TABLE finance.charges
  ADD CONSTRAINT charges_event_fk
  FOREIGN KEY (event_id) REFERENCES exco.events(id) ON DELETE RESTRICT;

-------------------------------------------------------------------------------
-- 2. Event archive-block trigger
-------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION exco.events_block_archive_with_paid_contribution()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_charge_id UUID;
  v_charge_name TEXT;
BEGIN
  -- Only guard the archive transition; every other UPDATE passes through.
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;
  IF NEW.status <> 'archived' THEN
    RETURN NEW;
  END IF;

  -- Look for a live contribution with at least one non-reversed payment.
  -- "Live" here means lifecycle IN ('open', 'closed') — a draft or an
  -- already-archived contribution doesn't block the event.
  --
  -- "Non-reversed" is computed via the reverses_payment_id chain: a
  -- payment IS reversed if another payment row's reverses_payment_id
  -- points at it AND that reversing payment hasn't itself been reversed.
  -- For M3 v1 we approximate with "at least one payment exists that is
  -- not itself a reversal AND is not itself reversed by a downstream row."
  -- Exact chain semantics land with the payment engine (M4); this is
  -- the safe over-approximation.

  SELECT c.id, c.name
    INTO v_charge_id, v_charge_name
  FROM finance.charges c
  WHERE c.event_id = NEW.id
    AND c.lifecycle IN ('open', 'closed')
    AND EXISTS (
      SELECT 1
        FROM finance.payments p
       WHERE p.charge_id = c.id
         AND p.reverses_payment_id IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM finance.payments r
            WHERE r.reverses_payment_id = p.id
         )
    )
  LIMIT 1;

  IF v_charge_id IS NOT NULL THEN
    RAISE EXCEPTION
      'Cannot archive event %: contribution "%" (%) has recorded payments. Archive the contribution first.',
      NEW.id, v_charge_name, v_charge_id
      USING ERRCODE = '23514',
            HINT = 'Settle or archive the referenced contribution before archiving the event.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS events_block_archive_with_paid_contribution ON exco.events;
CREATE TRIGGER events_block_archive_with_paid_contribution
  BEFORE UPDATE OF status ON exco.events
  FOR EACH ROW
  WHEN (NEW.status = 'archived' AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION exco.events_block_archive_with_paid_contribution();

COMMENT ON FUNCTION exco.events_block_archive_with_paid_contribution IS
  'Blocks archiving an event that has a live (open/closed) contribution carrying at least one non-reversed payment. Spec Part IV: event-tie invariant. Fires only on the archive transition.';
