import type {
  ScopeTypeFilter,
  SortKey,
  TreasuryCurrencyRollup,
  TreasuryEntry,
} from './treasury-landing-types';
import { normaliseScopeType } from './treasury-landing-helpers';

export interface TreasuryLandingKpis {
  readonly treasuryCount: number;
  readonly activeCount: number;
  readonly byCurrency: ReadonlyMap<string, TreasuryCurrencyRollup>;
}

/**
 * Sum treasury balances + 30-day flow per currency, and count how
 * many treasuries had at least one movement in the window. Keeps the
 * orchestrator layout-only.
 */
export function buildTreasuryLandingKpis(
  treasuries: readonly TreasuryEntry[],
): TreasuryLandingKpis {
  const byCurrency = new Map<string, { balance: number; income: number; expenses: number }>();
  for (const t of treasuries) {
    const cur = byCurrency.get(t.currency) ?? { balance: 0, income: 0, expenses: 0 };
    cur.balance += t.balance;
    cur.income += t.thirtyDayIncome;
    cur.expenses += t.thirtyDayExpenses;
    byCurrency.set(t.currency, cur);
  }
  return {
    treasuryCount: treasuries.length,
    byCurrency,
    activeCount: treasuries.filter((t) => t.thirtyDayEntryCount > 0).length,
  };
}

/**
 * Apply search + scope-type filter + sort in one pass. Sort options:
 * name / balance-high / balance-low / activity / net-flow.
 */
export function filterAndSortTreasuries(
  treasuries: readonly TreasuryEntry[],
  search: string,
  scopeType: ScopeTypeFilter,
  sort: SortKey,
): TreasuryEntry[] {
  const q = search.trim().toLowerCase();
  const list = treasuries.filter((t) => {
    if (scopeType !== 'all') {
      const kind = normaliseScopeType(t.scopeType);
      if (kind !== scopeType) return false;
    }
    if (!q) return true;
    return (
      t.scopeName.toLowerCase().includes(q) ||
      t.scopeType.toLowerCase().includes(q) ||
      t.currency.toLowerCase().includes(q)
    );
  });
  return list.slice().sort((a, b) => {
    switch (sort) {
      case 'balance_desc':
        return b.balance - a.balance;
      case 'balance_asc':
        return a.balance - b.balance;
      case 'activity':
        return b.thirtyDayEntryCount - a.thirtyDayEntryCount;
      case 'net_flow':
        return b.thirtyDayNet - a.thirtyDayNet;
      case 'name':
      default:
        return a.scopeName.localeCompare(b.scopeName);
    }
  });
}

/** Distinct scope-type buckets present in the visible treasury set. */
export function collectAvailableScopeTypes(
  treasuries: readonly TreasuryEntry[],
): Set<ScopeTypeFilter> {
  const set = new Set<ScopeTypeFilter>();
  for (const t of treasuries) set.add(normaliseScopeType(t.scopeType));
  return set;
}
