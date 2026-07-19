import { StatsCard } from '@shesa/ui';

import { formatMoney } from './dashboard-formatters';
import type { DashboardKpis } from './dashboard-types';

/**
 * 4-up hero KPI grid + optional multi-currency chip strip. The 4-up
 * cards collapse to "multi-currency" when there's more than one
 * currency in the portfolio so the operator isn't misled by a
 * mismatched sum; the chip strip below then surfaces the per-currency
 * balances so the smaller pot doesn't get lost.
 */
export function FinanceHeroKpis({ kpis }: { readonly kpis: DashboardKpis }) {
  const { balanceByCurrency, singleCurrency, totalBalance, income, expensesSum, netFlow } = kpis;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Total on hand"
          value={
            singleCurrency && totalBalance !== null
              ? formatMoney(totalBalance, singleCurrency)
              : balanceByCurrency.size > 1
                ? 'multi-currency'
                : '—'
          }
        />
        <StatsCard
          label="30-day inflow"
          value={singleCurrency ? formatMoney(income, singleCurrency) : '—'}
        />
        <StatsCard
          label="30-day outflow"
          value={singleCurrency ? formatMoney(expensesSum, singleCurrency) : '—'}
        />
        <StatsCard
          label="30-day net"
          value={
            singleCurrency
              ? `${netFlow >= 0 ? '+' : ''}${formatMoney(netFlow, singleCurrency)}`
              : '—'
          }
        />
      </div>

      {balanceByCurrency.size > 1 && (
        <div className="flex flex-wrap gap-3">
          {Array.from(balanceByCurrency.entries()).map(([currency, amount]) => (
            <div
              key={currency}
              className="flex flex-col gap-1 rounded-xl border border-border bg-card px-4 py-3"
            >
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                On hand · {currency}
              </span>
              <span className="text-xl font-semibold text-foreground tabular-nums">
                {new Intl.NumberFormat().format(Math.round(amount))}
              </span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
