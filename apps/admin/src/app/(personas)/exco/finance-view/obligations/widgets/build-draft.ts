import type { ObligationRow, PaymentDraft } from './obligation-widget-types';

/**
 * Default amount = remaining outstanding for the common "settle this
 * period" flow. Fully-paid rows fall back to the full amount so the
 * operator can see the ceiling if they want to reverse-then-repay.
 */
export function buildDraft(row: ObligationRow): PaymentDraft {
  return {
    row,
    amount: (row.outstanding > 0 ? row.outstanding : row.amount).toString(),
    method: 'mtn_momo',
    memo: '',
    externalRef: '',
  };
}
