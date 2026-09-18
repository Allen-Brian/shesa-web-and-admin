/**
 * West Africa Time, everywhere.
 *
 * SHESA publishes every deadline in WAT, so a date rendered in the server's
 * zone — or the reader's laptop's — is a different deadline wearing the same
 * digits. One place to convert, used by every Voting screen.
 */

export const WAT = 'Africa/Lagos';

export function watDate(iso: string | null, withTime = true): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: WAT,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

/**
 * An ISO timestamp as a `datetime-local` value in WAT.
 *
 * The input carries no timezone, so the string handed to it must already be
 * in the zone the reader thinks in.
 */
export function toWatInput(iso: string | null): string {
  if (!iso) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: WAT,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  // Midnight comes back as hour "24" from some ICU builds.
  const hour = get('hour') === '24' ? '00' : get('hour');
  return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

/** The inverse: a `datetime-local` value read as WAT, returned as UTC. */
export function fromWatInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(`${value}:00+01:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
