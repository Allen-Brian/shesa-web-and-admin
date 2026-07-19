import { Badge } from '@shesa/ui';

/**
 * Coloured pill for the raw expense status column values (recorded,
 * pending_approval, approved). The two shape overrides — reversal
 * row + is-reversed original — are handled by the status cell up in
 * the columns file so this component stays literal.
 */
export function ExpenseStatusBadge({ status }: { readonly status: string }) {
  const styles: Record<string, string> = {
    recorded: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    pending_approval: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    approved: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  };
  const label =
    status === 'pending_approval'
      ? 'Pending approval'
      : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <Badge variant="outline" className={styles[status] ?? 'border-border text-foreground'}>
      {label}
    </Badge>
  );
}
