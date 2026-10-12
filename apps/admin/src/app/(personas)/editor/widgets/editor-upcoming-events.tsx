import Link from 'next/link';
import { ArrowRight, CalendarDays, MapPin, Star } from 'lucide-react';

import { GradientPanel } from '@shesa/ui';

import type { UpcomingSiteEvent } from './dashboard-types';
import { EmptyInline } from '@/components/dashboard/empty-inline';

/**
 * Next few site events by start date. Same shape as the
 * recent-articles panel so the two side-by-side cards read as a
 * matched pair. Featured events wear a filled star (same treatment
 * as featured articles).
 */
export function EditorUpcomingEvents({
  events,
}: {
  readonly events: readonly UpcomingSiteEvent[];
}) {
  return (
    <GradientPanel className="flex flex-col gap-3 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">Upcoming site events</span>
        <Link
          href="/editor/site-events"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {events.length === 0 ? (
        <EmptyInline label="No upcoming site events on the public calendar." />
      ) : (
        <ul className="flex flex-col divide-y divide-border/50">
          {events.map((e) => {
            const when = new Date(e.startsAt);
            const dateLabel = Number.isFinite(when.getTime())
              ? when.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : '—';
            return (
              <li key={e.id} className="py-2.5 first:pt-0 last:pb-0">
                <Link
                  href={`/editor/site-events/${e.id}`}
                  className="flex items-start justify-between gap-3 group"
                >
                  <div className="flex min-w-0 items-start gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <CalendarDays className="h-4 w-4" />
                    </div>
                    <div className="flex min-w-0 flex-col leading-tight">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-foreground group-hover:text-primary">
                          {e.title}
                        </span>
                        {e.isFeatured && (
                          <Star className="h-3 w-3 shrink-0 fill-amber-500 text-amber-500" />
                        )}
                      </span>
                      <span className="inline-flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
                        {dateLabel}
                        {e.city && (
                          <>
                            <span className="text-border">·</span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {e.city}
                            </span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </GradientPanel>
  );
}
