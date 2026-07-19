import type {
  DashboardActivity,
  DashboardKpis,
  PendingApprovalSummary,
  RawExpense,
  RawLedgerEntry,
  RawPayment,
  ScopeRow,
  TreasuryRow,
} from './dashboard-types';

/**
 * Pure aggregators over the raw rows the loader fetches. Kept out of
 * the loader file so the loader stays purely I/O — the reduce logic
 * is unit-testable without touching Supabase.
 */

export function buildDashboardKpis(
  treasuries: readonly TreasuryRow[],
  ledger: readonly RawLedgerEntry[],
): DashboardKpis {
  const balanceByCurrency = new Map<string, number>();
  for (const t of treasuries) {
    balanceByCurrency.set(
      t.currency,
      (balanceByCurrency.get(t.currency) ?? 0) + parseFloat(t.balance),
    );
  }
  const flowByCurrency = new Map<string, { income: number; expenses: number }>();
  for (const e of ledger) {
    const amt = parseFloat(e.amount);
    const cur = flowByCurrency.get(e.currency) ?? { income: 0, expenses: 0 };
    if (e.direction === 'income') cur.income += amt;
    else if (e.direction === 'expense') cur.expenses += amt;
    flowByCurrency.set(e.currency, cur);
  }
  const singleCurrency: string | null =
    balanceByCurrency.size === 1 ? (balanceByCurrency.keys().next().value ?? null) : null;
  const totalBalance = singleCurrency ? (balanceByCurrency.get(singleCurrency) ?? 0) : null;
  const flow = singleCurrency ? flowByCurrency.get(singleCurrency) : null;
  const income = flow?.income ?? 0;
  const expensesSum = flow?.expenses ?? 0;
  return {
    balanceByCurrency,
    singleCurrency,
    totalBalance,
    income,
    expensesSum,
    netFlow: income - expensesSum,
  };
}

export function buildPendingSummary(
  pendingExpenses: readonly RawExpense[],
): PendingApprovalSummary {
  const totalByCurrency = new Map<string, number>();
  for (const e of pendingExpenses) {
    totalByCurrency.set(e.currency, (totalByCurrency.get(e.currency) ?? 0) + parseFloat(e.amount));
  }
  return { count: pendingExpenses.length, totalByCurrency };
}

interface ActivityBuildInput {
  readonly ledger: readonly RawLedgerEntry[];
  readonly scopeById: ReadonlyMap<string, ScopeRow>;
  readonly paymentById: ReadonlyMap<string, RawPayment>;
  readonly memberById: ReadonlyMap<string, string>;
  readonly recentExpenses: readonly RawExpense[];
  readonly limit: number;
}

/**
 * Turns each ledger row into an Activity item — resolving payment vs
 * expense vs "other", deriving a counterparty label, and flagging
 * reversals so the UI can dampen them.
 */
export function buildActivity({
  ledger,
  scopeById,
  paymentById,
  memberById,
  recentExpenses,
  limit,
}: ActivityBuildInput): DashboardActivity[] {
  return ledger
    .slice(0, 40)
    .map((l): DashboardActivity => {
      const scope = scopeById.get(l.scope_id);
      let kind: DashboardActivity['kind'] = 'other';
      let counterparty = 'Ledger entry';
      let isReversal = false;
      if (l.payment_id) {
        kind = 'payment';
        const p = paymentById.get(l.payment_id);
        const meta = (p?.metadata ?? {}) as { donor_name?: string; public_donation?: boolean };
        const donorLabel = meta.donor_name ?? (meta.public_donation ? 'Anonymous donor' : null);
        counterparty =
          (p?.payer_member_id ? memberById.get(p.payer_member_id) : null) ??
          donorLabel ??
          'Payment';
        isReversal = !!p?.reverses_payment_id;
      } else if (l.expense_id) {
        kind = 'expense';
        const e = recentExpenses.find((x) => x.id === l.expense_id);
        counterparty = e?.payee ?? 'Expense';
        isReversal = !!e?.reverses_expense_id;
      }
      return {
        id: l.id,
        when: l.created_at,
        kind,
        direction: l.direction === 'expense' ? 'expense' : 'income',
        amount: parseFloat(l.amount),
        currency: l.currency,
        counterparty,
        scopeName: scope?.name ?? '—',
        scopeSlug: scope?.slug ?? '',
        isReversal,
      };
    })
    .slice(0, limit);
}
