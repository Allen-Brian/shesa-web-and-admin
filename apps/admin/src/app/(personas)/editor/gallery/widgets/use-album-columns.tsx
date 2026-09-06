'use client';

import { useMemo } from 'react';
import { CalendarDays, Film, Image as ImageIcon, Link2 } from 'lucide-react';

import type { ColDef, ICellRendererParams } from '@shesa/ui';

import { LeaderAvatar } from '../../leadership/widgets/leader-avatar';
import type { AlbumRow } from './gallery-widget-types';
import { compactCount } from '@/lib/compact-count';

export type AlbumSerialRow = AlbumRow & {
  readonly serial: number;
  readonly categoryLabels: string;
  readonly eventTitle: string | null;
};

interface Args {
  readonly onOpen: (row: AlbumRow) => void;
}

/** Column defs for the Gallery Albums DataTable. */
export function useAlbumColumns({ onOpen }: Args): ColDef<AlbumSerialRow>[] {
  return useMemo<ColDef<AlbumSerialRow>[]>(
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
        cellRenderer: (p: ICellRendererParams<AlbumSerialRow>) =>
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
        headerName: 'Album',
        field: 'title',
        flex: 2.2,
        minWidth: 240,
        autoHeight: true,
        wrapText: true,
        cellRenderer: (p: ICellRendererParams<AlbumSerialRow>) =>
          p.data ? (
            <button
              type="button"
              onClick={() => onOpen(p.data!)}
              className="flex flex-col justify-center py-1 text-left leading-snug"
            >
              <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                {p.data.title}
                {p.data.linkedEventId && (
                  <Link2 className="h-3 w-3 text-primary" aria-label="Linked to event" />
                )}
              </span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {p.data.dateLabel && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {p.data.dateLabel}
                  </span>
                )}
                {p.data.location && <span>· {p.data.location}</span>}
              </span>
            </button>
          ) : null,
      },
      {
        headerName: 'Categories',
        field: 'categoryLabels',
        width: 170,
        cellClass: 'text-xs text-muted-foreground',
        valueFormatter: (p) => (p.value ? p.value : '—'),
      },
      {
        headerName: 'Media',
        field: 'mediaCount',
        width: 120,
        cellRenderer: (p: ICellRendererParams<AlbumSerialRow>) =>
          p.data ? (
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <ImageIcon className="h-3 w-3" />
              {p.data.mediaCount}
              <Film className="h-3 w-3" />
            </span>
          ) : null,
      },
      {
        headerName: 'Linked event',
        field: 'eventTitle',
        flex: 1.2,
        minWidth: 160,
        cellClass: 'text-xs text-muted-foreground',
        valueFormatter: (p) => (p.value ? String(p.value) : '—'),
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
