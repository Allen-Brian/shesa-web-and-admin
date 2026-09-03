import type { ChargeOption, RecordForm } from './transactions-types';

/** First+last initial for the avatar chip. `—` on empty input. */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '—';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/** Fresh state for the "record payment" dialog. */
export function initialRecord(chargeOptions: readonly ChargeOption[]): RecordForm {
  return {
    chargeId: chargeOptions[0]?.id ?? '',
    amount: '',
    method: 'cash',
    memo: '',
    externalRef: '',
  };
}

/**
 * Set of `payment.id` values that have a reversal pointing at them.
 * Used by the columns to render a `Reversed` chip on the original
 * (rather than only on the reversal row).
 */
export function collectReversedIds(
  payments: readonly { id: string; reversesPaymentId: string | null }[],
): Set<string> {
  const set = new Set<string>();
  for (const p of payments) if (p.reversesPaymentId) set.add(p.reversesPaymentId);
  return set;
}

/** Public verify URL for a receipt token, hosted under `baseUrl`. */
export function buildVerifyUrl(baseUrl: string, token: string): string {
  return `${baseUrl}/verify?token=${encodeURIComponent(token)}`;
}

// Re-exported from the shared formatters so this module keeps one import
// surface. These were local copies — formatMethod alone existed in five
// places, formatMoney in four.
export { formatPaymentMethod as formatMethod } from '@/lib/format/payment-method';
