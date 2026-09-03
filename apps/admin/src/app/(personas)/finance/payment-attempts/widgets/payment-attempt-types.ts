/**
 * Row shape for payment attempts — `finance.payment_intents`.
 *
 * ─── Why these are not on the Transactions page ────────────────────────
 * Transactions is the books: money that moved, immutable, reversible only
 * by a compensating entry. An attempt is not money. It is somebody trying,
 * and most of the interesting ones are the failures.
 *
 * Mixing them would mean every total on that page had to remember to
 * exclude the unsettled rows, and the first place that forgot would report
 * attempted payments as revenue. Separate surface, nothing to remember.
 *
 * The lifecycle these rows move through:
 *
 *   initiated  written before the gateway was called. Stuck here means our
 *              side failed — the gateway never got the request.
 *   pending    the gateway holds it. Stuck here means the payer has not
 *              finished, which is ordinary.
 *   succeeded  settled. `settlementId` points at the payment, or at the
 *              sandbox settlement when the attempt ran in test mode.
 *   failed     declined, or the gateway reported an amount we did not ask
 *              for and settlement refused it.
 *   cancelled  the payer backed out.
 */

export interface PaymentAttemptRow {
  readonly id: string;
  readonly status: string;
  readonly mode: string;

  readonly chargeName: string;
  readonly scopeName: string;

  readonly amount: number;
  readonly currency: string;
  /** Null until the gateway reports what the payer actually used. */
  readonly method: string | null;
  readonly quantity: number | null;

  readonly payerLabel: string;
  readonly payerEmail: string | null;
  readonly payerPhone: string | null;
  readonly isMember: boolean;
  readonly note: string | null;

  readonly provider: string | null;
  readonly gatewayRef: string | null;
  readonly failureReason: string | null;

  /** The settlement this attempt produced, in whichever table its mode dictates. */
  readonly settlementId: string | null;

  readonly createdAt: string;
  readonly updatedAt: string;
}

export type SerialPaymentAttemptRow = PaymentAttemptRow & { readonly serial: number };

export type AttemptStatusFilter = 'all' | 'open' | 'settled' | 'unsuccessful';
