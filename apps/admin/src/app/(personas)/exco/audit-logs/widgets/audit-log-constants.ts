import type { CategoryFilter, WindowFilter } from './audit-log-widget-types';

export const CATEGORY_META: Record<CategoryFilter, { label: string; tone: string }> = {
  all: { label: 'All', tone: '' },
  grant: {
    label: 'Grants',
    tone: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  },
  revoke: {
    label: 'Revokes',
    tone: 'border-destructive/40 bg-destructive/10 text-destructive',
  },
  change: {
    label: 'Changes',
    tone: 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  },
  system: {
    label: 'System',
    tone: 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  },
  event: { label: 'Other', tone: 'border-border bg-muted/30 text-foreground' },
};

export const WINDOW_MS: Record<WindowFilter, number | null> = {
  all: null,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

export const CATEGORY_ORDER: readonly CategoryFilter[] = [
  'all',
  'grant',
  'change',
  'revoke',
  'system',
  'event',
];
