import { StatsCard } from '@shesa/ui';

import { formatCompactMoney } from '@/lib/finance/format-money';

import type { ExpenseKpis } from './expenses-kpis';

/**
 * 5-up KPI strip. Money cells use the compact K/M formatter so
 * eight-digit portfolio totals stay readable inside a StatsCard;
 * falls back to XAF on a mixed-currency ledger so we always show a
 * number, never a dash.
 */
export function ExpensesKpiStrip({ kpis }: { readonly kpis: ExpenseKpis }) {
  const currency = kpis.primaryCurrency ?? 'XAF';
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <StatsCard label="Expenses" value={kpis.total} />
      <StatsCard
        label="Net spent"
        value={kpis.netSpent !== null ? formatCompactMoney(kpis.netSpent, currency) : '—'}
      />
      <StatsCard
        label="Avg. amount"
        value={kpis.settledCount > 0 ? formatCompactMoney(kpis.avg, currency) : '—'}
      />
      <StatsCard label="Pending approval" value={kpis.pending} />
      <StatsCard label="Reversals" value={kpis.reversalCount} />
    </div>
  );
}
