/**
 * Shared shapes for the treasury statement drill-down. Kept in a plain
 * file so the server-side page loader and every widget sibling can
 * import from one source.
 */

export type Period = '30d' | '90d' | 'mtd' | 'ytd' | 'all';

export interface StatementSummary {
  readonly currency: string;
  readonly opening: number;
  readonly income: number;
  readonly expenses: number;
  readonly closing: number;
  readonly liveBalance: number;
  readonly liveUpdatedAt: string | null;
  readonly windowFrom: string | null;
  readonly windowTo: string;
}

export interface Entry {
  readonly id: string;
  readonly createdAt: string;
  readonly direction: 'income' | 'expense';
  readonly amount: number;
  readonly currency: string;
  readonly counterparty: string;
  readonly subtitle: string;
  readonly memo: string | null;
  readonly sourceKind: 'payment' | 'expense' | 'other';
  readonly sourceMethod: string | null;
  readonly sourceLabel: string | null;
  readonly isReversal: boolean;
}

export type SerialEntry = Entry & { readonly serial: number };
export type DirectionFilter = 'all' | 'income' | 'expense';

/** Options for the period preset selector. */
export const PERIOD_OPTIONS: readonly { value: Period; label: string }[] = [
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'mtd', label: 'Month to date' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'all', label: 'All time' },
];
