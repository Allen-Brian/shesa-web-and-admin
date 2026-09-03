'use client';

import type { SerialRow } from './exco-charge-widget-types';

/**
 * Stacked name + description cell. Description wraps to two lines
 * (line-clamp-2) so a longer blurb reads without stretching every row
 * to full height.
 */
export function ChargeNameCell({ row }: { readonly row: SerialRow }) {
  return (
    <div className="flex flex-col justify-center py-1 leading-snug">
      <span className="text-sm font-medium text-foreground">{row.name}</span>
      {row.description && (
        <span className="line-clamp-2 text-xs text-muted-foreground">{row.description}</span>
      )}
    </div>
  );
}
