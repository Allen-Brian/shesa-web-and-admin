'use client';

import { useMemo } from 'react';
import { Badge } from 'lucide-react';

import type { ColDef, ICellRendererParams } from '@shesa/ui';

import { ArticleStatusBadge } from './article-status-badge';
import { LeaderAvatar } from '../../leadership/widgets/leader-avatar';
import type { ArticleRow } from './news-widget-types';
import { compactCount } from '@/lib/compact-count';

export type ArticleSerialRow = ArticleRow & {
  readonly serial: number;
  readonly categoryLabels: string;
};

interface Args {
  readonly onOpen: (row: ArticleRow) => void;
}

/**
 * Column defs for the News DataTable. Reuses the Leadership avatar
 * component for the author/banner cell — same visual language across
 * the two CMS surfaces.
 */
export function useArticleColumns({ onOpen }: Args): ColDef<ArticleSerialRow>[] {
  return useMemo<ColDef<ArticleSerialRow>[]>(
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
        width: 70,
        sortable: false,
        filter: false,
        suppressMovable: true,
        cellRenderer: (p: ICellRendererParams<ArticleSerialRow>) =>
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
        flex: 2.5,
        minWidth: 260,
        autoHeight: true,
        wrapText: true,
        cellRenderer: (p: ICellRendererParams<ArticleSerialRow>) =>
          p.data ? (
            <button
              type="button"
              onClick={() => onOpen(p.data!)}
              className="flex flex-col justify-center py-1 text-left leading-snug"
            >
              <span className="items-center gap-1.5 text-sm font-medium text-foreground">
                {p.data.isFeatured && <Badge className="h-3 w-3 text-primary mr-2 inline" />}
                <span className="line-clamp-1 inline text-ellipsis">{p.data.title}</span>
              </span>
              {p.data.excerpt && (
                <span className="line-clamp-2 text-xs text-muted-foreground">{p.data.excerpt}</span>
              )}
            </button>
          ) : null,
      },
      {
        headerName: 'Author',
        field: 'authorName',
        flex: 1.2,
        minWidth: 160,
        cellClass: 'text-xs text-muted-foreground',
      },
      {
        headerName: 'Categories',
        field: 'categoryLabels',
        width: 200,
        cellClass: 'text-xs text-muted-foreground',
        valueFormatter: (p) => (p.value ? p.value : '—'),
      },
      {
        headerName: 'Status',
        field: 'status',
        width: 120,
        cellRenderer: (p: ICellRendererParams<ArticleSerialRow>) =>
          p.data ? <ArticleStatusBadge status={p.data.status} /> : null,
      },
      {
        headerName: 'Publish',
        field: 'publishAt',
        width: 160,
        valueFormatter: (p) => (p.value ? new Date(p.value as string).toDateString() : '—'),
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
