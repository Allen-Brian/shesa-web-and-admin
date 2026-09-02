import type {
  DashboardActivity,
  DashboardKpis,
  PendingApprovalSummary,
  RawExpense,
  RawLedgerEntry,
  RawPayment,
  ScopeRow,
} from './dashboard-types';

/**
 * Pure aggregators over the raw rows the loader fetches. Kept out of
 * the loader file so the reduce logic is unit-testable without
 * touching Supabase.
 */

interface Counts {
  readonly ongoingContributions: number;
  readonly txnsThisMonth: number;
}

/**
 * Reduce the last-30-day ledger to Income / Expenses / Net, and layer
 * on the pre-computed row counts. When every ledger row shares one
 * currency we set `currency`; mixed-currency ledgers return `null` and
 * the UI shows a placeholder for money cells.
 */
export function buildDashboardKpis(
  ledger: readonly RawLedgerEntry[],
  counts: Counts,
): DashboardKpis {
  let income = 0;
  let expensesSum = 0;
  const currencies = new Set<string>();
  for (const e of ledger) {
    const amt = e.amount;
    currencies.add(e.currency);
    if (e.direction === 'income') income += amt;
    else if (e.direction === 'expense') expensesSum += amt;
  }
  const currency = currencies.size === 1 ? (currencies.values().next().value ?? null) : null;
  return {
    income,
    expensesSum,
    netFlow: income - expensesSum,
    currency,
    ongoingContributions: counts.ongoingContributions,
    txnsThisMonth: counts.txnsThisMonth,
  };
}

export function buildPendingSummary(
  pendingExpenses: readonly RawExpense[],
): PendingApprovalSummary {
  const totalByCurrency = new Map<string, number>();
  for (const e of pendingExpenses) {
    totalByCurrency.set(e.currency, (totalByCurrency.get(e.currency) ?? 0) + e.amount);
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
        const meta = (p?.metadata ?? {}) as {
          donor_name?: string;
          public_donation?: boolean;
          payer_name?: string;
          public_ticket_purchase?: boolean;
        };
        const donorLabel =
          meta.donor_name ??
          meta.payer_name ??
          (meta.public_donation
            ? 'Anonymous donor'
            : meta.public_ticket_purchase
              ? 'Anonymous buyer'
              : null);
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
        amount: l.amount,
        currency: l.currency,
        counterparty,
        scopeName: scope?.name ?? '—',
        scopeSlug: scope?.slug ?? '',
        isReversal,
      };
    })
    .slice(0, limit);
}
