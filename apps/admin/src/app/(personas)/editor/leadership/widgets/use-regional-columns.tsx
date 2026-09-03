'use client';

import { useMemo } from 'react';

import type { ColDef, ICellRendererParams } from '@shesa/ui';

import { LeaderAvatar } from './leader-avatar';
import { RowMenu } from './row-menu';
import type { RegionalLeaderRow } from './leadership-widget-types';

export type RegionalSerialRow = RegionalLeaderRow & { readonly serial: number };

interface Args {
  readonly branchColumnLabel: string;
  readonly onEdit: (row: RegionalLeaderRow) => void;
  readonly onDelete: (row: RegionalLeaderRow) => void;
}

/**
 * Column definitions shared between the Branches + Diaspora
 * DataTables — same shape, only the leftmost column label differs
 * ("Branch/Chapter" vs "Diaspora chapter").
 */
export function useRegionalColumns({
  branchColumnLabel,
  onEdit,
  onDelete,
}: Args): ColDef<RegionalSerialRow>[] {
  return useMemo<ColDef<RegionalSerialRow>[]>(
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
        cellRenderer: (p: ICellRendererParams<RegionalSerialRow>) =>
          p.data ? (
            <div className="flex h-full items-center">
              <LeaderAvatar photoUrl={p.data.photoUrl} alt={p.data.name} size={36} />
            </div>
          ) : null,
      },
      { headerName: branchColumnLabel, field: 'branchName', flex: 1.6, minWidth: 200 },
      // Was hardcoded to "President", from when the table could hold
      // nothing else. A branch may now have a vice president too.
      { headerName: 'Name', field: 'name', flex: 1.4, minWidth: 180 },
      {
        headerName: 'Role',
        field: 'role',
        width: 150,
        valueFormatter: (p) => (p.value === 'vice_president' ? 'Vice President' : 'President'),
      },
      {
        headerName: 'Region',
        field: 'region',
        flex: 1.2,
        minWidth: 140,
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
        cellRenderer: (p: ICellRendererParams<RegionalSerialRow>) =>
          p.data ? (
            <RowMenu onEdit={() => onEdit(p.data!)} onDelete={() => onDelete(p.data!)} />
          ) : null,
      },
    ],
    [branchColumnLabel, onEdit, onDelete],
  );
}
