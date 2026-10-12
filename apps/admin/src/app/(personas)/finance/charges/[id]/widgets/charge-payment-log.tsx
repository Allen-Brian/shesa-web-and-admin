import { Badge, GradientPanel } from '@shesa/ui';

import type { PoolPayment } from './charge-detail-types';
import { formatMethod, formatMoney } from './shared-formatters';

/**
 * Chronological payment table for the scope-body reports flavour.
 * Replaces the ranked-member panels since a single obligor per row
 * makes those uninteresting. Reversals get their own amber accent so
 * they don't visually inflate the total at a glance.
 */
export function ChargePaymentLog({
  rows,
  currency,
}: {
  readonly rows: readonly PoolPayment[];
  readonly currency: string;
}) {
  if (rows.length === 0) {
    return (
      <GradientPanel className="flex flex-col gap-3 p-5">
        <span className="text-sm font-medium text-foreground">Payment log</span>
        <p className="text-xs italic text-muted-foreground">
          No payments recorded against this charge yet.
        </p>
      </GradientPanel>
    );
  }
  return (
    <GradientPanel className="flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-foreground">Payment log</span>
        <span className="text-xs text-muted-foreground">
          {rows.length} {rows.length === 1 ? 'entry' : 'entries'} · newest first
        </span>
      </div>
      <div className="overflow-hidden rounded-md border border-border/50">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Paid by</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
              <th className="px-3 py-2 text-left font-medium">Method</th>
              <th className="px-3 py-2 text-left font-medium">Source</th>
              <th className="px-3 py-2 text-right font-medium">When</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-border/50">
                <td className="px-3 py-2 text-foreground">
                  {p.payerLabel}
                  {p.isReversal && (
                    <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      reversal
                    </span>
                  )}
                </td>
                <td
                  className={`px-3 py-2 text-right tabular-nums ${
                    p.isReversal ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'
                  }`}
                >
                  {p.isReversal ? '-' : ''}
                  {formatMoney(p.amount, currency)}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{formatMethod(p.method)}</td>
                <td className="px-3 py-2">
                  <Badge
                    variant="outline"
                    className={
                      p.source === 'auto'
                        ? 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300'
                        : 'border-border text-foreground'
                    }
                  >
                    {p.source === 'auto' ? 'Auto' : 'Manual'}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-right text-muted-foreground">
                  {new Date(p.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GradientPanel>
  );
}
