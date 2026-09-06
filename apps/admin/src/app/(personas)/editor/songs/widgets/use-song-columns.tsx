'use client';

import { useMemo } from 'react';
import { Clock } from 'lucide-react';

import type { ColDef, ICellRendererParams } from '@shesa/ui';

import { LeaderAvatar } from '../../leadership/widgets/leader-avatar';
import { formatDuration } from './song-duration';
import type { SongRow } from './song-widget-types';
import { compactCount } from '@/lib/compact-count';

export type SongSerialRow = SongRow & {
  readonly serial: number;
  readonly groupName: string;
};

interface Args {
  readonly onOpen: (row: SongRow) => void;
}

export function useSongColumns({ onOpen }: Args): ColDef<SongSerialRow>[] {
  return useMemo<ColDef<SongSerialRow>[]>(
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
        headerName: 'Cover',
        colId: 'cover',
        width: 88,
        sortable: false,
        filter: false,
        suppressMovable: true,
        cellRenderer: (p: ICellRendererParams<SongSerialRow>) =>
          p.data ? (
            <button
              type="button"
              className="flex h-full items-center"
              onClick={() => onOpen(p.data!)}
            >
              <LeaderAvatar photoUrl={p.data.coverUrl} alt={p.data.title} size={44} />
            </button>
          ) : null,
      },
      {
        headerName: 'Song',
        field: 'title',
        flex: 2.2,
        minWidth: 220,
        autoHeight: true,
        wrapText: true,
        cellRenderer: (p: ICellRendererParams<SongSerialRow>) =>
          p.data ? (
            <button
              type="button"
              onClick={() => onOpen(p.data!)}
              className="flex flex-col justify-center py-1 text-left leading-snug"
            >
              <span className="text-sm font-medium text-foreground">{p.data.title}</span>
              <span className="text-xs text-muted-foreground">{p.data.performer ?? '—'}</span>
            </button>
          ) : null,
      },
      {
        headerName: 'Group',
        field: 'groupName',
        width: 180,
        cellClass: 'text-xs text-muted-foreground',
        valueFormatter: (p) => (p.value ? p.value : '—'),
      },
      {
        headerName: 'Length',
        field: 'durationSeconds',
        width: 120,
        cellRenderer: (p: ICellRendererParams<SongSerialRow>) =>
          p.data ? (
            <span className="inline-flex items-center gap-1.5 tabular-nums text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDuration(p.data.durationSeconds)}
            </span>
          ) : null,
      },
      {
        headerName: 'Views',
        field: 'views',
        width: 110,
        cellClass: 'text-xs tabular-nums text-muted-foreground',
        valueFormatter: (p) => compactCount(Number(p.value ?? 0)),
      },
      {
        headerName: 'Likes',
        field: 'likes',
        width: 110,
        cellClass: 'text-xs tabular-nums text-muted-foreground',
        valueFormatter: (p) => compactCount(Number(p.value ?? 0)),
      },
    ],
    [onOpen],
  );
}
