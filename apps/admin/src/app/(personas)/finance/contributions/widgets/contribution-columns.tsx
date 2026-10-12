import type { ColDef, ICellRendererParams } from '@shesa/ui';

import { formatShortDay } from '@/lib/format/date-time';

import { ContributionNameCell } from './contribution-name-cell';
import { ContributionProgressCell } from './contribution-progress-cell';
import { ContributionRowActions } from './contribution-row-actions';
import type { ContributionRow, SerialRow } from './contributions-types';

interface ContributionColumnActions {
  readonly pending: boolean;
  readonly onApprove: (id: string) => void;
  readonly onClose: (id: string) => void;
  readonly onExtend: (row: ContributionRow) => void;
  readonly onArchive: (id: string) => void;
}

/**
 * Column defs for the contributions DataTable. Layout matches the
 * spec on the mainstream admin: S/N, Name, Event Group, Target,
 * Progress, Contributors, Open date, Close date, Actions. Rows are
 * selectable so operators can run mass actions from the header.
 */
export function buildContributionColumns(actions: ContributionColumnActions): ColDef<SerialRow>[] {
  // No manual checkbox column — the DataTable's `selectable` prop adds
  // the (pinned) selection column. A hand-rolled one duplicated it.
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
      headerName: 'Event Group',
      field: 'groupName',
      width: 160,
      valueGetter: (p) => p.data?.groupName ?? null,
      cellRenderer: (p: ICellRendererParams<SerialRow>) => {
        if (!p.data) return null;
        if (p.data.groupName) {
          return <span className="text-sm text-foreground">{p.data.groupName}</span>;
        }
        return <span className="text-xs italic text-muted-foreground">N/A</span>;
      },
    },
    {
      headerName: 'Target',
      colId: 'target',
      width: 150,
      cellRenderer: (p: ICellRendererParams<SerialRow>) => {
        if (!p.data) return null;
        const target = p.data.goalAmount;
        if (target == null || target <= 0) {
          return <span className="text-xs italic text-muted-foreground">No target</span>;
        }
        return (
          <span className="text-sm tabular-nums text-foreground">
            {new Intl.NumberFormat().format(target)} {p.data.currency}
          </span>
        );
      },
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
      headerName: 'Payers',
      field: 'contributorCount',
      width: 100,
      valueFormatter: (p) => (p.value != null ? String(p.value) : '0'),
    },
    {
      headerName: 'Open date',
      field: 'openDate',
      width: 160,
      valueFormatter: (p) => formatShortDay(p.value as string | null) ?? '-',
    },
    {
      headerName: 'Close date',
      field: 'closeDate',
      width: 160,
      valueFormatter: (p) => formatShortDay(p.value as string | null) ?? '-',
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
