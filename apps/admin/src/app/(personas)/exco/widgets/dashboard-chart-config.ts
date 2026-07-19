import type { CSSProperties } from 'react';

export const CHART_PRIMARY = '#c53030'; // theme primary — Shesa red
export const CHART_SECONDARY = '#3b82f6'; // blue — used for the "expected" bar
export const CHART_MUTED = '#94a3b8'; // slate — used for "unregistered"

export const tooltipStyle: CSSProperties = {
  backgroundColor: 'var(--color-card)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  fontSize: 12,
  padding: '6px 10px',
};

export const tooltipLabelStyle: CSSProperties = {
  color: 'var(--color-muted-foreground)',
  fontSize: 11,
  fontWeight: 500,
};
