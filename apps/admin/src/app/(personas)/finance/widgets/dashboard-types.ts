/**
 * Shared shapes for the finance dashboard — raw DB row types the
 * loader reads, plus the derived shapes each panel consumes.
 */

export interface ScopeRow {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly scope_type: string;
}

export interface RawLedgerEntry {
  readonly id: string;
  readonly scope_id: string;
  readonly direction: string;
  readonly amount: number;
  readonly currency: string;
  readonly payment_id: string | null;
  readonly expense_id: string | null;
  readonly memo: string | null;
  readonly created_at: string;
}

export interface RawPayment {
  readonly id: string;
  readonly payer_member_id: string | null;
  readonly method: string;
  readonly metadata: Record<string, unknown> | null;
  readonly reverses_payment_id: string | null;
}

export interface RawExpense {
  readonly id: string;
  readonly payee: string;
  readonly amount: number;
  readonly currency: string;
  readonly scope_id: string;
  readonly status: string;
  readonly incurred_at: string;
  readonly reverses_expense_id: string | null;
}

export interface RawMember {
  readonly id: string;
  readonly full_name: string;
}

/** One item in the "Recent activity" feed. */
export interface DashboardActivity {
  readonly id: string;
  readonly when: string;
  readonly kind: 'payment' | 'expense' | 'other';
  readonly direction: 'income' | 'expense';
  readonly amount: number;
  readonly currency: string;
  readonly counterparty: string;
  readonly scopeName: string;
  readonly scopeSlug: string;
  readonly isReversal: boolean;
}

/** Aggregated pending-expense summary shown next to the count badge. */
export interface PendingApprovalSummary {
  readonly count: number;
  readonly totalByCurrency: ReadonlyMap<string, number>;
}

/**
 * The dashboard KPI cluster.
 *
 *   - `income` / `expensesSum` / `netFlow` — last-30-day ledger totals
 *     at the caller's active scope.
 *   - `ongoingContributions` — count of live contribution / donation /
 *     ticketed / open / goal charges (status='active' AND
 *     lifecycle='open').
 *   - `txnsThisMonth` — count of non-reversal payments recorded in
 *     the current calendar month at the active scope.
 *
 * Multi-currency ledgers set `currency` to `null` and the UI renders a
 * placeholder for money cells.
 */
export interface DashboardKpis {
  readonly income: number;
  readonly expensesSum: number;
  readonly netFlow: number;
  readonly currency: string | null;
  readonly ongoingContributions: number;
  readonly txnsThisMonth: number;
}

/** Everything the dashboard page needs to render, after loading. */
export interface DashboardData {
  readonly pendingExpenses: readonly RawExpense[];
  readonly pendingSummary: PendingApprovalSummary;
  readonly scopeById: ReadonlyMap<string, ScopeRow>;
  readonly kpis: DashboardKpis;
  readonly activity: readonly DashboardActivity[];
}
