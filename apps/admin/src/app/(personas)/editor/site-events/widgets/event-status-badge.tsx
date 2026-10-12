'use client';

import { Badge } from '@shesa/ui';

/** Upcoming / Past pill derived from starts_at at render time. */
export function EventStatusBadge({ startsAt }: { readonly startsAt: string }) {
  const upcoming = new Date(startsAt).getTime() > Date.now();
  return (
    <Badge
      variant="outline"
      className={
        upcoming
          ? 'h-5 border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
          : 'h-5 border-border bg-muted/40 text-muted-foreground'
      }
    >
      {upcoming ? 'Upcoming' : 'Past'}
    </Badge>
  );
}
