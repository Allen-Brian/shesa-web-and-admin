import { StatsCard } from '@shesa/ui';

import { formatCompactMoney } from '@/lib/finance/format-money';

import type { DashboardKpis } from './dashboard-types';

/**
 * The dashboard's 5-card KPI strip. Money cells (Income / Expenses /
 * Net) show the ledger's currency at the active scope in the
 * abbreviated K/M form so eight-digit branch totals stay readable in
 * the tight cell width. Falls back to XAF (the platform default) on
 * an empty or mixed-currency ledger so the value is always a real
 * number, never a dash.
 */
export function FinanceHeroKpis({ kpis }: { readonly kpis: DashboardKpis }) {
  const { income, expensesSum, netFlow, currency, ongoingContributions, txnsThisMonth } = kpis;
  const displayCurrency = currency ?? 'XAF';
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <StatsCard label="Income · 30 days" value={formatCompactMoney(income, displayCurrency)} />
      <StatsCard
        label="Expenses · 30 days"
        value={formatCompactMoney(expensesSum, displayCurrency)}
      />
      <StatsCard
        label="Net · 30 days"
        value={`${netFlow >= 0 ? '+' : ''}${formatCompactMoney(netFlow, displayCurrency)}`}
      />
      <StatsCard label="Ongoing contributions" value={ongoingContributions.toLocaleString()} />
      <StatsCard label="Transactions · this month" value={txnsThisMonth.toLocaleString()} />
    </div>
  );
}
