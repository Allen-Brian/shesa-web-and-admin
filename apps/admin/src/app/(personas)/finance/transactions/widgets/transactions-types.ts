import type { PaymentMethod } from '../transaction-actions';

/**
 * Row + form shapes for the transactions view. Kept in a plain file
 * so the server-side page loader and every widget sibling can import
 * from one source.
 *
 * `payerEmail` / `payerPhone` / `payerLocation` live on
 * `finance.payments.metadata` (see the anon-payer path used by
 * public forms and the walk-in donation entry). Surfaced here so the
 * detail sheet can display them without another round trip.
 *
 * The `gateway*` fields come from the same place, written by
 * `_shared/tranzak-settle.ts` when a payment settles through Tranzak.
 * Gross, fee and net are kept apart because they answer different
 * questions: the payer was charged the gross, the treasury received the
 * net, and the difference is the gateway's cut. A payment that
 * reconciles at gross can still leave the books short, and that is only
 * visible if all three are carried through.
 */

export interface TransactionRow {
  readonly id: string;
  readonly obligationId: string | null;
  readonly chargeId: string | null;
  readonly chargeName: string;
  readonly chargeShape: string | null;
  readonly scopeName: string;
  readonly payerLabel: string;
  /**
   * Contact details. For a public payment these come off the form, via
   * `payments.metadata`; for a member payment they are resolved from
   * `core.members`, so an exported sheet can be acted on by somebody
   * who cannot click through to the member record.
   */
  readonly payerEmail: string | null;
  readonly payerPhone: string | null;
  readonly payerLocation: string | null;
  /** Batch scope name — members only, null for public payers. */
  readonly payerBatch: string | null;
  readonly payerMemberCode: string | null;
  readonly isAnonymousPayer: boolean;
  readonly amount: number;
  readonly currency: string;
  readonly method: string;
  readonly source: string;
  readonly reversesPaymentId: string | null;
  readonly externalRef: string | null;
  readonly memo: string | null;
  readonly createdAt: string;
  readonly receiptToken: string | null;
  readonly receiptNumber: string | null;

  /** Gateway provenance. Null on manual, cash and simulated payments. */
  readonly gatewayProvider: string | null;
  readonly gatewayRef: string | null;
  readonly gatewayTransactionId: string | null;
  readonly gatewayStatus: string | null;
  readonly gatewayAmount: number | null;
  readonly gatewayCurrency: string | null;
  readonly gatewayFee: number | null;
  readonly gatewayNetAmount: number | null;

  /** True when a matching row exists in finance.reconciliations. */
  readonly reconciled: boolean;
  readonly reconciledAt: string | null;
  readonly reconciliationMatchedRef: string | null;
  readonly reconciliationNotes: string | null;
}

export interface ChargeOption {
  readonly id: string;
  readonly name: string;
  readonly shape: string;
  readonly scopeId: string;
  readonly scopeName: string;
  readonly currency: string;
}

export type SerialRow = TransactionRow & { readonly serial: number };

export type SourceFilter = 'all' | 'manual' | 'auto';
export type MethodFilter = 'all' | PaymentMethod;
export type ReconciliationFilter = 'all' | 'reconciled' | 'unreconciled';

export interface RecordForm {
  chargeId: string;
  amount: string;
  method: PaymentMethod;
  memo: string;
  externalRef: string;
}

/** Options shown in the record-payment method select and filter chip. */
export const PAYMENT_METHODS: readonly { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'mtn_momo', label: 'MTN MoMo' },
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'card', label: 'Card' },
];
