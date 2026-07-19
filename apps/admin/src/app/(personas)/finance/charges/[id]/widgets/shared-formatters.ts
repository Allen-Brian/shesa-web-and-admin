import type { MatrixPeriod } from './charge-detail-types';

/** Rounded whole-number money format with the currency suffix. */
export function formatMoney(amount: number, currency: string): string {
  return `${new Intl.NumberFormat().format(Math.round(amount))} ${currency}`;
}

/** Human label for the payment method enum. */
export function formatMethod(method: string): string {
  switch (method) {
    case 'cash':
      return 'Cash';
    case 'mtn_momo':
      return 'MTN MoMo';
    case 'orange_money':
      return 'Orange Money';
    case 'bank_transfer':
      return 'Bank transfer';
    case 'card':
      return 'Card';
    default:
      return method;
  }
}

/** "Feb 2026" style header for a period column. Falls back to raw string. */
export function formatPeriodHeader(p: MatrixPeriod): string {
  if (!p.periodStart) return 'One-off';
  const d = new Date(p.periodStart);
  if (Number.isNaN(d.getTime())) return p.periodStart;
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

/** "Feb" — used for the compact column headers in the wide matrix. */
export function formatPeriodShort(p: MatrixPeriod): string {
  if (!p.periodStart) return 'One-off';
  const d = new Date(p.periodStart);
  if (Number.isNaN(d.getTime())) return p.periodStart;
  return d.toLocaleDateString(undefined, { month: 'short' });
}

/** kebab-case slug capped at 60 chars. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** "Every month" / "Every 2 quarters" / "One-time". */
export function formatRecurrence(recurrence: string, interval: number): string {
  if (recurrence === 'one_time') return 'One-time';
  const label =
    recurrence === 'biannual'
      ? 'half-year'
      : recurrence === 'quarterly'
        ? 'quarter'
        : recurrence === 'yearly'
          ? 'year'
          : recurrence === 'monthly'
            ? 'month'
            : recurrence;
  return interval === 1 ? `Every ${label}` : `Every ${interval} ${label}s`;
}

/** Compact axis tick — `1.2M` / `340k` / `812`. */
export function compactNumber(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

/** "Feb 6" — the compact axis / tooltip date form. */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Monday of the ISO week containing `iso`, as `yyyy-MM-dd`. */
export function weekStartIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const day = d.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - daysSinceMonday);
  return monday.toISOString().slice(0, 10);
}

/** "today" / "yesterday" / "5 days ago" / "3mo ago" / "2y ago". */
export function relativeDaysAgo(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
  if (diff <= 0) return 'today';
  if (diff === 1) return 'yesterday';
  if (diff < 30) return `${diff} days ago`;
  if (diff < 365) return `${Math.round(diff / 30)}mo ago`;
  return `${Math.round(diff / 365)}y ago`;
}

/** First+last initial for the avatar chip. Returns `—` on empty input. */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '—';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

/**
 * Client-side CSV download. Escapes RFC-4180-style, prepends a BOM so
 * Excel opens Unicode content correctly, and appends the current date
 * to the filename so repeat exports don't overwrite in the browser's
 * downloads folder.
 */
export function downloadCsv(baseName: string, rows: readonly (readonly string[])[]): void {
  const escape = (v: string): string =>
    v.includes('"') || v.includes(',') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v;
  const csv = rows.map((r) => r.map(escape).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const ts = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `${baseName}-${ts}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
