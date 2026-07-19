import type * as React from 'react';

import { formatMoney } from './shared-formatters';

/**
 * Recharts primitives shared across the charge-detail widgets.
 *
 * `CHART_PALETTE` — colour-blind-friendlyish sequence for donut /
 * stacked / grouped chart series.
 * `AXIS_TICK` — muted-foreground fill + shrunken font used on every
 * numeric / categorical axis so themes stay coherent.
 * `tooltipStyle` — matches the popover surface tokens for consistent
 * tooltip framing across light + dark.
 * `moneyTooltipFormatter` — Recharts' `formatter` prop quotes
 * `ValueType | undefined`; wrap our money formatter so the type
 * checks and undefined turns into a placeholder rather than "NaN CFA".
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
  fontSize: 11,
} as const;

export const tooltipStyle: React.CSSProperties = {
  background: 'var(--color-popover)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--color-popover-foreground)',
};

export const moneyTooltipFormatter =
  (currency: string) =>
  (value: unknown): string =>
    typeof value === 'number' ? formatMoney(value, currency) : '—';
