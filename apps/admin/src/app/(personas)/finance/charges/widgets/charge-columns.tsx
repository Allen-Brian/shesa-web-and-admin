import { ChevronRight } from 'lucide-react';

import type { ColDef, ICellRendererParams } from '@shesa/ui';

import { ChargeNameCell } from './charge-name-cell';
import { ChargeProgressCell } from './charge-progress-cell';
import { ChargeRowActionsMenu } from './charge-row-actions-menu';
import { ChargeStatusBadge } from './charge-status-badge';
import { ChargeTypeCell } from './charge-type-cell';
import type { ChargeRow, SerialRow } from './charges-types';

interface ChargeColumnActions {
  readonly pending: boolean;
  readonly onEdit: (row: ChargeRow) => void;
  readonly onActivate: (id: string) => void;
  readonly onGenerate: (id: string) => void;
  readonly onArchive: (id: string) => void;
}

/**
 * Column defs for the charges DataTable — S/N · Name · Amount ·
 * Progress · Status · Activates · row-chevron · row-actions. Row
 * click on any main cell opens the charge-detail page (wired at the
 * DataTable level); the chevron column exists as an affordance.
 */
export function buildChargeColumns(actions: ChargeColumnActions): ColDef<SerialRow>[] {
  const { pending, onEdit, onActivate, onGenerate, onArchive } = actions;
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
      headerName: 'Type',
      colId: 'type',
      field: 'targetPartyType',
      width: 170,
      cellRenderer: (p: ICellRendererParams<SerialRow>) =>
        p.data ? <ChargeTypeCell row={p.data} /> : null,
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
      headerName: '',
      colId: 'row_chevron',
      width: 48,
      maxWidth: 48,
      sortable: false,
      filter: false,
      suppressMovable: true,
      cellRenderer: () => <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />,
    },
    {
      headerName: '',
      colId: 'row_actions',
      width: 56,
      maxWidth: 56,
      sortable: false,
      filter: false,
      suppressMovable: true,
      cellRenderer: (p: ICellRendererParams<SerialRow>) =>
        p.data ? (
          <ChargeRowActionsMenu
            row={p.data}
            pending={pending}
            onEdit={onEdit}
            onActivate={onActivate}
            onGenerate={onGenerate}
            onArchive={onArchive}
          />
        ) : null,
    },
  ];
}
