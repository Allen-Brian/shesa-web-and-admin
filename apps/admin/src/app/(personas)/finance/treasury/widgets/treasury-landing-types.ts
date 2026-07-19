export interface TreasuryEntry {
  readonly scopeId: string;
  readonly scopeSlug: string;
  readonly scopeName: string;
  readonly scopeType: string;
  readonly balance: number;
  readonly currency: string;
  readonly updatedAt: string;
  readonly thirtyDayIncome: number;
  readonly thirtyDayExpenses: number;
  readonly thirtyDayNet: number;
  readonly thirtyDayEntryCount: number;
}

export interface RecentEntry {
  readonly id: string;
  readonly createdAt: string;
  readonly direction: 'income' | 'expense';
  readonly amount: number;
  readonly currency: string;
  readonly counterparty: string;
  readonly scopeName: string;
  readonly scopeSlug: string;
  readonly isReversal: boolean;
  readonly memo: string | null;
}

export type SortKey = 'name' | 'balance_desc' | 'balance_asc' | 'activity' | 'net_flow';
export type ScopeTypeFilter = 'all' | 'mainstream' | 'branch' | 'chapter' | 'other';

/** Human labels for the scope-type filter select. */
export const SCOPE_TYPE_LABELS: Record<ScopeTypeFilter, string> = {
  all: 'All types',
  mainstream: 'Mainstream',
  branch: 'Branches',
  chapter: 'Chapters',
  other: 'Other',
};

/** Rollup shape produced by the KPI compute step. */
export interface TreasuryCurrencyRollup {
  readonly balance: number;
  readonly income: number;
  readonly expenses: number;
}
