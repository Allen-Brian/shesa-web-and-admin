'use client';

import { useMemo } from 'react';

import type { ColDef, ICellRendererParams } from '@shesa/ui';

import { LeaderAvatar } from './leader-avatar';
import { RowMenu } from './row-menu';
import type { MainstreamLeaderRow } from './leadership-widget-types';

export type MainstreamSerialRow = MainstreamLeaderRow & {
  readonly serial: number;
  readonly sectorName: string;
};

interface Args {
  readonly onEdit: (row: MainstreamLeaderRow) => void;
  readonly onDelete: (row: MainstreamLeaderRow) => void;
}

/**
 * Column definitions for the Mainstream leaders DataTable. Rows are
 * flattened across every sector so the operator can scan the full
 * slate in one view; the Sector column tells them which grouping
 * each leader belongs to.
 */
export function useMainstreamColumns({ onEdit, onDelete }: Args): ColDef<MainstreamSerialRow>[] {
  return useMemo<ColDef<MainstreamSerialRow>[]>(
    () => [
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
        headerName: 'Photo',
        colId: 'photo',
        width: 76,
        sortable: false,
        filter: false,
        suppressMovable: true,
        cellRenderer: (p: ICellRendererParams<MainstreamSerialRow>) =>
          p.data ? (
            <div className="flex h-full items-center">
              <LeaderAvatar photoUrl={p.data.photoUrl} alt={p.data.name} size={36} />
            </div>
          ) : null,
      },
      { headerName: 'Name', field: 'name', flex: 1.6, minWidth: 180 },
      { headerName: 'Position', field: 'position', flex: 1.6, minWidth: 180 },
      {
        headerName: 'Sector',
        field: 'sectorName',
        width: 180,
        cellClass: 'text-xs text-muted-foreground',
      },
      {
        headerName: 'Location',
        field: 'location',
        flex: 1.2,
        minWidth: 160,
        valueFormatter: (p) => p.value ?? '—',
        cellClass: 'text-xs text-muted-foreground',
      },
      {
        headerName: 'Actions',
        colId: 'row_actions',
        width: 80,
        sortable: false,
        filter: false,
        suppressMovable: true,
        cellRenderer: (p: ICellRendererParams<MainstreamSerialRow>) =>
          p.data ? (
            <RowMenu onEdit={() => onEdit(p.data!)} onDelete={() => onDelete(p.data!)} />
          ) : null,
      },
    ],
    [onEdit, onDelete],
  );
}
