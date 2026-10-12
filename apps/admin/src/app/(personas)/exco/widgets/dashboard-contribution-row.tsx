import type { ContributionRow } from './dashboard-types';

export function DashboardContributionRow({ row }: { readonly row: ContributionRow }) {
  const pct =
    row.goal && row.goal > 0 ? Math.min(100, Math.round((row.raised / row.goal) * 100)) : null;

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-background/40 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-medium text-foreground">{row.name}</span>
          <span className="text-[11px] text-muted-foreground">
            {row.scopeName} · {row.shape}
          </span>
        </div>
        <span className="text-sm font-medium text-foreground tabular-nums">
          {new Intl.NumberFormat().format(Math.round(row.raised))}
          {row.goal && (
            <span className="text-muted-foreground">
              {' '}
              / {new Intl.NumberFormat().format(row.goal)}
            </span>
          )}{' '}
          <span className="text-xs text-muted-foreground">{row.currency}</span>
        </span>
      </div>
      {pct !== null ? (
        <>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[11px] text-muted-foreground tabular-nums">{pct}% of goal</span>
        </>
      ) : (
        <span className="text-[11px] text-muted-foreground">Open drive · no fixed goal</span>
      )}
    </div>
  );
}
