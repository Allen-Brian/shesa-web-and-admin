import { StatsCard } from '@shesa/ui';

import type { PaymentKpis } from './payments-kpis';

/**
 * Headline KPI strip above the payments table — 5 stats cards.
 * `Net collected` and `Avg. amount` only surface when every payment
 * uses one currency (otherwise summing is meaningless without a
 * reference rate).
 */
export function PaymentsKpiStrip({ kpis }: { readonly kpis: PaymentKpis }) {
  const money = (n: number) =>
    kpis.primaryCurrency
      ? `${new Intl.NumberFormat().format(Math.round(n))} ${kpis.primaryCurrency}`
      : '—';

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <StatsCard label="Payments" value={kpis.total} />
      <StatsCard label="Net collected" value={money(kpis.totalCollected ?? 0)} />
      <StatsCard
        label="Avg. amount"
        value={kpis.primaryCurrency && kpis.cleared > 0 ? money(kpis.avg) : '—'}
      />
      <StatsCard label="Cleared" value={kpis.cleared} />
      <StatsCard label="Reversal rate" value={kpis.total > 0 ? `${kpis.reversalRate}%` : '—'} />
    </div>
  );
}
