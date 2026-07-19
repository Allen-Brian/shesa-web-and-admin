import { Badge } from '@shesa/ui';

const STYLES: Record<string, string> = {
  active: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  passive: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  pending: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  transferred: 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  left: 'border-muted-foreground/30 bg-muted/40 text-muted-foreground',
  rejected: 'border-destructive/40 bg-destructive/10 text-destructive',
};

/**
 * Status pill for a row in the member's membership history. Covers all
 * six lifecycle states (active/passive/pending/transferred/left/rejected)
 * — different from `MembershipStatusBadge` which is scoped to the three
 * relevant to the current-members table.
 */
export function ProfileHistoryStatusBadge({ status }: { readonly status: string }) {
  return (
    <Badge variant="outline" className={STYLES[status] ?? 'border-border text-foreground'}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
