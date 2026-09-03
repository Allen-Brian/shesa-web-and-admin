'use client';

import { useMemo } from 'react';
import { Sparkles } from 'lucide-react';

import type { ColDef, ICellRendererParams } from '@shesa/ui';

import { LeaderAvatar } from '../../leadership/widgets/leader-avatar';
import { ProjectStatusBadge } from './project-status-badge';
import type { ProjectRow } from './project-widget-types';

export type ProjectSerialRow = ProjectRow & {
  readonly serial: number;
  readonly categoryLabels: string;
};

interface Args {
  readonly onOpen: (row: ProjectRow) => void;
}

/** Column defs for the Projects DataTable. */
export function useProjectColumns({ onOpen }: Args): ColDef<ProjectSerialRow>[] {
  return useMemo<ColDef<ProjectSerialRow>[]>(
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
        cellRenderer: (p: ICellRendererParams<ProjectSerialRow>) =>
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
        flex: 1.25,
        minWidth: 200,
        autoHeight: true,
        wrapText: true,
        cellRenderer: (p: ICellRendererParams<ProjectSerialRow>) =>
          p.data ? (
            <button
              type="button"
              onClick={() => onOpen(p.data!)}
              className="flex flex-col justify-center py-1 text-left leading-snug"
            >
              <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                {p.data.isFeatured && <Sparkles className="h-3 w-3 text-primary" />}
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
        width: 180,
        cellClass: 'text-xs text-muted-foreground',
        valueFormatter: (p) => (p.value ? p.value : '—'),
      },
      {
        headerName: 'Status',
        field: 'status',
        width: 120,
        cellRenderer: (p: ICellRendererParams<ProjectSerialRow>) =>
          p.data ? <ProjectStatusBadge status={p.data.status} /> : null,
      },
      {
        headerName: 'Location',
        field: 'location',
        flex: 1,
        cellClass: 'text-xs text-muted-foreground text-ellipsis',
        valueFormatter: (p) => p.value ?? '—',
      },
    ],
    [onOpen],
  );
}
