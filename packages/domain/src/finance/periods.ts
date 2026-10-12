/**
 * Charge period boundary math.
 *
 * Given a charge's recurrence + interval + a reference instant, returns
 * the current period as `{ start, end }` (half-open — `end` is exclusive).
 * Used by obligation generation to answer "what period is this
 * generation run covering?" and by proration to compute the day-fraction
 * for a mid-period joiner.
 *
 * Pure. Timezone-neutral: all inputs and outputs are `Date` in UTC.
 * Callers that need locale-aware boundaries convert at the display
 * layer; storage stays in UTC.
 */

import type { ChargeRecurrence } from './enums';

export interface Period {
  readonly start: Date;
  /** Exclusive. The next period's start. */
  readonly end: Date;
}

/**
 * Compute the current period for a recurring charge as of `reference`.
 * `one_time` recurrence has no natural period; callers must handle that
 * shape explicitly. This function throws if called with `one_time`.
 */
export function computeCurrentPeriod(
  recurrence: ChargeRecurrence,
  interval: number,
  reference: Date = new Date(),
): Period {
  if (recurrence === 'one_time') {
    throw new Error('computeCurrentPeriod: one_time charges do not have a recurring period');
  }
  if (interval < 1) {
    throw new Error(`computeCurrentPeriod: interval must be >= 1 (got ${interval})`);
  }

  const y = reference.getUTCFullYear();
  const m = reference.getUTCMonth(); // 0-11

  switch (recurrence) {
    case 'monthly': {
      // With interval > 1, e.g. every 2 months, anchor to Jan of the
      // reference's year (deterministic; matches how humans read
      // "bi-monthly starting January").
      const anchoredMonth = Math.floor(m / interval) * interval;
      const start = new Date(Date.UTC(y, anchoredMonth, 1));
      const end = new Date(Date.UTC(y, anchoredMonth + interval, 1));
      return { start, end };
    }
    case 'quarterly': {
      const quarter = Math.floor(m / 3); // 0-3
      const anchoredQuarter = Math.floor(quarter / interval) * interval;
      const start = new Date(Date.UTC(y, anchoredQuarter * 3, 1));
      const end = new Date(Date.UTC(y, (anchoredQuarter + interval) * 3, 1));
      return { start, end };
    }
    case 'biannual': {
      const half = m < 6 ? 0 : 1;
      const anchoredHalf = Math.floor(half / interval) * interval;
      const start = new Date(Date.UTC(y, anchoredHalf * 6, 1));
      const end = new Date(Date.UTC(y, (anchoredHalf + interval) * 6, 1));
      return { start, end };
    }
    case 'yearly': {
      const anchoredYear = Math.floor(y / interval) * interval;
      const start = new Date(Date.UTC(anchoredYear, 0, 1));
      const end = new Date(Date.UTC(anchoredYear + interval, 0, 1));
      return { start, end };
    }
    default: {
      const _exhaustive: never = recurrence;
      throw new Error(`computeCurrentPeriod: unknown recurrence ${_exhaustive}`);
    }
  }
}

/**
 * Days between two dates, floored. Used by proration and by the "is
 * this member's join inside the period?" check.
 *
 * DST-safe because we treat every calendar day as 86,400,000 ms — this
 * function is only for period arithmetic, never wall-clock scheduling.
 */
export function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / 86_400_000);
}
