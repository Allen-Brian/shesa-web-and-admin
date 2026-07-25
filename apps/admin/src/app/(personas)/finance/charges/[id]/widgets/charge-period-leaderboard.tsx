'use client';

import { DataTable, GradientPanel, type ColDef, type ICellRendererParams } from '@shesa/ui';

import type { PeriodStatsRow } from './charge-detail-types';
import { formatMoney } from './shared-formatters';

/**
 * Best/worst-coverage subtitle + full period table. Rows arrive
 * sorted best-first (the ScopeBody + Matrix reports flip this before
 * passing in); the DataTable's built-in header sort + pagination take
 * over from there so a couple-year run doesn't turn the reports tab
 * into a scroll canyon. The mini coverage bar per row matches the
 * CoverageBar in the matrix table for consistent colour reading.
 */
export function ChargePeriodLeaderboard({
  rows,
  bestLabel,
  worstLabel,
  bestCoverage,
  worstCoverage,
  currency,
}: {
  readonly rows: readonly PeriodStatsRow[];
  readonly bestLabel: string;
  readonly worstLabel: string;
  readonly bestCoverage: number | null;
  readonly worstCoverage: number | null;
  readonly currency: string;
}) {
  const columnDefs: ColDef<PeriodStatsRow>[] = [
    {
      headerName: 'Period',
      field: 'period',
      flex: 1,
      minWidth: 120,
      cellClass: 'font-medium text-foreground',
    },
    {
      headerName: 'Coverage',
      colId: 'coverage',
      width: 170,
      valueGetter: (p) => p.data?.coverage ?? 0,
      cellRenderer: (p: ICellRendererParams<PeriodStatsRow>) =>
        p.data ? <CoverageCell coverage={p.data.coverage} /> : null,
    },
    {
      headerName: 'Paid',
      field: 'Paid',
      width: 130,
      type: 'rightAligned',
      cellRenderer: (p: ICellRendererParams<PeriodStatsRow>) => (
        <span className="text-sm tabular-nums text-foreground">
          {formatMoney(p.data?.Paid ?? 0, currency)}
        </span>
      ),
    },
    {
      headerName: 'Outstanding',
      field: 'Outstanding',
      width: 140,
      type: 'rightAligned',
      cellRenderer: (p: ICellRendererParams<PeriodStatsRow>) => {
        const v = p.data?.Outstanding ?? 0;
        return (
          <span
            className={`text-sm tabular-nums ${v > 0 ? 'text-destructive' : 'text-muted-foreground'}`}
          >
            {v > 0 ? formatMoney(v, currency) : '—'}
          </span>
        );
      },
    },
    {
      headerName: 'Members paid',
      colId: 'members_paid',
      width: 140,
      type: 'rightAligned',
      valueGetter: (p) => (p.data ? p.data.paidMembers / Math.max(1, p.data.totalMembers) : 0),
      cellRenderer: (p: ICellRendererParams<PeriodStatsRow>) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          {p.data?.paidMembers}/{p.data?.totalMembers}
        </span>
      ),
    },
  ];

  return (
    <GradientPanel className="flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-foreground">Period performance</span>
        <span className="text-xs text-muted-foreground">
          Best <span className="font-medium text-foreground">{bestLabel}</span>
          {bestCoverage !== null && (
            <span className="ml-1 text-emerald-600 dark:text-emerald-400">
              ({Math.round(bestCoverage * 100)}%)
            </span>
          )}
          {' · '}Worst <span className="font-medium text-foreground">{worstLabel}</span>
          {worstCoverage !== null && (
            <span className="ml-1 text-destructive">({Math.round(worstCoverage * 100)}%)</span>
          )}
        </span>
      </div>

      <DataTable<PeriodStatsRow>
        rowData={rows as PeriodStatsRow[]}
        columnDefs={columnDefs}
        getRowId={(p) => p.data.key}
        autoHeight
        variant="border"
        selectable={false}
        showColumnPicker={false}
        pageSize={10}
        rowHeight={44}
        headerHeight={38}
      />
    </GradientPanel>
  );
}

/** Mini coverage bar + percent, colour-matched to the matrix table. */
function CoverageCell({ coverage }: { readonly coverage: number }) {
  const percent = Math.round(coverage * 100);
  return (
    <div className="flex w-full items-center gap-1.5">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${
            percent >= 100
              ? 'bg-emerald-500'
              : percent >= 70
                ? 'bg-sky-500'
                : percent >= 40
                  ? 'bg-amber-500'
                  : 'bg-destructive'
          }`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
      <span className="w-9 text-right text-xs tabular-nums text-foreground">{percent}%</span>
    </div>
  );
}
