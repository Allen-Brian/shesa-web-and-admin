'use client';

import { Badge } from '@shesa/ui';

const STYLES: Record<string, string> = {
  open: 'border-destructive/40 bg-destructive/10 text-destructive',
  partial: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  paid: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  cancelled: 'border-border bg-muted/30 text-muted-foreground',
  forgiven: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
};

/**
 * Coloured status pill for an obligation. Stripped down for the
 * obligations table + payment dialog.
 */
export function ObligationStatusBadge({ status }: { readonly status: string }) {
  return (
    <Badge variant="outline" className={`capitalize ${STYLES[status] ?? 'border-border'}`}>
      {status || '—'}
    </Badge>
  );
}
