import type { PaymentMethod } from '../actions';

/**
 * Row + form shapes for the transactions view. Kept in a plain file
 * so the server-side page loader and every widget sibling can import
 * from one source.
 *
 * `payerEmail` / `payerPhone` / `payerLocation` live on
 * `finance.payments.metadata` (see the anon-payer path used by
 * public forms and the walk-in donation entry). Surfaced here so the
 * detail sheet can display them without another round trip.
 */

export interface TransactionRow {
  readonly id: string;
  readonly obligationId: string | null;
  readonly chargeId: string | null;
  readonly chargeName: string;
  readonly chargeShape: string | null;
  readonly scopeName: string;
  readonly payerLabel: string;
  readonly payerEmail: string | null;
  readonly payerPhone: string | null;
  readonly payerLocation: string | null;
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
