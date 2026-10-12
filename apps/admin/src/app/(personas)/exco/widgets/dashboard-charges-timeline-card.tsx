'use client';

import { BadgeDollarSign } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { GradientPanel } from '@shesa/ui';

import {
  CHART_PRIMARY,
  CHART_SECONDARY,
  tooltipLabelStyle,
  tooltipStyle,
} from './dashboard-chart-config';
import { formatCompact } from '@/lib/finance/format-money';

interface DashboardChargesTimelineCardProps {
  readonly data: readonly {
    readonly month: string;
    readonly expected: number;
    readonly paid: number;
  }[];
}

export function DashboardChargesTimelineCard({ data }: DashboardChargesTimelineCardProps) {
  return (
    <GradientPanel className="flex flex-col gap-3 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <BadgeDollarSign className="h-4 w-4 text-primary" />
            Charges: expected vs paid
          </h2>
          <p className="text-xs text-muted-foreground">Per-period obligations landing each month</p>
        </div>
      </div>
      <div className="h-52 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[...data]} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--color-muted-foreground)" />
            <YAxis
              tick={{ fontSize: 11 }}
              stroke="var(--color-muted-foreground)"
              tickFormatter={(v) => formatCompact(Number(v))}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={tooltipLabelStyle}
              formatter={(v) => new Intl.NumberFormat().format(Number(v))}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="expected" fill={CHART_SECONDARY} radius={[4, 4, 0, 0]} name="Expected" />
            <Bar dataKey="paid" fill={CHART_PRIMARY} radius={[4, 4, 0, 0]} name="Paid" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </GradientPanel>
  );
}
