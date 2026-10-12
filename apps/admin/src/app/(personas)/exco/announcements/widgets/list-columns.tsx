import type { ColDef, ICellRendererParams } from '@shesa/ui';

import { ChannelsCell } from './channels-cell';
import { formatDate } from './list-helpers';
import type { SerialRow } from './list-types';
import { RowActionsMenu } from './row-actions-menu';
import { StatusCell } from './status-cell';
import { TitleCell } from './title-cell';

interface BuildColumnDefsArgs {
  readonly onPublish: (row: SerialRow) => void;
  readonly onArchive: (row: SerialRow) => void;
  readonly onDelete: (row: SerialRow) => void;
}

/**
 * Column defs for the announcements list. Extracted so the main view
 * stays small — the callbacks close over the view's state via the
 * factory args.
 *
 * Columns: S/N · Title · Status · Channels · Created · Members reached · Actions.
 * Title uses `autoHeight + wrapText` so long titles wrap up to two
 * visible lines and truncate with an ellipsis on the second (see
 * TitleCell's `line-clamp-2`).
 */
export function buildAnnouncementsColumnDefs({
  onPublish,
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
    {
      headerName: 'Title',
      field: 'title',
      flex: 2,
      minWidth: 280,
      autoHeight: true,
      wrapText: true,
      cellRenderer: (p: ICellRendererParams<SerialRow, string>) => (
        <TitleCell title={p.value ?? ''} />
      ),
    },
    {
      headerName: 'Status',
      field: 'status',
      width: 150,
      cellRenderer: (p: ICellRendererParams<SerialRow, string>) => (
        <StatusCell status={p.value ?? 'draft'} />
      ),
    },
    {
      headerName: 'Channels',
      colId: 'channels',
      width: 200,
      sortable: false,
      filter: false,
      cellRenderer: (p: ICellRendererParams<SerialRow>) =>
        p.data ? <ChannelsCell channels={p.data.channels} /> : null,
    },
    {
      headerName: 'Created',
      field: 'createdAt',
      width: 160,
      valueFormatter: (p) => formatDate(p.value as string | null),
    },
    {
      headerName: 'Members reached',
      field: 'membersReached',
      width: 150,
      cellClass: 'text-center',
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
            onArchive={onArchive}
            onDelete={onDelete}
          />
        ) : null,
    },
  ];
}
