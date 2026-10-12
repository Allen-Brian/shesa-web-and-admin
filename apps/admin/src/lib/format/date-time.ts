/**
 * Shared date/time formatters for finance surfaces.
 *
 * Two-line "date + time" layout is the house style for payments:
 *   thu, 27 May 2026
 *   23:00
 *
 * These helpers keep the tokens in one place so the transactions
 * table, the contribution detail table, and the transaction detail
 * sheet all render the same shape. `formatShortDay` uses a
 * comma-separated form with a capitalised weekday (`Thu, 27 May 2026`);
 * `formatTime24` emits 24-hour local time (`23:00`).
 *
 * Both accept `null`/`undefined` and return `null` so cells can
 * fall back to an em-dash-free placeholder at the render site.
 */
export function formatShortDay(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const dayFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(d);
  const restFmt = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
  return `${dayFmt}, ${restFmt}`;
}

export function formatTime24(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(d);
}

export function formatDateOnly(iso: string | null | undefined): string | null {
  return formatShortDay(iso);
}
