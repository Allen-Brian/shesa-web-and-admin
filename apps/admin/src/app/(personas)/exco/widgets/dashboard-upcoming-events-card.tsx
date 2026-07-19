import Link from 'next/link';
import { Calendar as CalendarIcon } from 'lucide-react';

import { Badge, GradientPanel } from '@shesa/ui';

import { DashboardDateTile } from './dashboard-date-tile';
import { DashboardEmptyBlock } from './dashboard-empty-block';
import { EVENT_TYPE_STYLE, eventStyle } from './dashboard-event-styles';
import type { EventItem } from './dashboard-types';

export function DashboardUpcomingEventsCard({ events }: { readonly events: readonly EventItem[] }) {
  return (
    <GradientPanel className="p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <CalendarIcon className="h-4 w-4 text-primary" />
            Upcoming events
          </h2>
          <p className="text-xs text-muted-foreground">Next five on the calendar</p>
        </div>
        <Link href="/exco/events" className="text-xs font-medium text-primary hover:underline">
          View all →
        </Link>
      </div>
      {events.length === 0 ? (
        <DashboardEmptyBlock label="No upcoming events." />
      ) : (
        <ul className="divide-y divide-border/40">
          {events.map((e) => {
            const style = eventStyle(e.types);
            return (
              <li
                key={e.id}
                className="flex gap-3 py-2 pl-2"
                style={{ borderLeftColor: style.hex, borderLeftWidth: 3 }}
              >
                <DashboardDateTile iso={e.startAt} bgClass={style.badge} />
                <div className="flex min-w-0 flex-1 flex-col leading-tight">
                  <span className="truncate text-sm font-medium text-foreground">{e.name}</span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {e.venue ?? '—'} · {e.scopeName}
                  </span>
                  {e.types.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {e.types.slice(0, 3).map((t) => {
                        const ts = EVENT_TYPE_STYLE[t] ?? EVENT_TYPE_STYLE.other!;
                        return (
                          <Badge
                            key={t}
                            variant="outline"
                            className={`text-[10px] capitalize ${ts.badge}`}
                          >
                            {t.replace('_', ' ')}
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </GradientPanel>
  );
}
