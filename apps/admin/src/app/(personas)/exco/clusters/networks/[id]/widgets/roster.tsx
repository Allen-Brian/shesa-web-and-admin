'use client';

import { useMemo, useState } from 'react';

import {
  Badge,
  DataTable,
  EntityTablePanel,
  type ColDef,
  type GridApi,
  type ICellRendererParams,
} from '@shesa/ui';

import type { ExcoBadgeInfo } from '@/components/governance/exco-badge';
import { MemberName } from '@/components/governance/member-name';

export interface RosterRow {
  readonly id: string;
  readonly full_name: string;
  readonly badge: ExcoBadgeInfo | null;
  readonly batch_year: number | null;
  readonly location: string | null;
  readonly membership_status: string | null;
  readonly branch_name: string | null;
  readonly field: string | null;
  readonly [key: string]: unknown;
}

/**
 * Network roster — same read-only shape as the House roster, plus a
 * `Field` column at the end (specialization within the network). No
 * selection, no bulk actions; row click navigates to a member profile
 * placeholder for now.
 */
export function NetworkRoster({ data }: { readonly data: readonly RosterRow[] }) {
  const [gridApi, setGridApi] = useState<GridApi<RosterRow> | null>(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter((row) => {
      if (row.full_name.toLowerCase().includes(q)) return true;
      if (row.batch_year != null && String(row.batch_year).includes(q)) return true;
      if (row.branch_name?.toLowerCase().includes(q)) return true;
      if (row.field?.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [data, search]);

  const columnDefs = useMemo<ColDef<RosterRow>[]>(
    () => [
      {
        headerName: 'Full name',
        field: 'full_name',
        flex: 2,
        minWidth: 200,
        cellRenderer: (p: ICellRendererParams<RosterRow, string>) =>
          p.data ? <MemberName name={p.data.full_name} badge={p.data.badge} /> : null,
      },
      {
        headerName: 'Batch',
        field: 'batch_year',
        width: 110,
        valueFormatter: (p) => (p.value == null ? '—' : String(p.value)),
      },
      {
        headerName: 'Location',
        field: 'location',
        flex: 2,
        minWidth: 200,
        valueFormatter: (p) => p.value ?? '—',
      },
      {
        headerName: 'Membership',
        field: 'membership_status',
        width: 150,
        cellRenderer: (params: ICellRendererParams<RosterRow, string | null>) => (
          <MembershipBadge status={params.value ?? null} />
        ),
      },
      {
        headerName: 'Branch',
        field: 'branch_name',
        flex: 2,
        minWidth: 180,
        valueFormatter: (p) => p.value ?? '—',
      },
      {
        headerName: 'Field',
        field: 'field',
        flex: 1,
        minWidth: 160,
        valueFormatter: (p) => p.value ?? '—',
      },
    ],
    [],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
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
      <DataTable<RosterRow>
        rowData={filtered as RosterRow[]}
        columnDefs={columnDefs}
        getRowId={(params) => params.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        showColumnPicker={false}
        selectable={false}
      />
    </div>
  );
}

function MembershipBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  const styles: Record<string, string> = {
    active: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    passive: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  };
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <Badge variant="outline" className={styles[status] ?? 'border-border text-foreground'}>
      {label}
    </Badge>
  );
}
