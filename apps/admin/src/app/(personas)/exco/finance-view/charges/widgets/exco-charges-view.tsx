'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  DataTable,
  EntityTablePanel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type GridApi,
} from '@shesa/ui';

import { ChargesEmptyState } from './empty-state';
import { ChargesKpiStrip } from './kpi-strip';
import type { ChargeRow, SerialRow } from './exco-charge-widget-types';
import { useChargeColumns } from './use-charge-columns';

export type { ChargeRow } from './exco-charge-widget-types';

interface Props {
  readonly rows: readonly ChargeRow[];
}

/**
 * Branch-admin's read-only Charges surface — KPI strip, filter panel,
 * table. Composes the split widgets so this container stays close to
 * the SRP line-count target.
 */
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
        return (
          r.name.toLowerCase().includes(q) ||
          r.scopeName.toLowerCase().includes(q) ||
          !!r.description?.toLowerCase().includes(q)
        );
      })
      .map((r, i) => ({ ...r, serial: i + 1 }));
  }, [rows, search, statusFilter]);

  const columnDefs = useChargeColumns();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <ChargesKpiStrip rows={rows} />

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

      {rows.length === 0 ? (
        <ChargesEmptyState />
      ) : (
        <DataTable<SerialRow>
          rowData={filtered as SerialRow[]}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          onGridReady={(e) => setGridApi(e.api)}
          onRowClicked={(e) => e.data && router.push(`/exco/finance-view/charges/${e.data.id}`)}
          showColumnPicker={false}
          selectable={false}
        />
      )}
    </div>
  );
}
