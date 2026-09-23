import type { ColDef, ICellRendererParams } from '@shesa/ui';

import { formatCompactMoney } from '@/lib/finance/format-money';

import { GroupNameCell } from './group-name-cell';
import { GroupRowActions } from './group-row-actions';
import { GroupStatusBadge } from './group-status-badge';
import type { GroupStatus, SerialGroupRow } from './groups-types';

interface GroupColumnActions {
  readonly pending: boolean;
  readonly onSetStatus: (id: string, status: GroupStatus) => void;
  readonly onToggleSidebar: (id: string, next: boolean) => void;
}

/**
 * Column defs for the Groups DataTable. Row-click routes to the
 * per-group shell; the trailing action cluster keeps close / archive
 * / hide-from-sidebar reachable without opening a dropdown.
 */
export function buildGroupColumns(actions: GroupColumnActions): ColDef<SerialGroupRow>[] {
  const { pending, onSetStatus, onToggleSidebar } = actions;
  return [
    {
      headerName: '#',
      field: 'serial',
      width: 56,
      maxWidth: 56,
      sortable: false,
      filter: false,
      suppressMovable: true,
      cellClass: 'text-xs text-muted-foreground',
    },
    {
      headerName: 'Group',
      field: 'name',
      flex: 2,
      minWidth: 260,
      cellRenderer: (p: ICellRendererParams<SerialGroupRow>) =>
        p.data ? <GroupNameCell row={p.data} /> : null,
    },
    {
      headerName: 'Raised',
      field: 'raised',
      width: 150,
      cellRenderer: (p: ICellRendererParams<SerialGroupRow>) =>
        p.data ? (
          <span className="text-sm tabular-nums">
            {formatCompactMoney(p.data.raised, p.data.currency)}
          </span>
        ) : null,
    },
    {
      headerName: 'Charges',
      field: 'chargeCount',
      width: 100,
      cellClass: 'tabular-nums',
    },
    {
      headerName: 'Transactions',
      field: 'transactionCount',
      width: 130,
      cellClass: 'tabular-nums',
    },
    {
      headerName: 'Expenses',
      field: 'expenseCount',
      width: 110,
      cellClass: 'tabular-nums',
    },
    {
      headerName: 'Window',
      colId: 'window',
      width: 180,
      valueGetter: (p) => {
        const r = p.data as SerialGroupRow | undefined;
        if (!r) return '';
        const from = r.startsOn ? new Date(r.startsOn).toLocaleDateString() : '—';
        const to = r.endsOn ? new Date(r.endsOn).toLocaleDateString() : '—';
        return `${from} → ${to}`;
      },
    },
    {
      headerName: 'Status',
      field: 'status',
      width: 110,
      cellRenderer: (p: ICellRendererParams<SerialGroupRow, GroupStatus>) => (
        <GroupStatusBadge status={p.value ?? 'active'} />
      ),
    },
    {
      headerName: 'Actions',
      colId: 'row_actions',
      width: 150,
      sortable: false,
      filter: false,
      suppressMovable: true,
      cellRenderer: (p: ICellRendererParams<SerialGroupRow>) =>
        p.data ? (
          <GroupRowActions
            row={p.data}
            pending={pending}
            onSetStatus={onSetStatus}
            onToggleSidebar={onToggleSidebar}
          />
        ) : null,
    },
  ];
}
