import { StatsCard } from '@shesa/ui';

import type { ExpenseKpis } from './expenses-kpis';

/**
 * 5-up KPI strip. Money totals only surface when every visible
 * expense shares one currency — multi-currency portfolios show "—"
 * to avoid misrepresenting totals.
 */
export function ExpensesKpiStrip({ kpis }: { readonly kpis: ExpenseKpis }) {
  const money = (n: number) =>
    kpis.primaryCurrency
      ? `${new Intl.NumberFormat().format(Math.round(n))} ${kpis.primaryCurrency}`
      : '—';
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <StatsCard label="Expenses" value={kpis.total} />
      <StatsCard
        label="Net spent"
        value={kpis.primaryCurrency && kpis.netSpent !== null ? money(kpis.netSpent) : '—'}
      />
      <StatsCard
        label="Avg. amount"
        value={kpis.primaryCurrency && kpis.settledCount > 0 ? money(kpis.avg) : '—'}
      />
      <StatsCard label="Pending approval" value={kpis.pending} />
      <StatsCard label="Reversals" value={kpis.reversalCount} />
    </div>
  );
}
