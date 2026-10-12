import type { ReactNode } from 'react';

import { GradientPanel } from '@shesa/ui';

import { DashboardTrendBadge } from './dashboard-trend-badge';

interface DashboardStatCardProps {
  readonly label: string;
  readonly value: string;
  readonly sub?: ReactNode;
  readonly icon?: ReactNode;
  /**
   * Percent change vs previous month. Positive = growth, negative =
   * decline, 0 = flat. Omit to hide the badge.
   */
  readonly trend?: number;
}

/**
 * Strict 3-line stat card: label row, value row, sub row. The value row
 * is `whitespace-nowrap` so long amounts scale rather than wrapping to a
 * fourth line. Sub content is `truncate` for the same reason.
 */
export function DashboardStatCard({ label, value, sub, icon, trend }: DashboardStatCardProps) {
  return (
    <GradientPanel className="flex flex-col justify-between gap-2 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {icon && <span className="shrink-0 text-muted-foreground">{icon}</span>}
      </div>
      <div className="flex min-w-0 items-baseline gap-1.5">
        <span className="truncate whitespace-nowrap text-2xl font-semibold text-foreground tabular-nums leading-none">
          {value}
        </span>
        {trend !== undefined && <DashboardTrendBadge value={trend} />}
      </div>
      {sub && (
        <div className="truncate text-[11px] text-muted-foreground [&_span]:truncate">{sub}</div>
      )}
    </GradientPanel>
  );
}
