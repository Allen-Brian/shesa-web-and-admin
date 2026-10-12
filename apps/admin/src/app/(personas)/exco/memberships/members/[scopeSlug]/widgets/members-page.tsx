'use client';

import { useState } from 'react';

import { StatsCard } from '@shesa/ui';

import type { ExcoBadgeInfo } from '@/components/governance/exco-badge';

import { AddMemberDialog } from './add-member-dialog';
import { MembersTable } from './members-table';

export interface MembersPageScope {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly scope_type: 'branch' | 'chapter';
  readonly chapter_kind: 'autonomous' | 'grouping' | null;
}

export interface MembersPageRow {
  readonly membership_id: string | null; // null for batch attribute-linked rows
  readonly member_id: string;
  readonly full_name: string;
  readonly badge: ExcoBadgeInfo | null;
  readonly batch_year: number | null;
  readonly batch_name: string | null;
  readonly network_name: string | null;
  readonly house_name: string | null;
  readonly branch_name: string | null;
  readonly location: string | null;
  readonly membership_status: 'active' | 'passive' | 'pending' | null;
  readonly engagement: 'dormant' | 'normal' | 'engaged' | 'committed' | 'pillar' | null;
  readonly registration_state:
    'not_required' | 'pending' | 'paid' | 'paid_on_behalf' | 'waived' | null;
  readonly joined_at: string | null;
}

interface MembersPageProps {
  readonly scope: MembersPageScope;
  readonly rows: readonly MembersPageRow[];
}

export function MembersPage({ scope, rows }: MembersPageProps) {
  const [addOpen, setAddOpen] = useState(false);

  const activeCount = rows.filter((r) => r.membership_status === 'active').length;
  const pendingCount = rows.filter((r) => r.membership_status === 'pending').length;
  const passiveCount = rows.filter((r) => r.membership_status === 'passive').length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Memberships · {scope.scope_type === 'chapter' ? 'Autonomous chapter' : 'Branch'}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{scope.name}</h1>
        <p className="text-xs text-muted-foreground">{scope.slug}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Total" value={rows.length} />
        <StatsCard label="Active" value={activeCount} />
        <StatsCard label="Passive" value={passiveCount} />
        <StatsCard label="Pending" value={pendingCount} />
      </div>

      <MembersTable scope={scope} rows={rows} onAdd={() => setAddOpen(true)} />

      <AddMemberDialog scope={scope} open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
