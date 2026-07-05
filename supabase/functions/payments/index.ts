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
 *
 * Deferred to M4B:
 *   initiate        — Kicks off a simulated provider payment window.
 *   confirm         — On provider success, writes source='auto' row.
 *   (Real MTN / Orange / card providers slot in behind the same
 *    PaymentProvider seam later.)
 */

import { entityRouter } from '../_shared/entity-router.ts';

import { payOnBehalf } from './pay-on-behalf.ts';
import { recordManualPayment } from './record-manual.ts';
import { reversePayment } from './reverse.ts';

Deno.serve(
  entityRouter({
    'record-manual': recordManualPayment,
    'pay-on-behalf': payOnBehalf,
    reverse: reversePayment,
  }),
);
