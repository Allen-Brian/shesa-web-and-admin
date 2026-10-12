'use client';

import { OTHER_STYLE, TYPE_STYLES } from './calendar-type-styles';

interface CalendarTypeLegendProps {
  readonly activeTypes: readonly string[];
}

/**
 * Inline legend next to the month title. Renders only the event types
 * that actually appear on the currently-visible grid so it reflects
 * what the operator is looking at, not every type in the catalog.
 */
export function CalendarTypeLegend({ activeTypes }: CalendarTypeLegendProps) {
  if (activeTypes.length === 0) return null;
  return (
    <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {activeTypes.map((t) => {
        const style = TYPE_STYLES[t] ?? OTHER_STYLE;
        return (
          <span key={t} className="inline-flex items-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded-full ${style.dot}`} />
            <span>{style.label}</span>
          </span>
        );
      })}
    </div>
  );
}
