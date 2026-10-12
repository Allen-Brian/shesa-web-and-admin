'use client';

import { Badge } from '@shesa/ui';

const STYLES: Record<string, string> = {
  active: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  draft: 'border-border bg-muted/40 text-foreground',
  paused: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  archived: 'border-border bg-muted/40 text-muted-foreground',
};

/**
 * Coloured status pill for a charge row. Matches the Obligations-page
 * badge conventions so the two surfaces feel like one dashboard.
 *
 * Deliberately not shared with `finance/charges`' badge of the same
 * name: that one renders `archived` in destructive red and this one in
 * muted grey. Reconciling them is a design decision about what archived
 * should look like, not a refactor.
 */
export function ChargeStatusBadge({ status }: { readonly status: string }) {
  return (
    <Badge variant="outline" className={`h-5 capitalize ${STYLES[status] ?? STYLES.draft}`}>
      {status || '—'}
    </Badge>
  );
}
