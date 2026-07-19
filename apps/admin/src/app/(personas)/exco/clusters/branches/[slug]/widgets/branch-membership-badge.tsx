import { Badge } from '@shesa/ui';

const STYLES: Record<string, string> = {
  active: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  passive: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  pending: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
};

/**
 * Membership status pill for the branch members sub-table. Same three
 * statuses as the top-level members table; kept local to avoid a shared
 * import across feature folders.
 */
export function BranchMembershipBadge({ status }: { readonly status: string | null }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge variant="outline" className={STYLES[status] ?? 'border-border text-foreground'}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
