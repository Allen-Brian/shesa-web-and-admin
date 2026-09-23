'use client';

import { useEffect, useMemo, useState } from 'react';
import { Clock, FileText } from 'lucide-react';

import { Button, DataTable, Input, type CellClickedEvent, type GridApi } from '@shesa/ui';

import { ExportButton } from '@/components/export-button';

import { buildChargeMatrixExport } from './charge-detail-export';
import type {
  ChargeDetailMatrixProps,
  MatrixCell,
  MatrixPeriod,
  MatrixRow,
} from './charge-detail-types';
import { buildChargeMatrixColumnDefs } from './charge-matrix-columns';
import { ChargeMatrixCellSheet } from './charge-matrix-cell-sheet';
import { exportChargeMatrixCsv } from './charge-matrix-csv';
import { ChargeMatrixFilterChipRow } from './charge-matrix-filter-chip-row';
import { ChargeMatrixLegend } from './charge-matrix-legend';
import {
  buildMatrixMemberTotals,
  computeMatrixFilterCounts,
  filterAndRankMatrixRows,
  pickCurrentPeriodKey,
} from './charge-matrix-totals';
import type { MemberFilter } from './charge-detail-types';
import { formatPeriodHeader } from './shared-formatters';

interface SelectedCell {
  readonly member: MatrixRow;
  readonly period: MatrixPeriod;
  readonly cell: MatrixCell;
}

/**
 * Member × period collection matrix. Pinned Member / Coverage columns
 * on the left, a scrolling middle strip of period columns, then pinned
 * Paid / Outstanding rollups on the right. Filter chips + search
 * narrow the visible rows; the "Today" button re-centres the current
 * period after manual scrolling.
 */
export function ChargeMatrixTable({
  summary,
  periods,
  members,
  paymentLog,
  actions,
}: ChargeDetailMatrixProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<MemberFilter>('all');
  const [gridApi, setGridApi] = useState<GridApi<MatrixRow> | null>(null);
  const [selected, setSelected] = useState<SelectedCell | null>(null);

  const currentPeriodKey = useMemo(() => pickCurrentPeriodKey(periods), [periods]);

  // Clicking a period cell opens the detail sheet. Only real (non-
  // upcoming) obligations are clickable — an upcoming placeholder or an
  // N/A cell has no obligation to show.
  const onCellClicked = (e: CellClickedEvent<MatrixRow>) => {
    const colId = e.column?.getColId();
    if (!colId || !colId.startsWith('period_') || !e.data) return;
    const key = colId.slice('period_'.length);
    const idx = periods.findIndex((p) => p.key === key);
    const period = idx >= 0 ? periods[idx] : undefined;
    if (!period) return;
    const cell = e.data.cells[idx];
    if (period.isUpcoming || !cell) return;
    setSelected({ member: e.data, period, cell });
  };

  const selectedPayments = useMemo(
    () => (selected ? paymentLog.filter((p) => p.obligationId === selected.cell.obligationId) : []),
    [selected, paymentLog],
  );

  // On grid ready or when the current-period key shifts, centre the
  // current-period column so the operator sees ~3 past + 3 future
  // without manual scrolling.
  useEffect(() => {
    if (!gridApi || !currentPeriodKey) return;
    gridApi.ensureColumnVisible(`period_${currentPeriodKey}`, 'middle');
  }, [gridApi, currentPeriodKey]);

  const withTotals = useMemo(() => buildMatrixMemberTotals(members, periods), [members, periods]);
  const filtered = useMemo(
    () => filterAndRankMatrixRows(withTotals, search, filter),
    [withTotals, search, filter],
  );
  const filterCounts = useMemo(() => computeMatrixFilterCounts(withTotals), [withTotals]);

  const columnDefs = useMemo(
    () =>
      buildChargeMatrixColumnDefs({
        periods,
        currency: summary.currency,
        currentPeriodKey,
      }),
    [periods, summary.currency, currentPeriodKey],
  );

  const upcomingCount = periods.filter((p) => p.isUpcoming).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ChargeMatrixFilterChipRow filter={filter} onChange={setFilter} counts={filterCounts} />
        <div className="flex items-center gap-2">
          <Input
            type="search"
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-56"
          />
          {currentPeriodKey && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => gridApi?.ensureColumnVisible(`period_${currentPeriodKey}`, 'middle')}
              className="gap-1.5"
              title="Scroll to today's period"
            >
              <Clock className="h-3.5 w-3.5" />
              Today
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => exportChargeMatrixCsv({ summary, periods, members })}
            className="gap-1.5 text-muted-foreground"
          >
            <FileText className="h-3.5 w-3.5" />
            CSV
          </Button>
          <ExportButton
            spec={() => buildChargeMatrixExport({ summary, periods, members })}
            disabled={members.length === 0}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <ChargeMatrixLegend />
        <span>
          {filtered.length} of {members.length} {members.length === 1 ? 'member' : 'members'}
          {upcomingCount > 0 &&
            ` · ${upcomingCount} upcoming period${upcomingCount === 1 ? '' : 's'}`}
          {' · scroll ↔ for more history'}
        </span>
      </div>

      <DataTable<MatrixRow>
        rowData={filtered as MatrixRow[]}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.memberId}
        onGridReady={(e) => setGridApi(e.api)}
        onCellClicked={onCellClicked}
        showColumnPicker={false}
        selectable={false}
      />

      <ChargeMatrixCellSheet
        open={!!selected}
        onClose={() => setSelected(null)}
        chargeName={summary.name}
        memberName={selected?.member.fullName ?? ''}
        isScopeBody={selected?.member.isScopeBody ?? false}
        periodLabel={selected ? formatPeriodHeader(selected.period) : ''}
        cell={selected?.cell ?? null}
        payments={selectedPayments}
        actions={actions}
      />
    </div>
  );
}
