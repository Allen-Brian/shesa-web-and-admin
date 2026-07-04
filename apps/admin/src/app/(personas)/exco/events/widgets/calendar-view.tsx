'use client';

/**
 * CalendarView — month grid with multi-day event bars.
 *
 * Multi-day events span cells: an event covering Wed–Fri renders as a
 * single bar across Wed, Thu, Fri. Bars that cross a week boundary
 * are broken into per-week segments (one continuous bar per week).
 *
 * Greedy lane assignment — each week's bars stack in the first free
 * lane. Deep weeks show "+N more" once we exceed the visible lane
 * count (currently 3).
 */

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@shesa/ui';

import type { EventRow } from './list-view';

const LANES_PER_WEEK = 3;
const WEEK_STARTS_ON = 1; // Monday

interface CalendarViewProps {
  readonly data: readonly EventRow[];
}

interface EventBar {
  readonly event: EventRow;
  readonly startCol: number; // 0-6 within the week
  readonly span: number; // number of columns
  readonly lane: number; // 0-based
  readonly continuesLeft: boolean; // bar started before this week
  readonly continuesRight: boolean; // bar continues past this week
}

interface WeekData {
  readonly days: readonly Date[];
  readonly bars: readonly EventBar[];
  readonly overflowByDay: readonly number[]; // count of hidden bars per column
}

export function CalendarView({ data }: CalendarViewProps) {
  const router = useRouter();
  const [cursor, setCursor] = useState<Date>(() => startOfMonth(new Date()));

  // Visible grid — 6 weeks starting from the first Monday on or before
  // the month's first day.
  const gridStart = useMemo(
    () => startOfWeek(startOfMonth(cursor), { weekStartsOn: WEEK_STARTS_ON }),
    [cursor],
  );
  const gridEnd = useMemo(
    () => endOfWeek(endOfMonth(cursor), { weekStartsOn: WEEK_STARTS_ON }),
    [cursor],
  );

  // Group events + build per-week bars with lane assignment.
  const weeks = useMemo<readonly WeekData[]>(() => {
    // Prefilter to events that intersect the visible grid.
    const visible = data.filter((e) => {
      const s = startOfDay(new Date(e.startAt));
      const en = startOfDay(new Date(e.endAt));
      return en >= gridStart && s <= gridEnd;
    });

    const weeksOut: WeekData[] = [];
    let d = gridStart;
    while (d <= gridEnd) {
      const weekStart = d;
      const weekEnd = addDays(weekStart, 6);
      const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

      // Compute overlapping event segments in this week.
      const segments = visible
        .filter((e) => {
          const s = startOfDay(new Date(e.startAt));
          const en = startOfDay(new Date(e.endAt));
          return en >= weekStart && s <= weekEnd;
        })
        .map((e) => {
          const s = startOfDay(new Date(e.startAt));
          const en = startOfDay(new Date(e.endAt));
          const from = s < weekStart ? weekStart : s;
          const to = en > weekEnd ? weekEnd : en;
          const startCol = Math.round(
            (from.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000),
          );
          const endCol = Math.round((to.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000));
          return {
            event: e,
            startCol,
            span: endCol - startCol + 1,
            continuesLeft: s < weekStart,
            continuesRight: en > weekEnd,
            // Longer / earlier bars claim lanes first — feels less
            // choppy visually than pure start-time ordering.
            sortKey: (endCol - startCol) * 100 - startCol,
          };
        })
        .sort((a, b) => b.sortKey - a.sortKey);

      // Greedy lane assignment.
      const lanes: boolean[][] = [];
      const bars: EventBar[] = [];
      const overflowByDay = new Array<number>(7).fill(0);

      for (const seg of segments) {
        let assigned = -1;
        for (let li = 0; li < lanes.length; li++) {
          const lane = lanes[li];
          if (!lane) continue;
          let free = true;
          for (let c = seg.startCol; c < seg.startCol + seg.span; c++) {
            if (lane[c]) {
              free = false;
              break;
            }
          }
          if (free) {
            assigned = li;
            break;
          }
        }
        if (assigned === -1) {
          const newLane = new Array<boolean>(7).fill(false);
          lanes.push(newLane);
          assigned = lanes.length - 1;
        }
        const targetLane = lanes[assigned];
        if (targetLane) {
          for (let c = seg.startCol; c < seg.startCol + seg.span; c++) {
            targetLane[c] = true;
          }
        }
        if (assigned < LANES_PER_WEEK) {
          bars.push({
            event: seg.event,
            startCol: seg.startCol,
            span: seg.span,
            lane: assigned,
            continuesLeft: seg.continuesLeft,
            continuesRight: seg.continuesRight,
          });
        } else {
          for (let c = seg.startCol; c < seg.startCol + seg.span; c++) {
            overflowByDay[c] = (overflowByDay[c] ?? 0) + 1;
          }
        }
      }

      weeksOut.push({ days, bars, overflowByDay });
      d = addDays(weekEnd, 1);
    }
    return weeksOut;
  }, [data, gridStart, gridEnd]);

  const dayLabels = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: WEEK_STARTS_ON });
    return Array.from({ length: 7 }, (_, i) => format(addDays(start, i), 'EEE'));
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Month nav bar */}
      <div className="flex items-center justify-between">
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
        <div className="w-31" /> {/* spacer to balance nav */}
      </div>

      {/* Header row */}
      <div className="grid grid-cols-7 gap-px rounded-t-md border border-b-0 border-border bg-border">
        {dayLabels.map((label) => (
          <div
            key={label}
            className="bg-muted/40 py-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Week rows */}
      <div className="flex flex-col gap-px overflow-hidden rounded-b-md border border-t-0 border-border bg-border">
        {weeks.map((w, wi) => (
          <WeekRow
            key={wi}
            week={w}
            cursor={cursor}
            onEventClick={(id) => router.push(`/exco/events/${id}`)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Week row ────────────────────────────────────────────────────────

interface WeekRowProps {
  readonly week: WeekData;
  readonly cursor: Date;
  readonly onEventClick: (id: string) => void;
}

function WeekRow({ week, cursor, onEventClick }: WeekRowProps) {
  return (
    <div
      className="relative grid grid-cols-7 bg-card"
      style={{
        gridTemplateRows: `auto repeat(${LANES_PER_WEEK}, 1.5rem) auto`,
        gap: '1px',
      }}
    >
      {/* Day cells (row 1) */}
      {week.days.map((d, i) => {
        const outsideMonth = !isSameMonth(d, cursor);
        const todayFlag = isToday(d);
        return (
          <div
            key={`d-${i}`}
            className={`min-h-24 bg-card p-1.5 ${
              outsideMonth ? 'bg-muted/20 text-muted-foreground' : ''
            }`}
            style={{ gridRow: `1 / span ${LANES_PER_WEEK + 2}` }}
          >
            <div className="flex justify-end">
              <span
                className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs ${
                  todayFlag ? 'bg-primary text-primary-foreground font-semibold' : 'text-foreground'
                }`}
              >
                {d.getDate()}
              </span>
            </div>
          </div>
        );
      })}

      {/* Event bars (rows 2 – LANES_PER_WEEK+1) */}
      {week.bars.map((bar) => (
        <button
          key={`b-${bar.event.id}-${bar.startCol}`}
          type="button"
          onClick={() => onEventClick(bar.event.id)}
          className={`mx-1 truncate rounded px-1.5 text-left text-xs transition-colors ${
            bar.event.status === 'published'
              ? 'bg-primary/15 text-primary hover:bg-primary/25'
              : bar.event.status === 'scheduled'
                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                : 'bg-muted text-muted-foreground hover:bg-muted-foreground/10'
          } ${bar.continuesLeft ? 'rounded-l-none' : ''} ${
            bar.continuesRight ? 'rounded-r-none' : ''
          }`}
          style={{
            gridColumn: `${bar.startCol + 1} / span ${bar.span}`,
            gridRow: bar.lane + 2,
          }}
          title={bar.event.name}
        >
          {bar.continuesLeft && '‹ '}
          {bar.event.name}
        </button>
      ))}

      {/* Overflow indicators (last row) */}
      {week.overflowByDay.map((count, i) =>
        count > 0 ? (
          <div
            key={`o-${i}`}
            className="px-1 pb-1 text-[10px] leading-none text-muted-foreground"
            style={{ gridColumn: i + 1, gridRow: LANES_PER_WEEK + 2 }}
          >
            +{count} more
          </div>
        ) : null,
      )}
    </div>
  );
}
