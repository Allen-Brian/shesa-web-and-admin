'use client';

import { useMemo } from 'react';

import { StatsCard } from '@shesa/ui';

import type { InviteRow } from './invite-widget-types';

interface InvitesStatsProps {
  readonly rows: readonly InviteRow[];
}

/**
 * Four at-a-glance counters — awaiting claim, claimed, not invited,
 * failed. Failed is orthogonal to claim_status (an invite can be
 * dispatched-then-errored), so it's counted independently.
 */
export function InvitesStats({ rows }: InvitesStatsProps) {
  const stats = useMemo(() => {
    let invited = 0;
    let claimed = 0;
    let failed = 0;
    let notInvited = 0;
    for (const r of rows) {
      if (r.inviteError) failed += 1;
      if (r.claimStatus === 'invited') invited += 1;
      else if (r.claimStatus === 'claimed') claimed += 1;
      else if (r.claimStatus === 'not_invited') notInvited += 1;
    }
    return { invited, claimed, failed, notInvited };
  }, [rows]);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatsCard label="Awaiting claim" value={stats.invited} />
      <StatsCard label="Claimed" value={stats.claimed} />
      <StatsCard label="Not invited" value={stats.notInvited} />
      <StatsCard label="Failed" value={stats.failed} />
    </div>
  );
}
