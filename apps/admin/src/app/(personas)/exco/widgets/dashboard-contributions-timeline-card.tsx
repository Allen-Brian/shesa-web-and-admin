'use client';

import { Target } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { GradientPanel } from '@shesa/ui';

import { CHART_PRIMARY, tooltipLabelStyle, tooltipStyle } from './dashboard-chart-config';
import { formatCompact } from '@/lib/finance/format-money';

interface DashboardContributionsTimelineCardProps {
  readonly data: readonly { readonly month: string; readonly raised: number }[];
  readonly compact?: boolean;
}

/**
 * Compact variant only shows the last 6 months so it fits the sidebar
 * column comfortably. Total is still summed across whatever we chart.
 */
export function DashboardContributionsTimelineCard({
  data,
  compact = false,
}: DashboardContributionsTimelineCardProps) {
  const shown = compact ? data.slice(-6) : data;
  const total = shown.reduce((s, d) => s + d.raised, 0);
  const windowLabel = compact ? '6-month total' : '12-month total';

  return (
    <GradientPanel className={`flex flex-col gap-3 ${compact ? 'p-4' : 'p-5'}`}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Target className="h-4 w-4 text-primary" />
            Contributions timeline
          </h2>
          {!compact && (
            <p className="text-xs text-muted-foreground">
              Raised across goal / open / ticketed shapes
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {windowLabel}
          </div>
          <div className="text-lg font-semibold text-foreground tabular-nums">
            {formatCompact(total)}
          </div>
        </div>
      </div>
      <div className={compact ? 'h-36 w-full' : 'h-52 w-full'}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[...shown]} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: compact ? 10 : 11 }}
              stroke="var(--color-muted-foreground)"
            />
            <YAxis
              tick={{ fontSize: compact ? 10 : 11 }}
              stroke="var(--color-muted-foreground)"
              tickFormatter={(v) => formatCompact(Number(v))}
              width={compact ? 34 : 40}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={tooltipLabelStyle}
              formatter={(v) => new Intl.NumberFormat().format(Number(v))}
            />
            <Bar dataKey="raised" fill={CHART_PRIMARY} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GradientPanel>
  );
}
