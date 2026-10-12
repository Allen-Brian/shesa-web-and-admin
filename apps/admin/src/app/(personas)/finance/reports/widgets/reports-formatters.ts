import type * as React from 'react';

/**
 * Shared numeric + string formatters and Recharts styling constants
 * used across the reports view's chart panels, insights cards, and
 * DataTable column defs.
 */

export const CHART_PALETTE = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#f43f5e', // rose
  '#06b6d4', // cyan
  '#f97316', // orange
  '#64748b', // slate
];

export const AXIS_TICK = {
  fill: 'var(--color-muted-foreground)',
  fontSize: 13,
} as const;

export const tooltipStyle: React.CSSProperties = {
  background: 'var(--color-popover)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  fontSize: 14,
  color: 'var(--color-popover-foreground)',
};

/** Human label for the payment method enum. */

/** Rounded whole-number money with a trailing currency suffix. */

/** Compact axis tick — `1.2M` / `340k` / `812`. */
export function compactNumber(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}

/** Truncate + ellipsis for tight chart labels. */
export function shorten(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}

/**
 * Simple CSV builder + download. Matches the escape rules used on the
 * Charge Detail page so exports open cleanly in Excel + Sheets.
 */
export function downloadCsv(baseName: string, rows: readonly (readonly string[])[]): void {
  const escape = (v: string): string =>
    v.includes('"') || v.includes(',') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v;
  const csv = rows.map((r) => r.map(escape).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseName}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Re-exported from the shared formatters so this module keeps one import
// surface. These were local copies — formatMethod alone existed in five
// places, formatMoney in four.
export { formatPaymentMethod as formatMethod } from '@/lib/format/payment-method';
export { formatMoney } from '@/lib/finance/format-money';
