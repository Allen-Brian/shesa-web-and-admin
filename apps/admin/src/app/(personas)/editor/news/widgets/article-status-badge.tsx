'use client';

import { Badge } from '@shesa/ui';

import type { ArticleStatus } from './news-widget-types';

const STYLES: Record<ArticleStatus, string> = {
  draft: 'border-border bg-muted/40 text-muted-foreground',
  scheduled: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  published: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  archived: 'border-border bg-muted/40 text-muted-foreground',
};

const LABELS: Record<ArticleStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  published: 'Published',
  archived: 'Archived',
};

/** Compact status pill for the news list table. */
export function ArticleStatusBadge({ status }: { readonly status: ArticleStatus }) {
  return (
    <Badge variant="outline" className={`h-5 ${STYLES[status]}`}>
      {LABELS[status]}
    </Badge>
  );
}
