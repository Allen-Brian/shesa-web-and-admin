import type { ColDef, ICellRendererParams } from '@shesa/ui';

import { ContributionNameCell } from './contribution-name-cell';
import { ContributionProgressCell } from './contribution-progress-cell';
import { ContributionRowActions } from './contribution-row-actions';
import type { ContributionRow, SerialRow } from './contributions-types';
import { LifecycleBadge } from './lifecycle-badge';

interface ContributionColumnActions {
  readonly pending: boolean;
  readonly onApprove: (id: string) => void;
  readonly onClose: (id: string) => void;
  readonly onExtend: (row: ContributionRow) => void;
  readonly onArchive: (id: string) => void;
}

/**
 * Column defs for the contributions DataTable. Layout: S/N · Name ·
 * Progress · Contributors · Closes · Lifecycle · Actions. Row-click
 * routes to the underlying charge-detail drill-down (wired at the
 * DataTable level).
 */
export function buildContributionColumns(actions: ContributionColumnActions): ColDef<SerialRow>[] {
  return [
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
      flex: 2,
      minWidth: 200,
      cellRenderer: (p: ICellRendererParams<SerialRow, string>) =>
        p.data ? <ContributionNameCell row={p.data} /> : null,
    },
    {
      headerName: 'Progress',
      field: 'raised',
      flex: 1.5,
      minWidth: 200,
      cellRenderer: (p: ICellRendererParams<SerialRow, number>) =>
        p.data ? <ContributionProgressCell row={p.data} /> : null,
    },
    {
      headerName: 'Contributors',
      field: 'contributorCount',
      width: 130,
      valueFormatter: (p) => (p.value != null ? String(p.value) : '0'),
    },
    {
      headerName: 'Closes',
      field: 'closeDate',
      width: 140,
      valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString() : '—'),
    },
    {
      headerName: 'Lifecycle',
      field: 'lifecycle',
      width: 130,
      cellRenderer: (p: ICellRendererParams<SerialRow, string>) => (
        <LifecycleBadge value={p.value ?? null} />
      ),
    },
    {
      headerName: 'Actions',
      colId: 'row_actions',
      width: 250,
      sortable: false,
      filter: false,
      suppressMovable: true,
      cellRenderer: (p: ICellRendererParams<SerialRow>) =>
        p.data ? (
          <ContributionRowActions
            row={p.data}
            pending={actions.pending}
            onApprove={actions.onApprove}
            onClose={actions.onClose}
            onExtend={actions.onExtend}
            onArchive={actions.onArchive}
          />
        ) : null,
    },
  ];
}
