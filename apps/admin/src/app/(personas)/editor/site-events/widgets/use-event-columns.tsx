'use client';

import { useMemo } from 'react';
import { Sparkles, Ticket } from 'lucide-react';

import type { ColDef, ICellRendererParams } from '@shesa/ui';

import { LeaderAvatar } from '../../leadership/widgets/leader-avatar';
import { EventStatusBadge } from './event-status-badge';
import type { SiteEventRow } from './site-event-widget-types';
import { compactCount } from '@/lib/compact-count';

export type EventSerialRow = SiteEventRow & {
  readonly serial: number;
  readonly categoryLabels: string;
};

interface Args {
  readonly onOpen: (row: SiteEventRow) => void;
}

/** Column defs for the Site Events DataTable. */
export function useEventColumns({ onOpen }: Args): ColDef<EventSerialRow>[] {
  return useMemo<ColDef<EventSerialRow>[]>(
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
        headerName: 'Banner',
        colId: 'banner',
        width: 88,
        sortable: false,
        filter: false,
        suppressMovable: true,
        cellRenderer: (p: ICellRendererParams<EventSerialRow>) =>
          p.data ? (
            <button
              type="button"
              className="flex h-full items-center"
              onClick={() => onOpen(p.data!)}
            >
              <LeaderAvatar photoUrl={p.data.bannerUrl} alt={p.data.title} size={44} />
            </button>
          ) : null,
      },
      {
        headerName: 'Title',
        field: 'title',
        flex: 2.2,
        minWidth: 240,
        autoHeight: true,
        wrapText: true,
        cellRenderer: (p: ICellRendererParams<EventSerialRow>) =>
          p.data ? (
            <button
              type="button"
              onClick={() => onOpen(p.data!)}
              className="flex flex-col justify-center py-1 text-left leading-snug"
            >
              <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                {p.data.isFeatured && <Sparkles className="h-3 w-3 text-primary" />}
                {p.data.hasTicketing && <Ticket className="h-3 w-3 text-amber-600" />}
                {p.data.title}
              </span>
              {p.data.shortDescription && (
                <span className="line-clamp-2 text-xs text-muted-foreground">
                  {p.data.shortDescription}
                </span>
              )}
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
        headerName: 'When',
        field: 'startsAt',
        width: 150,
        cellClass: 'text-xs text-muted-foreground',
        valueFormatter: (p) =>
          p.value
            ? new Date(p.value as string).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : '—',
      },
      {
        headerName: 'Where',
        field: 'city',
        flex: 1.2,
        minWidth: 140,
        cellClass: 'text-xs text-muted-foreground',
        valueFormatter: (p) => p.value ?? '—',
      },
      {
        headerName: 'Status',
        colId: 'status',
        width: 120,
        cellRenderer: (p: ICellRendererParams<EventSerialRow>) =>
          p.data ? <EventStatusBadge startsAt={p.data.startsAt} /> : null,
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
