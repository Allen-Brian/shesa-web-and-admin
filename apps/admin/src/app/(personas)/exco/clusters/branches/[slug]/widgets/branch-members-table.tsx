'use client';

import { useMemo, useState } from 'react';

import {
  DataTable,
  EntityTablePanel,
  type ColDef,
  type GridApi,
  type ICellRendererParams,
} from '@shesa/ui';

import { MemberName } from '@/components/governance/member-name';

import { BranchMembershipBadge } from './branch-membership-badge';
import type { BranchMemberRow } from './branch-detail-types';

/**
 * Members sub-table shown on the Branch detail page's Members tab.
 * Simple search + read-only rows — no bulk actions here; management
 * lives at /exco/memberships/members.
 */
export function BranchMembersTable({ members }: { readonly members: readonly BranchMemberRow[] }) {
  const [gridApi, setGridApi] = useState<GridApi<BranchMemberRow> | null>(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      if (m.full_name.toLowerCase().includes(q)) return true;
      if (m.batch_year && String(m.batch_year).includes(q)) return true;
      if (m.network_name.toLowerCase().includes(q)) return true;
      if (m.house_name.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [members, search]);

  const columnDefs = useMemo<ColDef<BranchMemberRow>[]>(
    () => [
      {
        headerName: 'Full name',
        field: 'full_name',
        flex: 2,
        minWidth: 200,
        cellRenderer: (p: ICellRendererParams<BranchMemberRow, string>) =>
          p.data ? <MemberName name={p.data.full_name} badge={p.data.badge} /> : null,
      },
      {
        headerName: 'Batch',
        field: 'batch_year',
        width: 100,
        valueFormatter: (p) => (p.value == null ? '—' : String(p.value)),
      },
      { headerName: 'House', field: 'house_name', width: 140 },
      { headerName: 'Network', field: 'network_name', width: 160 },
      {
        headerName: 'Membership',
        field: 'membership_status',
        width: 130,
        cellRenderer: (p: ICellRendererParams<BranchMemberRow, string>) => (
          <BranchMembershipBadge status={p.value ?? null} />
        ),
      },
      {
        headerName: 'Location',
        field: 'location',
        flex: 2,
        minWidth: 200,
        valueFormatter: (p) => p.value ?? '—',
      },
    ],
    [],
  );

  return (
    <>
      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'member' : 'members'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={false}
        hideCreate
        createLabel=""
        onCreate={() => undefined}
      />
      <DataTable<BranchMemberRow>
        rowData={filtered as BranchMemberRow[]}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        showColumnPicker={false}
        selectable={false}
      />
    </>
  );
}
