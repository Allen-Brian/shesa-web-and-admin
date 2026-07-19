import type { SerialRow } from './contributions-types';

/**
 * "Progress" column — raised amount vs goal (if any) with a slim
 * bar. Shapes without a goal (open contributions) drop the
 * comparison and show the contributor count instead of an ambiguous
 * "of —".
 */
export function ContributionProgressCell({ row }: { readonly row: SerialRow }) {
  const goal = row.goalAmount;
  const raised = row.raised;
  const pct = goal && goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : null;
  return (
    <div className="flex w-full flex-col gap-1 py-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-foreground">
          {new Intl.NumberFormat().format(Math.round(raised))} {row.currency}
        </span>
        {goal ? (
          <span className="text-muted-foreground">
            of {new Intl.NumberFormat().format(goal)} {pct != null && `· ${pct}%`}
          </span>
        ) : (
          <span className="text-muted-foreground">
            {row.contributorCount} contributor{row.contributorCount === 1 ? '' : 's'}
          </span>
        )}
      </div>
      {goal && (
        <div className="h-1.5 w-full overflow-hidden rounded bg-muted">
          <div className="h-full rounded bg-primary" style={{ width: `${pct ?? 0}%` }} />
        </div>
      )}
    </div>
  );
}
