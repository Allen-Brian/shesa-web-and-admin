import type { SerialRow } from './contributions-types';

/**
 * "Progress" column. Two shapes:
 *  - Has a target (goalAmount > 0): raised / target + slim progress
 *    bar + percentage.
 *  - No target: just the raised amount. The contributor count sits
 *    in its own column now, so this cell stays focused on money.
 */
export function ContributionProgressCell({ row }: { readonly row: SerialRow }) {
  const goal = row.goalAmount;
  const raised = row.raised;
  const hasTarget = goal != null && goal > 0;
  const pct = hasTarget ? Math.min(100, Math.round((raised / goal) * 100)) : null;
  return (
    <div className="flex w-full flex-col gap-1 py-1">
      <div className="flex items-center justify-between text-xs">
        <span className="tabular-nums text-foreground">
          {new Intl.NumberFormat().format(Math.round(raised))} {row.currency}
        </span>
        {hasTarget && (
          <span className="text-muted-foreground">
            of {new Intl.NumberFormat().format(goal)}
            {pct != null && ` · ${pct}%`}
          </span>
        )}
      </div>
      {hasTarget && (
        <div className="h-1.5 w-full overflow-hidden rounded bg-muted">
          <div className="h-full rounded bg-primary" style={{ width: `${pct ?? 0}%` }} />
        </div>
      )}
    </div>
  );
}
