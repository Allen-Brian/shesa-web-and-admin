-- An intent may not know its payment method yet.
--
-- The public forms used to ask which method the payer intended to use —
-- MTN, Orange, card, bank transfer — and Tranzak's hosted checkout then
-- asked again. Two answers to one question, and only the gateway's was
-- ever true: the payer picks on Tranzak's page and can pick differently.
--
-- So the question is gone from the forms, which leaves a real gap between
-- creating an intent and settling it, during which nobody knows the
-- method. `method` was NOT NULL, so filling that gap meant inventing a
-- value that would later be overwritten — a wrong answer displayed to
-- Finance until the payment cleared.
--
-- NULL now means what it should: not chosen yet. Settlement fills it from
-- `payer.paymentMethod` on the gateway's own response.
--
-- Existing rows are unaffected: every one of them was created by a flow
-- that did know the method, and they keep it.

ALTER TABLE finance.payment_intents ALTER COLUMN method DROP NOT NULL;

COMMENT ON COLUMN finance.payment_intents.method IS
  'How the payer intends to pay, where that is known up front (member-facing flows, manual entry). NULL for a hosted-checkout intent, because the payer chooses on the gateway''s page and the gateway is the only honest source. Settlement writes the method the payer actually used onto finance.payments.';

-------------------------------------------------------------------------------
-- The public forms now offer a settle-now / pay-on-arrival choice
-------------------------------------------------------------------------------
-- `cms.agm_registrations.payment_method` recorded which of five methods a
-- visitor picked. It now records which of two things they chose to do, so
-- the old values stay valid for rows already captured and `pay-now` joins
-- them for everything after.

ALTER TABLE cms.agm_registrations
  DROP CONSTRAINT IF EXISTS agm_registrations_payment_method_check;

ALTER TABLE cms.agm_registrations
  ADD CONSTRAINT agm_registrations_payment_method_check
  CHECK (payment_method = ANY (ARRAY[
    -- Current: what the visitor chose to do.
    'pay-now'::text,
    'cash-on-site'::text,
    -- Retained: what earlier visitors chose to pay with. Dropping these
    -- would invalidate registrations already taken.
    'mtn-momo'::text,
    'orange-money'::text,
    'card'::text,
    'bank-transfer'::text
  ]));

COMMENT ON COLUMN cms.agm_registrations.payment_method IS
  'What the visitor chose to do: pay-now (handed to the gateway) or cash-on-site (secretariat collects on the day). The four method names are historical, from when the form asked which method they would use.';
