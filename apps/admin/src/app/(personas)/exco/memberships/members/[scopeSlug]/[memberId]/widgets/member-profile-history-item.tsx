import type { MembershipHistoryRow } from './member-profile-types';
import { ProfileHistoryStatusBadge } from './profile-history-status-badge';

/**
 * One row in the member's membership history list — scope name +
 * status pill on the top row, timestamped events + join method
 * underneath. Timestamps skip when null.
 */
export function MemberProfileHistoryItem({ row }: { readonly row: MembershipHistoryRow }) {
  return (
    <li className="flex flex-col gap-1 rounded-xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium text-foreground">
          {row.scope_name} <span className="text-xs text-muted-foreground">· {row.scope_type}</span>
        </div>
        <ProfileHistoryStatusBadge status={row.status} />
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>Joined: {row.joined_at ? new Date(row.joined_at).toLocaleDateString() : '—'}</span>
        {row.left_at && <span>Left: {new Date(row.left_at).toLocaleDateString()}</span>}
        {row.transferred_at && (
          <span>Transferred: {new Date(row.transferred_at).toLocaleDateString()}</span>
        )}
        <span>via {row.join_method}</span>
      </div>
    </li>
  );
}
