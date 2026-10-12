'use client';

/**
 * CalendarView — month grid with per-day event instances.
 *
 * A multi-day event contributes one pill to each day it covers, so a
 * three-day event shows up as three pills in three consecutive cells,
 * not one spanning bar. Day numbers stay put and lane-assignment work
 * disappears.
 *
 * Pill colour is driven by the event's first type. A small legend next
 * to the month heading shows only the types that appear in the visible
 * grid — the legend reflects what's on screen.
 *
 * Clicking a pill opens a preview Dialog with the event's headline
 * details plus an "Edit Event" button that jumps to the detail /
 * edit page.
 */

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@shesa/ui';

import { CalendarDayCell } from './calendar-day-cell';
import { CalendarEventPreviewDialog } from './calendar-event-preview-dialog';
import { CalendarTypeLegend } from './calendar-type-legend';
import { dayKey, WEEK_STARTS_ON, type DayCellData } from './calendar-helpers';
import { TYPE_STYLES } from './calendar-type-styles';
import type { EventRow } from './list-types';

interface CalendarViewProps {
  readonly data: readonly EventRow[];
}

export function CalendarView({ data }: CalendarViewProps) {
  const router = useRouter();
  const [cursor, setCursor] = useState<Date>(() => startOfMonth(new Date()));
  const [preview, setPreview] = useState<EventRow | null>(null);

  const gridStart = useMemo(
    () => startOfWeek(startOfMonth(cursor), { weekStartsOn: WEEK_STARTS_ON }),
    [cursor],
  );
  const gridEnd = useMemo(
    () => endOfWeek(endOfMonth(cursor), { weekStartsOn: WEEK_STARTS_ON }),
    [cursor],
  );

  // Every day the event covers gets its own reference to the row.
  // Multi-day events end up in several buckets — one per day they span.
  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventRow[]>();
    for (const e of data) {
      const s = startOfDay(new Date(e.startAt));
      const en = startOfDay(new Date(e.endAt));
      if (Number.isNaN(s.getTime()) || Number.isNaN(en.getTime())) continue;
      // Clip to the visible grid so a January event doesn't drag us
      // through 3000 iterations when the user is on December's page.
      const from = s < gridStart ? gridStart : s;
      const to = en > gridEnd ? gridEnd : en;
      if (from > to) continue;
      const days = differenceInCalendarDays(to, from);
      for (let i = 0; i <= days; i++) {
        const d = addDays(from, i);
        const key = dayKey(d);
        const bucket = map.get(key) ?? [];
        bucket.push(e);
        map.set(key, bucket);
      }
    }
    for (const bucket of map.values()) {
      bucket.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    }
    return map;
  }, [data, gridStart, gridEnd]);

  // Types actually present on this month's grid — legend reflects what's
  // on screen rather than listing every type in the catalog.
  const activeTypes = useMemo(() => {
    const set = new Set<string>();
    for (const bucket of eventsByDay.values()) {
      for (const e of bucket) set.add(e.types[0] ?? 'other');
    }
    // Stable order — walk the catalog once so the legend doesn't
    // reshuffle every time an event is added.
    return Object.keys(TYPE_STYLES).filter((t) => set.has(t));
  }, [eventsByDay]);

  const weeks = useMemo<DayCellData[][]>(() => {
    const out: DayCellData[][] = [];
    let d = gridStart;
    while (d <= gridEnd) {
      const row: DayCellData[] = [];
      for (let i = 0; i < 7; i++) {
        const date = addDays(d, i);
        row.push({ date, events: eventsByDay.get(dayKey(date)) ?? [] });
      }
      out.push(row);
      d = addDays(d, 7);
    }
    return out;
  }, [eventsByDay, gridStart, gridEnd]);

  const dayLabels = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: WEEK_STARTS_ON });
    return Array.from({ length: 7 }, (_, i) => format(addDays(start, i), 'EEE'));
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCursor((c) => subMonths(c, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(startOfMonth(new Date()))}>
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCursor((c) => addMonths(c, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <h2 className="text-lg font-medium">{format(cursor, 'MMMM yyyy')}</h2>
        <CalendarTypeLegend activeTypes={activeTypes} />
      </div>

      <div className="grid grid-cols-7 gap-px rounded-t-md border border-b-0 border-border bg-border">
        {dayLabels.map((label) => (
          <div
            key={label}
            className="bg-muted/40 rounded-t-sm py-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-px overflow-hidden rounded-b-md border border-t-0 border-border bg-border">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-px bg-border">
            {week.map((day) => (
              <CalendarDayCell
                key={day.date.toISOString()}
                day={day}
                cursor={cursor}
                onEventClick={setPreview}
              />
            ))}
          </div>
        ))}
      </div>

      <CalendarEventPreviewDialog
        event={preview}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
        onEdit={(id) => {
          setPreview(null);
          router.push(`/exco/events/${id}`);
        }}
      />
    </div>
  );
}
