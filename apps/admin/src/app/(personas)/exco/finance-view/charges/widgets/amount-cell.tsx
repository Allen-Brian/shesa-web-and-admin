'use client';

import type { SerialRow } from './exco-charge-widget-types';

/**
 * Amount cell with the number prominent and the currency as a small
 * subtitle. Rows without a baseAmount (goal / open / donation shapes)
 * fall back to an em-dash to preserve column alignment.
 */
export function ChargeAmountCell({ row }: { readonly row: SerialRow }) {
  if (row.baseAmount == null) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <div className="flex items-baseline gap-1.5 leading-tight">
      <span className="text-sm font-semibold text-foreground tabular-nums">
        {new Intl.NumberFormat().format(row.baseAmount)}
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {row.currency}
      </span>
    </div>
  );
}
