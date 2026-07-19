import type { TrendingUp } from 'lucide-react';

import { GradientPanel } from '@shesa/ui';

import type { RankPanelRow } from './charge-detail-types';

/**
 * Top-N leaderboard card — "Top payers", "Most behind", "Largest
 * payments", "Most recent". Icon + tinted colour framing on the
 * header row, then numbered list of label + value.
 */
export function ChargeRankPanel({
  title,
  icon: Icon,
  iconClass,
  rows,
  empty,
}: {
  readonly title: string;
  readonly icon: typeof TrendingUp;
  readonly iconClass: string;
  readonly rows: readonly RankPanelRow[];
  readonly empty: string;
}) {
  return (
    <GradientPanel className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className={`h-4 w-4 ${iconClass}`} />
        {title}
      </div>
      {rows.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rows.map((r, i) => (
            <li key={r.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                  {i + 1}
                </span>
                <span className="truncate text-foreground">{r.label}</span>
              </span>
              <span className="shrink-0 text-xs font-medium text-foreground tabular-nums">
                {r.value}
              </span>
            </li>
          ))}
        </ul>
      )}
    </GradientPanel>
  );
}
