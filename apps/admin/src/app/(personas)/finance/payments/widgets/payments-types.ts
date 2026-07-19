import type { PaymentMethod } from '../actions';

/**
 * Row + form shapes for the payments view. Kept in a plain file so
 * the server-side page loader and every widget sibling can import
 * from one source.
 */

export interface PaymentRow {
  readonly id: string;
  readonly obligationId: string | null;
  readonly chargeId: string | null;
  readonly chargeName: string;
  readonly chargeShape: string | null;
  readonly scopeName: string;
  readonly payerLabel: string;
  readonly amount: number;
  readonly currency: string;
  readonly method: string;
  readonly source: string;
  readonly reversesPaymentId: string | null;
  readonly externalRef: string | null;
  readonly createdAt: string;
  readonly receiptToken: string | null;
  readonly receiptNumber: string | null;
}

export interface ChargeOption {
  readonly id: string;
  readonly name: string;
  readonly shape: string;
  readonly scopeId: string;
  readonly scopeName: string;
  readonly currency: string;
}

export type SerialRow = PaymentRow & { readonly serial: number };

export type SourceFilter = 'all' | 'manual' | 'auto';
export type MethodFilter = 'all' | PaymentMethod;

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
