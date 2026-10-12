/**
 * "How long ago" labels for activity feeds and audit trails.
 *
 * ─── Why this is one module now ─────────────────────────────────────
 * There were three implementations differing on two axes:
 *
 *   exco dashboard    "5m ago"          falls back to a date after 7 days
 *   finance dashboard "5 minutes ago"   falls back after 30 days
 *   audit logs        "5m ago"          falls back after 30 days
 *
 * The wording difference is deliberate — a compact KPI card wants "5m",
 * a prose activity feed wants "5 minutes" — so it survives as two named
 * functions. The 7-versus-30-day split was not deliberate; nothing
 * distinguishes the exco dashboard from the audit log in a way that
 * would justify one showing a date where the other shows "12d ago".
 * Unified on 30 days.
 */

const FALLBACK_AFTER_DAYS = 30;

interface Elapsed {
  readonly secs: number;
  readonly mins: number;
  readonly hrs: number;
  readonly days: number;
}

function elapsedSince(iso: string): Elapsed | null {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const secs = Math.round((Date.now() - then) / 1000);
  const mins = Math.round(secs / 60);
  const hrs = Math.round(mins / 60);
  return { secs, mins, hrs, days: Math.round(hrs / 24) };
}

/** Compact: "just now", "5m ago", "3h ago", "12d ago". For cards and tables. */
export function formatRelativeShort(iso: string): string {
  const e = elapsedSince(iso);
  if (!e) return '—';
  if (e.secs < 60) return 'just now';
  if (e.mins < 60) return `${e.mins}m ago`;
  if (e.hrs < 24) return `${e.hrs}h ago`;
  if (e.days < FALLBACK_AFTER_DAYS) return `${e.days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** Prose: "just now", "5 minutes ago", "3 hours ago", "12 days ago". For feeds. */
export function formatRelativeLong(iso: string): string {
  const e = elapsedSince(iso);
  if (!e) return '—';
  if (e.secs < 60) return 'just now';
  if (e.mins < 60) return `${e.mins} minute${e.mins === 1 ? '' : 's'} ago`;
  if (e.hrs < 24) return `${e.hrs} hour${e.hrs === 1 ? '' : 's'} ago`;
  if (e.days < FALLBACK_AFTER_DAYS) return `${e.days} day${e.days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString();
}
