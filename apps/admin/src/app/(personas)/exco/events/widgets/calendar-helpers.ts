import { format } from 'date-fns';

import type { EventRow } from './list-types';

export const VISIBLE_PILLS_PER_DAY = 3;

/** Monday. `startOfWeek` / `endOfWeek` take this as an option. */
export const WEEK_STARTS_ON = 1;

export interface DayCellData {
  readonly date: Date;
  readonly events: readonly EventRow[];
}

export function dayKey(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function humanizeType(t: string): string {
  return t
    .split('_')
    .map((p) => (p.length > 0 ? p[0]!.toUpperCase() + p.slice(1) : p))
    .join(' ');
}

export function formatEventRange(startIso: string, endIso: string): string {
  const s = new Date(startIso);
  const e = new Date(endIso);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return '—';
  const sameDay = format(s, 'yyyy-MM-dd') === format(e, 'yyyy-MM-dd');
  if (sameDay) {
    return `${format(s, 'EEE, MMM d, yyyy')} · ${format(s, 'h:mm a')} – ${format(e, 'h:mm a')}`;
  }
  return `${format(s, 'EEE, MMM d, h:mm a')} → ${format(e, 'EEE, MMM d, h:mm a')}`;
}
