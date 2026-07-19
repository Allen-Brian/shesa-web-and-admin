'use client';

import { Users } from 'lucide-react';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import { GradientPanel } from '@shesa/ui';

import {
  CHART_MUTED,
  CHART_PRIMARY,
  tooltipLabelStyle,
  tooltipStyle,
} from './dashboard-chart-config';

interface DashboardRegistrationPieCardProps {
  readonly data: readonly { readonly name: string; readonly value: number }[];
  readonly title: string;
  readonly compact?: boolean;
}

export function DashboardRegistrationPieCard({
  data,
  title,
  compact = false,
}: DashboardRegistrationPieCardProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const registered = data.find((d) => d.name === 'Registered')?.value ?? 0;
  const pct = total > 0 ? Math.round((registered / total) * 100) : 0;
  const colors = [CHART_PRIMARY, CHART_MUTED];

  return (
    <GradientPanel className={`flex flex-col gap-3 ${compact ? 'p-4' : 'p-5'}`}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Users className="h-4 w-4 text-primary" />
            {title}
          </h2>
          {!compact && (
            <p className="text-xs text-muted-foreground">
              Members with vs. without an active geographic membership
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Coverage
          </div>
          <div className="text-lg font-semibold text-foreground tabular-nums">{pct}%</div>
        </div>
      </div>
      <div className={compact ? 'h-40 w-full' : 'h-52 w-full'}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={[...data]}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={compact ? 34 : 45}
              outerRadius={compact ? 56 : 72}
              paddingAngle={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </GradientPanel>
  );
}
