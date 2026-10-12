'use client';

import { useMemo } from 'react';

import { Badge, type ColDef, type ICellRendererParams } from '@shesa/ui';

import { LeaderAvatar } from './leader-avatar';
import { RowMenu } from './row-menu';
import type { BatchLeaderRow } from './leadership-widget-types';

export type BatchSerialRow = BatchLeaderRow & { readonly serial: number };

interface Args {
  readonly onEdit: (row: BatchLeaderRow) => void;
  readonly onDelete: (row: BatchLeaderRow) => void;
}

/**
 * Column definitions for the Batches DataTable. The Batch column is
 * badge-styled because the year is the primary key sight (1953…2019).
 */
export function useBatchColumns({ onEdit, onDelete }: Args): ColDef<BatchSerialRow>[] {
  return useMemo<ColDef<BatchSerialRow>[]>(
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
        cellRenderer: (p: ICellRendererParams<BatchSerialRow>) =>
          p.data ? (
            <div className="flex h-full items-center">
              <LeaderAvatar photoUrl={p.data.photoUrl} alt={p.data.name} size={36} />
            </div>
          ) : null,
      },
      {
        headerName: 'Batch',
        field: 'batch',
        width: 130,
        cellRenderer: (p: ICellRendererParams<BatchSerialRow, string>) => (
          <Badge variant="outline" className="h-5">
            Batch {p.value ?? '—'}
          </Badge>
        ),
      },
      { headerName: 'Chair', field: 'name', flex: 1.6, minWidth: 200 },
      {
        headerName: 'Actions',
        colId: 'row_actions',
        width: 80,
        sortable: false,
        filter: false,
        suppressMovable: true,
        cellRenderer: (p: ICellRendererParams<BatchSerialRow>) =>
          p.data ? (
            <RowMenu onEdit={() => onEdit(p.data!)} onDelete={() => onDelete(p.data!)} />
          ) : null,
      },
    ],
    [onEdit, onDelete],
  );
}
