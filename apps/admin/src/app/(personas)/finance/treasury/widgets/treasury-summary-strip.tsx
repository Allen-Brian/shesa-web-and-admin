import { Building2, Wallet } from 'lucide-react';

import { GradientPanel } from '@shesa/ui';

import { NetFlowSpan } from './net-flow-span';
import { formatAmount } from './treasury-landing-helpers';
import type { TreasuryCurrencyRollup } from './treasury-landing-types';

/**
 * 2-panel landing summary strip: treasury count + active-in-window
 * signal on the left, per-currency total on hand + net flow copy on
 * the right. Single-currency portfolios get a live net-flow chip;
 * multi-currency ones drop that hint and point at the Reports tab
 * for the roll-up.
 */
export function TreasurySummaryStrip({
  treasuryCount,
  activeCount,
  byCurrency,
}: {
  readonly treasuryCount: number;
  readonly activeCount: number;
  readonly byCurrency: ReadonlyMap<string, TreasuryCurrencyRollup>;
}) {
  const currencies = Array.from(byCurrency.entries()).sort((a, b) => b[1].balance - a[1].balance);
  const totalNet = Array.from(byCurrency.values()).reduce((a, b) => a + (b.income - b.expenses), 0);
  const singleCurrency = byCurrency.size === 1 ? currencies[0]![0] : null;

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <GradientPanel className="flex flex-col justify-between gap-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Treasuries in view
          </span>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold text-foreground tabular-nums">
            {treasuryCount}
          </span>
          <span className="text-sm text-muted-foreground">
            {treasuryCount === 1 ? 'scope' : 'scopes'}
          </span>
        </div>
        <div className="text-[11px] text-muted-foreground">
          {activeCount} active in the last 30 days
        </div>
      </GradientPanel>

      <GradientPanel className="flex flex-col justify-between gap-3 p-5 md:col-span-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Total on hand
          </span>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
          {currencies.map(([currency, s]) => (
            <div key={currency} className="flex flex-col gap-0.5">
              <span className="text-3xl font-semibold leading-none text-foreground tabular-nums">
                {formatAmount(s.balance)}
              </span>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {currency}
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-baseline gap-x-4 text-[11px] text-muted-foreground">
          {singleCurrency ? (
            <NetFlowSpan
              net={totalNet}
              currency={singleCurrency}
              label={`vs 30 days ago · ${formatAmount(
                Array.from(byCurrency.values())[0]!.income,
              )} in / ${formatAmount(Array.from(byCurrency.values())[0]!.expenses)} out`}
            />
          ) : (
            <span>Aggregated per currency · cross-currency roll-ups live in Reports.</span>
          )}
        </div>
      </GradientPanel>
    </div>
  );
}
