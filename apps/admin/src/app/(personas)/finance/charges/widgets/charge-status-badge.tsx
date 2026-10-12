import { Badge } from '@shesa/ui';

/**
 * Coloured status pill for the Status column. Draft is neutral, active
 * emerald, paused amber, archived destructive. Anything unknown falls
 * back to a border-only chip so an unknown status is visible but not
 * misclassified.
 */
export function ChargeStatusBadge({ status }: { readonly status: string }) {
  const styles: Record<string, string> = {
    draft: 'border-muted-foreground/30 bg-muted/40 text-muted-foreground',
    active: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    paused: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    archived: 'border-destructive/40 bg-destructive/10 text-destructive',
  };
  return (
    <Badge variant="outline" className={styles[status] ?? 'border-border text-foreground'}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
