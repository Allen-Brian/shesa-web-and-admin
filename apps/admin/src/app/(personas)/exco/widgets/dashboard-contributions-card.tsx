import { Target } from 'lucide-react';

import { GradientPanel } from '@shesa/ui';

import { DashboardContributionRow } from './dashboard-contribution-row';
import { DashboardEmptyBlock } from './dashboard-empty-block';
import type { ContributionsBlock } from './dashboard-types';

export function DashboardContributionsCard({ block }: { readonly block: ContributionsBlock }) {
  return (
    <GradientPanel className="p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Target className="h-4 w-4 text-primary" />
            Contributions
          </h2>
          <p className="text-xs text-muted-foreground">Live goals + open drives</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Total raised
          </div>
          <div className="text-lg font-semibold text-foreground tabular-nums">
            {new Intl.NumberFormat().format(Math.round(block.total))} {block.currency}
          </div>
        </div>
      </div>

      {block.rows.length === 0 ? (
        <DashboardEmptyBlock label="No active contributions at your scope right now." />
      ) : (
        <ul className="flex flex-col gap-3">
          {block.rows.map((r) => (
            <li key={r.id}>
              <DashboardContributionRow row={r} />
            </li>
          ))}
        </ul>
      )}
    </GradientPanel>
  );
}
