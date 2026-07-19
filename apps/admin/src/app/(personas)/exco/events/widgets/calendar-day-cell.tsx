'use client';

import { isSameMonth, isToday } from 'date-fns';

import type { DayCellData } from './calendar-helpers';
import { VISIBLE_PILLS_PER_DAY } from './calendar-helpers';
import { styleForEvent } from './calendar-type-styles';
import type { EventRow } from './list-types';

interface CalendarDayCellProps {
  readonly day: DayCellData;
  readonly cursor: Date;
  readonly onEventClick: (event: EventRow) => void;
}

/**
 * One cell in the month grid. Renders up to VISIBLE_PILLS_PER_DAY event
 * pills; overflow shows as "+N more" that opens the first hidden event
 * in the preview dialog.
 */
export function CalendarDayCell({ day, cursor, onEventClick }: CalendarDayCellProps) {
  const outsideMonth = !isSameMonth(day.date, cursor);
  const todayFlag = isToday(day.date);
  const visible = day.events.slice(0, VISIBLE_PILLS_PER_DAY);
  const overflow = day.events.length - visible.length;

  return (
    <div
      className={`flex min-h-28 flex-col gap-1 bg-card p-1.5 ${
        outsideMonth ? 'bg-muted/95 text-muted-foreground' : ''
      }`}
    >
      <div className="flex justify-end">
        <span
          className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs ${
            todayFlag ? 'bg-primary text-primary-foreground font-semibold' : 'text-foreground'
          }`}
        >
          {day.date.getDate()}
        </span>
      </div>

      <div className="flex flex-col gap-0.5">
        {visible.map((e) => {
          const style = styleForEvent(e);
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => onEventClick(e)}
              className={`truncate rounded-lg px-3 py-1 text-left text-xs transition-colors ${style.pill}`}
              title={e.name}
            >
              {e.name}
            </button>
          );
        })}
        {overflow > 0 && (
          <button
            type="button"
            onClick={() => {
              const first = day.events[VISIBLE_PILLS_PER_DAY];
              if (first) onEventClick(first);
            }}
            className="px-1 py-0.5 text-left text-[10px] text-muted-foreground hover:text-foreground"
          >
            +{overflow} more
          </button>
        )}
      </div>
    </div>
  );
}
