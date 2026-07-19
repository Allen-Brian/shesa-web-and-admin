'use client';

import { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

import { GradientPanel } from '@shesa/ui';

import { EVENT_TYPE_STYLE, eventStyle } from './dashboard-event-styles';
import type { CalendarEvent } from './dashboard-types';

const WEEK_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/**
 * Compact month calendar with per-cell tinting. The primary event on
 * each day drives the cell's background (light tint via hex22 opacity);
 * up to three coloured dots at the cell bottom indicate multiple events.
 * A small legend under the grid shows up to six of the event types
 * present this month.
 */
export function DashboardCalendarCard({ events }: { readonly events: readonly CalendarEvent[] }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const monthLabel = useMemo(
    () =>
      new Date(cursor.year, cursor.month, 1).toLocaleString(undefined, {
        month: 'long',
        year: 'numeric',
      }),
    [cursor],
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>();
    for (const e of events) {
      const d = new Date(e.startAt);
      if (d.getFullYear() !== cursor.year || d.getMonth() !== cursor.month) continue;
      const bucket = map.get(d.getDate()) ?? [];
      bucket.push(e);
      map.set(d.getDate(), bucket);
    }
    return map;
  }, [events, cursor]);

  const firstDay = new Date(cursor.year, cursor.month, 1);
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const leadingBlanks = firstDay.getDay();

  const cells: Array<{ day: number | null; events: CalendarEvent[] }> = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push({ day: null, events: [] });
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, events: eventsByDay.get(d) ?? [] });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, events: [] });

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === cursor.year && today.getMonth() === cursor.month;

  const shiftMonth = (delta: number) =>
    setCursor((c) => {
      const next = new Date(c.year, c.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });

  return (
    <GradientPanel className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <CalendarIcon className="h-4 w-4 text-primary" />
            Calendar
          </h2>
          <p className="text-xs text-muted-foreground">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="rounded-md border border-border p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="rounded-md border border-border p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Next month"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {WEEK_LABELS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          const isToday = isCurrentMonth && cell.day === today.getDate();
          const primaryEvent = cell.events[0];
          const primaryStyle = primaryEvent ? eventStyle(primaryEvent.types) : null;
          return (
            <div
              key={i}
              className={`relative aspect-square rounded-md p-1 text-[11px] transition-colors ${
                cell.day ? 'hover:brightness-110' : ''
              } ${isToday ? 'ring-1 ring-primary' : ''}`}
              style={{
                backgroundColor: primaryStyle ? `${primaryStyle.hex}22` : undefined,
              }}
              title={cell.events.map((e) => e.name).join(', ')}
            >
              {cell.day && !primaryStyle && (
                <div className="absolute inset-0 rounded-md bg-background/40" aria-hidden />
              )}
              {cell.day && (
                <>
                  <span
                    className={`relative tabular-nums ${
                      isToday
                        ? 'font-semibold text-primary'
                        : primaryStyle
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                    }`}
                  >
                    {cell.day}
                  </span>
                  {cell.events.length > 0 && (
                    <div className="absolute inset-x-1 bottom-1 flex flex-wrap gap-0.5">
                      {cell.events.slice(0, 3).map((e) => {
                        const s = eventStyle(e.types);
                        return (
                          <span
                            key={e.id}
                            className={`h-1 w-1 rounded-full ${s.dot}`}
                            aria-hidden
                          />
                        );
                      })}
                      {cell.events.length > 3 && (
                        <span className="text-[9px] text-foreground">+</span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        {Array.from(new Set(events.flatMap((e) => e.types)))
          .slice(0, 6)
          .map((t) => {
            const s = EVENT_TYPE_STYLE[t] ?? EVENT_TYPE_STYLE.other!;
            return (
              <span key={t} className="inline-flex items-center gap-1">
                <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                {t.replace('_', ' ')}
              </span>
            );
          })}
      </div>
    </GradientPanel>
  );
}
