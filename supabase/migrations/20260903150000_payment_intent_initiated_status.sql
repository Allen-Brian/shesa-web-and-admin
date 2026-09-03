-- A payment exists before the gateway knows about it.
--
-- `finance.payment_intents` began at `pending`, which conflated two states
-- that fail in different ways and want different handling:
--
--   initiated  we have written the row and are about to call the gateway.
--              If the call fails, or the process dies, this row is all
--              that is left — and it is the only evidence that somebody
--              tried to pay.
--   pending    the gateway has the request and issued a reference. The
--              payer is on its checkout page, or about to be.
--
-- The distinction is what lets Finance tell "our side broke" from "the
-- payer has not finished". A row stuck at `initiated` means the gateway
-- call never completed and nobody is waiting on a payer; a row stuck at
-- `pending` means the opposite.
--
-- It also means the finance dashboard has something to show from the very
-- first moment, rather than only once money has moved.

ALTER TYPE finance.payment_intent_status ADD VALUE IF NOT EXISTS 'initiated' BEFORE 'pending';

COMMENT ON TYPE finance.payment_intent_status IS
  'Lifecycle of an attempt to pay: initiated (row written, gateway not yet called) → pending (gateway holds the request) → succeeded | failed | cancelled. `expired` survives from the Fapshi integration; Postgres cannot drop an enum label without recreating the type.';
