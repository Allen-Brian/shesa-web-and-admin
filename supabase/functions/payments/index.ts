/**
 * Entity Edge Function: payments/
 *
 * Serves /functions/v1/payments/{action}. Per ADR-0033, every write to
 * finance.payments lands here — Server Actions cannot mutate the table
 * directly. The M1 append-only trigger blocks UPDATE + DELETE at the
 * DB level regardless.
 *
 * Actions:
 *   record-manual   — Finance records a manual / cash / bank-transfer /
 *                     MoMo-marked payment. source='manual'.
 *   pay-on-behalf   — Finance or Admin records a payment for a member.
 *                     The payment attaches to the beneficiary; recorded_by
 *                     captures the actor.
 *   reverse         — Inserts a new payment row with reverses_payment_id
 *                     set + a mandatory reason. The original stays intact.
 *   initiate        — Creates a finance.payment_intents row + returns
 *                     the intent handle. Simulator drives success off
 *                     available_from; real providers via webhooks.
 *   confirm         — Polls an intent. On success, INSERTs the payment
 *                     row (source='auto') and updates the intent. Idempotent.
 *   tranzak-settle  — Settles a Tranzak transaction from an identifier,
 *                     re-reading the gateway before writing anything.
 *                     Reached by the webhook forwarder and the payer's
 *                     return page. Idempotent.
 */

import { entityRouter } from '../_shared/entity-router.ts';

import { confirmPayment } from './confirm.ts';
import { initiatePayment } from './initiate.ts';
import { payOnBehalf } from './pay-on-behalf.ts';
import { recordManualPayment } from './record-manual.ts';
import { reversePayment } from './reverse.ts';
import { tranzakSettle } from './tranzak-settle.ts';

Deno.serve(
  entityRouter({
    'record-manual': recordManualPayment,
    'pay-on-behalf': payOnBehalf,
    reverse: reversePayment,
    initiate: initiatePayment,
    confirm: confirmPayment,
    'tranzak-settle': tranzakSettle,
  }),
);
