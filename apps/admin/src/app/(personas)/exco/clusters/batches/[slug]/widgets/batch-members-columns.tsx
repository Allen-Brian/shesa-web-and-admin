import type { ColDef, ICellRendererParams } from '@shesa/ui';

import { MemberName } from '@/components/governance/member-name';

import { BatchMembershipBadge } from './batch-membership-badge';
import type { BatchMemberRow } from './batch-detail-types';

/**
 * Column defs for the batch members table. Layout: Code · Full name ·
 * House · Network · Branch · Membership · Location.
 */
export function buildBatchMembersColumns(): ColDef<BatchMemberRow>[] {
  return [
    {
      headerName: 'Code',
      field: 'member_code',
      width: 160,
      cellClass: 'text-xs',
    },
    {
      headerName: 'Full name',
      field: 'full_name',
      flex: 2,
      minWidth: 200,
      cellRenderer: (p: ICellRendererParams<BatchMemberRow, string>) =>
        p.data ? <MemberName name={p.data.full_name} badge={p.data.badge} /> : null,
    },
    { headerName: 'House', field: 'house_name', width: 140 },
    { headerName: 'Network', field: 'network_name', width: 160 },
    {
      headerName: 'Branch',
      field: 'branch_name',
      flex: 1.5,
      minWidth: 160,
      valueFormatter: (p) => p.value ?? '—',
    },
    {
      headerName: 'Membership',
      field: 'membership_status',
      width: 130,
      cellRenderer: (p: ICellRendererParams<BatchMemberRow, string | null>) => (
        <BatchMembershipBadge status={p.value ?? null} />
      ),
    },
    {
      headerName: 'Location',
      field: 'location',
      flex: 2,
      minWidth: 180,
      valueFormatter: (p) => p.value ?? '—',
    },
  ];
}
