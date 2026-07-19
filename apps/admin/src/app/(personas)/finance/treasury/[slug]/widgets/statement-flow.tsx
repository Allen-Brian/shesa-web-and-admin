import { Minus, Plus } from 'lucide-react';

import { GradientPanel } from '@shesa/ui';

import { StatementFlowCell } from './statement-flow-cell';
import type { StatementSummary } from './statement-types';

/**
 * Statement summary card — window label + net-movement headline on
 * top, then a 4-up Opening / Income / Expenses / Closing strip.
 * Net movement is emerald when positive, destructive-red when
 * negative — the eye reads the treasury's direction before the
 * numeric details.
 */
export function StatementFlow({ summary }: { readonly summary: StatementSummary }) {
  const { opening, income, expenses, closing, currency, windowFrom, windowTo } = summary;
  const net = income - expenses;
  const windowLabel =
    (windowFrom ? new Date(windowFrom).toLocaleDateString() : 'Beginning') +
    ' → ' +
    new Date(windowTo).toLocaleDateString();

  return (
    <GradientPanel className="p-6">
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-semibold text-foreground">Statement summary</h2>
          <p className="text-xs text-muted-foreground">{windowLabel}</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Net movement
          </div>
          <div
            className={`text-lg font-semibold tabular-nums ${
              net >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'
            }`}
          >
            {net >= 0 ? '+' : '−'}
            {new Intl.NumberFormat().format(Math.abs(net))} {currency}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <StatementFlowCell
          label="Opening"
          value={opening}
          currency={currency}
          hint="Balance carried in"
        />
        <StatementFlowCell
          label="Income"
          value={income}
          currency={currency}
          hint="Payments received"
          accent="income"
          icon={<Plus className="h-3.5 w-3.5" />}
        />
        <StatementFlowCell
          label="Expenses"
          value={expenses}
          currency={currency}
          hint="Money out"
          accent="expense"
          icon={<Minus className="h-3.5 w-3.5" />}
        />
        <StatementFlowCell
          label="Closing"
          value={closing}
          currency={currency}
          hint="Balance carried out"
          emphasise
        />
      </div>
    </GradientPanel>
  );
}
