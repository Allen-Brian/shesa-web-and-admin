-- One live payment per gateway reference.
--
-- `finance.sandbox_payments` got this on day one — a unique index on
-- (provider, provider_ref) — because a replayed webhook must conflict
-- rather than duplicate. `finance.payments` had no equivalent, and it is
-- the table where the consequence is permanent: the row writes a ledger
-- entry, moves the treasury, mints a verifiable receipt, and cannot be
-- deleted or updated. A duplicate settlement there is not a bug you fix,
-- it is a bug you reverse with a compensating entry and explain to a
-- treasurer.
--
-- The exposure is real and not theoretical. Tranzak's webhook carries no
-- signature — verification is a static `authKey` echoed in the body — so
-- anyone who has seen one notification can replay it as many times as they
-- like. The settlement code re-reads from the gateway before acting, which
-- stops a *forged* status, but two genuine deliveries of the same genuine
-- event would both pass that check. This index is what makes the second
-- one a no-op.
--
-- Scoped to gateway-settled rows by predicate, so it constrains nothing
-- else: manual payments carry a caller-supplied `external_ref` that may
-- legitimately repeat or be absent, and the simulator writes
-- `metadata = {intent_id, provider: 'simulated'}` with no reference at all.
-- Neither has `metadata->>'provider_ref'`, so neither is indexed.

CREATE UNIQUE INDEX payments_gateway_reference_key
  ON finance.payments ((metadata ->> 'provider'), (metadata ->> 'provider_ref'))
  WHERE metadata ->> 'provider_ref' IS NOT NULL;

COMMENT ON INDEX finance.payments_gateway_reference_key IS
  'At most one payment per gateway transaction. The webhook is unsigned and therefore replayable, and a row in this table is immutable — so idempotency has to be enforced here rather than trusted to the caller. Mirrors sandbox_payments_provider_ref_key.';
