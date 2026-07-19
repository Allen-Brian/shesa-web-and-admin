import type { ExpenseRow } from './expenses-types';

export interface ExpenseKpis {
  readonly total: number;
  readonly pending: number;
  readonly reversalCount: number;
  readonly primaryCurrency: string | undefined;
  readonly netSpent: number | null;
  readonly avg: number;
  readonly settledCount: number;
}

/**
 * Rolls the expenses list into the headline strip:
 *  - reversals are added back (net spent = originals − reversals),
 *  - pending_approval original rows counted separately,
 *  - net spent + avg only surface when every row shares one currency
 *    (multi-currency portfolios show "—" instead of an incoherent sum).
 */
export function buildExpenseKpis(expenses: readonly ExpenseRow[]): ExpenseKpis {
  const currencies = new Map<string, number>();
  let pending = 0;
  let reversalCount = 0;
  for (const e of expenses) {
    if (e.reversesExpenseId) {
      reversalCount += 1;
      currencies.set(e.currency, (currencies.get(e.currency) ?? 0) - e.amount);
    } else {
      currencies.set(e.currency, (currencies.get(e.currency) ?? 0) + e.amount);
      if (e.status === 'pending_approval') pending += 1;
    }
  }
  const primaryCurrency = currencies.size === 1 ? currencies.keys().next().value : undefined;
  const netSpent =
    primaryCurrency !== undefined ? Math.max(0, currencies.get(primaryCurrency)!) : null;
  const settledExpenses = expenses.filter((e) => !e.reversesExpenseId && !e.isReversed);
  const avg =
    settledExpenses.length > 0
      ? settledExpenses.reduce((a, b) => a + b.amount, 0) / settledExpenses.length
      : 0;
  return {
    total: expenses.length,
    pending,
    reversalCount,
    primaryCurrency,
    netSpent,
    avg,
    settledCount: settledExpenses.length,
  };
}
