import { Badge } from '@shesa/ui';

/** Coloured status pill for a charge's lifecycle status. */
export function ChargeStatusChip({ status }: { readonly status: string }) {
  const styles: Record<string, string> = {
    active: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    draft: 'border-border bg-muted/40 text-foreground',
    paused: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    archived: 'border-border bg-muted/40 text-muted-foreground',
  };
  return (
    <Badge variant="outline" className={`capitalize ${styles[status] ?? styles.draft}`}>
      {status}
    </Badge>
  );
}
