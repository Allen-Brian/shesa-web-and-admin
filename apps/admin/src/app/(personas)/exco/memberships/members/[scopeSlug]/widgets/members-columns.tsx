import type { ColDef, ICellRendererParams } from '@shesa/ui';

import { MemberName } from '@/components/governance/member-name';
import { EngagementStars } from '@/components/memberships/engagement-stars';
import { RegistrationIcon } from '@/components/memberships/registration-icon';
import type { EngagementTier } from '@shesa/domain/memberships';

import { MemberRowActionsMenu } from './member-row-actions-menu';
import { MembershipStatusBadge } from './membership-status-badge';
import type { EngagementTierValue, SerialRow } from './members-table-types';

interface BuildMembersColumnsArgs {
  readonly isBranch: boolean;
  readonly onRemove: (row: SerialRow) => void;
  readonly onSetEngagement: (row: SerialRow, tier: EngagementTierValue) => void;
}

/**
 * Column defs for the Members table. Context-aware: hides the Branch
 * column when the viewer scope is itself a branch (redundant). Two-column
 * rule: engagement + membership_status stay separate — never merge.
 */
export function buildMembersColumns({
  isBranch,
  onRemove,
  onSetEngagement,
}: BuildMembersColumnsArgs): ColDef<SerialRow>[] {
  const defs: ColDef<SerialRow>[] = [
    {
      headerName: 'S/N',
      field: 'serial',
      width: 72,
      maxWidth: 72,
      sortable: false,
      filter: false,
      suppressMovable: true,
    },
    {
      headerName: 'Name',
      field: 'full_name',
      flex: 2,
      minWidth: 200,
      cellRenderer: (p: ICellRendererParams<SerialRow, string>) =>
        p.data ? <MemberName name={p.data.full_name} badge={p.data.badge} /> : null,
    },
    {
      headerName: 'Batch',
      field: 'batch_name',
      width: 120,
      valueFormatter: (p) => p.value ?? '—',
    },
  ];

  if (!isBranch) {
    defs.push({
      headerName: 'Branch',
      field: 'branch_name',
      width: 160,
      valueFormatter: (p) => p.value ?? '—',
    });
  }

  defs.push(
    {
      headerName: 'Network',
      field: 'network_name',
      width: 140,
      valueFormatter: (p) => p.value ?? '—',
    },
    {
      headerName: 'House',
      field: 'house_name',
      width: 120,
      valueFormatter: (p) => p.value ?? '—',
    },
    {
      headerName: 'Location',
      field: 'location',
      flex: 1.5,
      minWidth: 160,
      valueFormatter: (p) => p.value ?? '—',
    },
    {
      headerName: 'Membership',
      field: 'membership_status',
      width: 130,
      cellRenderer: (p: ICellRendererParams<SerialRow, string | null>) => (
        <MembershipStatusBadge status={p.value ?? null} />
      ),
    },
    {
      headerName: 'Engagement',
      field: 'engagement',
      width: 140,
      cellRenderer: (p: ICellRendererParams<SerialRow, string | null>) => (
        <EngagementStars tier={(p.value ?? null) as EngagementTier | null} />
      ),
    },
    {
      headerName: 'Registration',
      field: 'registration_state',
      width: 160,
      cellRenderer: (p: ICellRendererParams<SerialRow, string | null>) => (
        <RegistrationIcon state={p.value ?? null} />
      ),
    },
    {
      headerName: 'Joined',
      field: 'joined_at',
      width: 130,
      valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString() : '—'),
    },
    {
      headerName: 'Actions',
      colId: 'actions',
      width: 96,
      sortable: false,
      filter: false,
      suppressMovable: true,
      cellRenderer: (params: ICellRendererParams<SerialRow>) =>
        params.data ? (
          <MemberRowActionsMenu
            row={params.data}
            onRemove={() => onRemove(params.data as SerialRow)}
            onSetEngagement={(tier) => onSetEngagement(params.data as SerialRow, tier)}
          />
        ) : null,
    },
  );

  return defs;
}
