import type { PaymentMethod } from '../obligation-actions';

export type { PaymentMethod } from '../obligation-actions';

export interface ObligationRow {
  readonly id: string;
  readonly chargeId: string;
  readonly scopeId: string;
  readonly chargeName: string;
  readonly imposerName: string;
  readonly recurrence: string;
  readonly branchName: string;
  readonly periodStart: string | null;
  readonly periodEnd: string | null;
  readonly amount: number;
  readonly paid: number;
  readonly outstanding: number;
  readonly currency: string;
  readonly status: string;
}

export type SerialRow = ObligationRow & { readonly serial: number };

export interface PaymentDraft {
  readonly row: ObligationRow;
  amount: string;
  method: PaymentMethod;
  memo: string;
  externalRef: string;
}

export const PAYMENT_METHOD_OPTIONS: readonly { value: PaymentMethod; label: string }[] = [
  { value: 'mtn_momo', label: 'MTN MoMo' },
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
];
