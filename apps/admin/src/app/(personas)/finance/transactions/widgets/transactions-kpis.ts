import type { TransactionRow } from './transactions-types';

export interface PaymentKpis {
  readonly total: number;
  readonly cleared: number;
  readonly reversals: number;
  readonly reversalRate: number;
  readonly totalCollected: number | null;
  readonly primaryCurrency: string | undefined;
  readonly avg: number;
}

/**
 * Rolls the payments list into a headline KPI cluster: total count,
 * cleared vs reversal split, reversal rate, net collected amount (when
 * there's a single currency to sum in), and average cleared amount.
 *
 * Reversals subtract from the collected total; the reversal count +
 * rate surface separately so operators can catch a spike in
 * corrections at a glance.
 */
export function buildPaymentKpis(payments: readonly TransactionRow[]): PaymentKpis {
  const currencies = new Map<string, number>();
  let cleared = 0;
  let reversals = 0;
  for (const p of payments) {
    const signed = p.reversesPaymentId ? -p.amount : p.amount;
    currencies.set(p.currency, (currencies.get(p.currency) ?? 0) + signed);
    if (p.reversesPaymentId) reversals += 1;
    else cleared += 1;
  }
  const primaryCurrency = currencies.size === 1 ? currencies.keys().next().value : undefined;
  const totalCollected = primaryCurrency !== undefined ? currencies.get(primaryCurrency)! : null;
  const settledPayments = payments.filter((p) => !p.reversesPaymentId);
  const avg =
    settledPayments.length > 0
      ? settledPayments.reduce((a, b) => a + b.amount, 0) / settledPayments.length
      : 0;
  return {
    total: payments.length,
    cleared,
    reversals,
    reversalRate: payments.length > 0 ? Math.round((reversals / payments.length) * 100) : 0,
    totalCollected,
    primaryCurrency,
    avg,
  };
}
