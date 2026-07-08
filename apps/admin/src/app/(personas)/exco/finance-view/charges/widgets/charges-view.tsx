'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  Badge,
  DataTable,
  EntityTablePanel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatsCard,
  type ColDef,
  type GridApi,
  type ICellRendererParams,
} from '@shesa/ui';

export interface ChargeRow {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly scopeName: string;
  readonly shape: string;
  readonly baseAmount: number | null;
  readonly currency: string;
  readonly recurrence: string;
  readonly recurrenceInterval: number;
  readonly status: string;
  readonly activationDate: string | null;
}

type SerialRow = ChargeRow & { readonly serial: number };

interface Props {
  readonly rows: readonly ChargeRow[];
}

export function ExcoChargesView({ rows }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [gridApi, setGridApi] = useState<GridApi<SerialRow> | null>(null);

  const filtered = useMemo<readonly SerialRow[]>(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (statusFilter !== 'all' && r.status !== statusFilter) return false;
        if (!q) return true;
        if (r.name.toLowerCase().includes(q)) return true;
        if (r.scopeName.toLowerCase().includes(q)) return true;
        if (r.description?.toLowerCase().includes(q)) return true;
        return false;
      })
      .map((r, i) => ({ ...r, serial: i + 1 }));
  }, [rows, search, statusFilter]);

  const total = rows.length;
  const active = rows.filter((r) => r.status === 'active').length;
  const draft = rows.filter((r) => r.status === 'draft').length;
  const archived = rows.filter((r) => r.status === 'archived').length;

  const columnDefs = useMemo<ColDef<SerialRow>[]>(
    () => [
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
        field: 'name',
        flex: 3,
        minWidth: 200,
        cellRenderer: (p: ICellRendererParams<SerialRow, string>) =>
          p.data ? (
            <div className="flex flex-col leading-tight">
              <span className="font-medium text-foreground">{p.data.name}</span>
              {p.data.description && (
                <span className="truncate text-xs italic text-muted-foreground">
                  {p.data.description}
                </span>
              )}
            </div>
          ) : null,
      },
      { headerName: 'Scope', field: 'scopeName', flex: 2, minWidth: 140 },
      {
        headerName: 'Amount',
        field: 'baseAmount',
        flex: 1,
        minWidth: 130,
        cellRenderer: (p: ICellRendererParams<SerialRow, number>) =>
          p.data && p.data.baseAmount != null ? (
            <span className="text-sm text-foreground tabular-nums">
              {new Intl.NumberFormat().format(p.data.baseAmount)} {p.data.currency}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        headerName: 'Recurrence',
        field: 'recurrence',
        flex: 1,
        minWidth: 130,
        valueFormatter: (p) =>
          p.data ? formatRecurrence(p.data.recurrence, p.data.recurrenceInterval) : '',
      },
      {
        headerName: 'Status',
        field: 'status',
        flex: 0.9,
        minWidth: 110,
        cellRenderer: (p: ICellRendererParams<SerialRow, string>) => (
          <StatusBadge status={p.value ?? ''} />
        ),
      },
    ],
    [],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Total charges" value={total} />
        <StatsCard label="Active" value={active} />
        <StatsCard label="Draft" value={draft} />
        <StatsCard label="Archived" value={archived} />
      </div>

      <EntityTablePanel
        count={filtered.length}
        countLabel={filtered.length === 1 ? 'charge' : 'charges'}
        search={search}
        onSearchChange={setSearch}
        gridApi={gridApi}
        canCreate={false}
        hideCreate
        createLabel=""
        onCreate={() => undefined}
        filters={
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
            <SelectTrigger className="h-8 w-40 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <DataTable<SerialRow>
        rowData={filtered as SerialRow[]}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.id}
        onGridReady={(e) => setGridApi(e.api)}
        onRowClicked={(e) => e.data && router.push(`/exco/finance-view/charges/${e.data.id}`)}
        showColumnPicker={false}
        selectable={false}
      />
    </div>
  );
}

function StatusBadge({ status }: { readonly status: string }) {
  const styles: Record<string, string> = {
    active: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    draft: 'border-border bg-muted/40 text-foreground',
    paused: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    archived: 'border-border bg-muted/40 text-muted-foreground',
  };
  return (
    <Badge variant="outline" className={`capitalize ${styles[status] ?? styles.draft}`}>
      {status || '—'}
    </Badge>
  );
}

function formatRecurrence(recurrence: string, interval: number): string {
  if (recurrence === 'one_time') return 'One-time';
  const label =
    recurrence === 'biannual'
      ? 'half-year'
      : recurrence === 'quarterly'
        ? 'quarter'
        : recurrence === 'yearly'
          ? 'year'
          : recurrence === 'monthly'
            ? 'month'
            : recurrence;
  return interval === 1 ? `Every ${label}` : `Every ${interval} ${label}s`;
}
