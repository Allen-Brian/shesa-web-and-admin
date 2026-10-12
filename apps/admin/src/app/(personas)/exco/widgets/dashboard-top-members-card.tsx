import { Crown } from 'lucide-react';

import { GradientPanel } from '@shesa/ui';

import { DashboardEmptyBlock } from './dashboard-empty-block';
import { DashboardTopMemberCard } from './dashboard-top-member-card';
import type { TopMember } from './dashboard-types';

export function DashboardTopMembersCard({ members }: { readonly members: readonly TopMember[] }) {
  return (
    <GradientPanel className="p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Crown className="h-4 w-4 text-primary" />
            Top members by engagement
          </h2>
          <p className="text-xs text-muted-foreground">
            Committed &gt; Engaged &gt; Normal &gt; Dormant, weighted across memberships
          </p>
        </div>
      </div>
      {members.length === 0 ? (
        <DashboardEmptyBlock label="No engagement data yet." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {members.map((m, i) => (
            <DashboardTopMemberCard key={m.id} member={m} rank={i + 1} />
          ))}
        </div>
      )}
    </GradientPanel>
  );
}
