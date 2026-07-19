'use client';

import { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { GradientPanel } from '@shesa/ui';

import { CHART_PRIMARY, tooltipLabelStyle, tooltipStyle } from './dashboard-chart-config';
import { DashboardTrendBadge } from './dashboard-trend-badge';

interface DashboardMembershipGrowthCardProps {
  readonly data: readonly { readonly month: string; readonly members: number }[];
}

export function DashboardMembershipGrowthCard({ data }: DashboardMembershipGrowthCardProps) {
  const growth = useMemo(() => {
    if (data.length < 2) return 0;
    const first = data[0]!.members;
    const last = data[data.length - 1]!.members;
    if (first === 0) return last > 0 ? 100 : 0;
    return Math.round(((last - first) / first) * 100);
  }, [data]);

  return (
    <GradientPanel className="flex flex-col gap-3 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <TrendingUp className="h-4 w-4 text-primary" />
            Membership growth
          </h2>
          <p className="text-xs text-muted-foreground">Cumulative geographic memberships</p>
        </div>
        <DashboardTrendBadge value={growth} />
      </div>
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={[...data]} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_PRIMARY} stopOpacity={0.35} />
                <stop offset="100%" stopColor={CHART_PRIMARY} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
            <YAxis
              tick={{ fontSize: 11 }}
              stroke="var(--color-muted-foreground)"
              allowDecimals={false}
            />
            <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
            <Area
              type="monotone"
              dataKey="members"
              stroke={CHART_PRIMARY}
              strokeWidth={2}
              fill="url(#growthGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </GradientPanel>
  );
}
