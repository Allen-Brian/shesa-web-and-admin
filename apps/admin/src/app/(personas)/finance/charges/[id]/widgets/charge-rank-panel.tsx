'use client';

import type { TrendingUp } from 'lucide-react';

import { DataTable, GradientPanel, type ColDef, type ICellRendererParams } from '@shesa/ui';

import type { RankPanelRow } from './charge-detail-types';

/**
 * Top-N leaderboard card — "Top payers", "Most behind", "Largest
 * payments", "Most recent". Icon + tinted colour framing on the
 * header row, then a compact DataTable of rank · label · value so it
 * matches the rest of the admin tables (sort, consistent chrome).
 */
export function ChargeRankPanel({
  title,
  icon: Icon,
  iconClass,
  rows,
  empty,
}: {
  readonly title: string;
  readonly icon: typeof TrendingUp;
  readonly iconClass: string;
  readonly rows: readonly RankPanelRow[];
  readonly empty: string;
}) {
  const columnDefs: ColDef<RankPanelRow>[] = [
    {
      headerName: '#',
      colId: 'rank',
      width: 52,
      maxWidth: 52,
      sortable: false,
      filter: false,
      suppressMovable: true,
      cellClass: 'text-xs text-muted-foreground',
      valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
    },
    {
      headerName: 'Name',
      field: 'label',
      flex: 1,
      minWidth: 140,
      cellRenderer: (p: ICellRendererParams<RankPanelRow>) => (
        <span className="truncate text-sm text-foreground">{p.data?.label}</span>
      ),
    },
    {
      headerName: 'Amount',
      field: 'value',
      width: 140,
      type: 'rightAligned',
      cellRenderer: (p: ICellRendererParams<RankPanelRow>) => (
        <span className="text-xs font-medium text-foreground tabular-nums">{p.data?.value}</span>
      ),
    },
  ];

  return (
    <GradientPanel className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className={`h-4 w-4 ${iconClass}`} />
        {title}
      </div>
      {rows.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">{empty}</p>
      ) : (
        <DataTable<RankPanelRow>
          rowData={rows as RankPanelRow[]}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          autoHeight
          variant="border"
          selectable={false}
          showColumnPicker={false}
          pagination={false}
          rowHeight={44}
          headerHeight={38}
        />
      )}
    </GradientPanel>
  );
}
