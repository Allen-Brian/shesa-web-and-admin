import type { ScopeTypeFilter } from './treasury-landing-types';

/**
 * Bucket a raw `core.scopes.scope_type` value into the four buckets
 * the treasury filter recognises. Anything not mainstream/branch/
 * chapter (batches, houses, networks, …) rolls up under `other`.
 */
export function normaliseScopeType(raw: string): ScopeTypeFilter {
  if (raw === 'mainstream') return 'mainstream';
  if (raw === 'branch') return 'branch';
  if (raw === 'chapter') return 'chapter';
  return 'other';
}

/** Two-decimal rounded amount with thousands separators. */
export function formatAmount(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return new Intl.NumberFormat().format(rounded);
}

/**
 * "just now" / "5 minutes ago" / "3 hours ago" / "2 days ago" — then
 * falls back to a locale date once the gap exceeds a month. Same
 * shape used by the finance dashboard so treasury copy stays
 * consistent.
 */
export function formatRelative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const secs = Math.round((now - then) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString();
}
