import { StatsCard } from '@shesa/ui';

import { formatCompactMoney } from '@/lib/finance/format-money';

import type { PaymentKpis } from './transactions-kpis';

/**
 * Headline KPI strip above the transactions table — 5 stats cards.
 * Money cells use the compact K/M formatter so eight-digit branch
 * totals stay readable inside a StatsCard. Falls back to XAF on a
 * mixed-currency ledger.
 */
export function TransactionsKpiStrip({ kpis }: { readonly kpis: PaymentKpis }) {
  const currency = kpis.primaryCurrency ?? 'XAF';
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <StatsCard label="Payments" value={kpis.total} />
      <StatsCard
        label="Net collected"
        value={formatCompactMoney(kpis.totalCollected ?? 0, currency)}
      />
      <StatsCard
        label="Avg. amount"
        value={kpis.cleared > 0 ? formatCompactMoney(kpis.avg, currency) : '—'}
      />
      <StatsCard label="Cleared" value={kpis.cleared} />
      <StatsCard label="Reversal rate" value={kpis.total > 0 ? `${kpis.reversalRate}%` : '—'} />
    </div>
  );
}
