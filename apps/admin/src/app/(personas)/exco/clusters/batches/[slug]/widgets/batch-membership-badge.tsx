import { Badge } from '@shesa/ui';

const STYLES: Record<string, string> = {
  active: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  passive: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  pending: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
};

/**
 * Membership status pill for the batch members table. Handles the
 * three active-cluster statuses (active / passive / pending) plus a
 * muted em-dash for members with no membership.
 */
export function BatchMembershipBadge({ status }: { readonly status: string | null }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge variant="outline" className={STYLES[status] ?? 'border-border text-foreground'}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
