import type { ColDef, ICellRendererParams } from '@shesa/ui';

import { formatStart } from './list-helpers';
import type { EventRow, SerialRow } from './list-types';
import { ModeCell } from './mode-cell';
import { RowActionsMenu } from './row-actions-menu';
import { StatusCell } from './status-cell';
import { TimelineCell } from './timeline-cell';
import { TypeCell } from './type-cell';

interface BuildColumnDefsArgs {
  readonly onPublish: (row: SerialRow) => void;
  readonly onEdit: (row: SerialRow) => void;
  readonly onArchive: (row: SerialRow) => void;
  readonly onDelete: (row: SerialRow) => void;
}

/**
 * Column defs for the events list. `Reach Count` is intentionally
 * omitted — the metric is available on the event detail page but noise
 * on the index.
 *
 * Columns: S/N · Name · Type · Date & time · Timeline · Mode · Status · Actions.
 */
export function buildEventsColumnDefs({
  onPublish,
  onEdit,
  onArchive,
  onDelete,
}: BuildColumnDefsArgs): ColDef<SerialRow>[] {
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
    { headerName: 'Name', field: 'name', flex: 1, minWidth: 220 },
    {
      headerName: 'Type',
      field: 'types',
      flex: 1,
      minWidth: 220,
      cellRenderer: (p: ICellRendererParams<SerialRow>) =>
        p.data ? <TypeCell types={p.data.types} /> : null,
    },
    {
      headerName: 'Date & time',
      field: 'startAt',
      flex: 1,
      minWidth: 220,
      valueFormatter: (p) => formatStart(p.value as string),
    },
    {
      headerName: 'Timeline',
      colId: 'timeline',
      width: 120,
      sortable: false,
      cellRenderer: (p: ICellRendererParams<SerialRow>) =>
        p.data ? <TimelineCell startAt={p.data.startAt} endAt={p.data.endAt} /> : null,
    },
    {
      headerName: 'Mode',
      field: 'mode',
      width: 120,
      cellRenderer: (p: ICellRendererParams<SerialRow, EventRow['mode']>) => (
        <ModeCell mode={p.value ?? 'physical'} />
      ),
    },
    {
      headerName: 'Status',
      field: 'status',
      width: 120,
      cellRenderer: (p: ICellRendererParams<SerialRow, string>) => (
        <StatusCell status={p.value ?? 'draft'} />
      ),
    },
    {
      headerName: 'Actions',
      colId: 'actions',
      width: 120,
      sortable: false,
      filter: false,
      suppressMovable: true,
      cellRenderer: (p: ICellRendererParams<SerialRow>) =>
        p.data ? (
          <RowActionsMenu
            row={p.data}
            onPublish={onPublish}
            onEdit={onEdit}
            onArchive={onArchive}
            onDelete={onDelete}
          />
        ) : null,
    },
  ];
}
