import type { ColDef, ICellRendererParams } from '@shesa/ui';

import { ChargeNameCell } from './charge-name-cell';
import { ChargeProgressCell } from './charge-progress-cell';
import { ChargeRowActionsMenu } from './charge-row-actions-menu';
import { ChargeStatusBadge } from './charge-status-badge';
import type { ChargeRow, SerialRow } from './charges-types';

interface ChargeColumnActions {
  readonly pending: boolean;
  readonly onEdit: (row: ChargeRow) => void;
  readonly onPublish: (row: ChargeRow) => void;
  readonly onArchive: (id: string) => void;
  readonly onDelete: (row: ChargeRow) => void;
}

/**
 * Column defs for the charges DataTable — S/N · Name · Amount ·
 * Progress · Status · Activates · Actions. Row-click on any main cell
 * opens the charge-detail page (wired at the DataTable level); the
 * trailing Actions column carries the overflow menu (Edit / Archive
 * / Delete). Bulk archive / status changes live on the selection bar.
 * Activation is a status flip inside Edit and obligations generate
 * automatically on that transition — neither has its own row action.
 */
export function buildChargeColumns(actions: ChargeColumnActions): ColDef<SerialRow>[] {
  const { pending, onEdit, onPublish, onArchive, onDelete } = actions;
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
      headerName: 'Name',
      field: 'name',
      flex: 2,
      minWidth: 260,
      cellRenderer: (p: ICellRendererParams<SerialRow>) =>
        p.data ? <ChargeNameCell row={p.data} /> : null,
    },
    {
      headerName: 'Amount',
      field: 'baseAmount',
      width: 150,
      cellRenderer: (p: ICellRendererParams<SerialRow, number>) =>
        p.data && p.data.baseAmount != null ? (
          <span className="text-sm tabular-nums text-foreground">
            {new Intl.NumberFormat().format(p.data.baseAmount)} {p.data.currency}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      headerName: 'Progress',
      colId: 'progress',
      flex: 1.4,
      minWidth: 200,
      valueGetter: (p) => {
        const r = p.data as SerialRow | undefined;
        if (!r) return 0;
        return r.expected > 0 ? r.collected / r.expected : 0;
      },
      cellRenderer: (p: ICellRendererParams<SerialRow>) =>
        p.data ? <ChargeProgressCell row={p.data} /> : null,
    },
    {
      headerName: 'Status',
      field: 'status',
      width: 110,
      cellRenderer: (p: ICellRendererParams<SerialRow, string>) => (
        <ChargeStatusBadge status={p.value ?? ''} />
      ),
    },
    {
      headerName: 'Activates',
      field: 'activationDate',
      width: 120,
      valueFormatter: (p) => (p.value ? new Date(p.value).toLocaleDateString() : '—'),
    },
    {
      headerName: 'Actions',
      colId: 'row_actions',
      width: 96,
      maxWidth: 96,
      sortable: false,
      filter: false,
      suppressMovable: true,
      cellClass: 'flex items-center justify-center',
      cellRenderer: (p: ICellRendererParams<SerialRow>) =>
        p.data ? (
          <ChargeRowActionsMenu
            row={p.data}
            pending={pending}
            onEdit={onEdit}
            onPublish={onPublish}
            onArchive={onArchive}
            onDelete={onDelete}
          />
        ) : null,
    },
  ];
}
