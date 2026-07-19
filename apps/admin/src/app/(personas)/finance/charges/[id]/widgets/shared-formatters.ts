import type { MatrixPeriod } from './charge-detail-view';

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
