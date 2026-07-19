/**
 * Shared shapes for the finance dashboard — raw DB row types the
 * loader reads, plus the derived shapes each panel consumes. Kept
 * plain so the server-only loader and the presentational panels can
 * import from a single source.
 */

export interface TreasuryRow {
  readonly scope_id: string;
  readonly balance: string;
  readonly currency: string;
  readonly updated_at: string;
}

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
  readonly amount: string;
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
  readonly amount: string;
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

/** Hero-KPI cluster + supporting flow data derived by the loader. */
export interface DashboardKpis {
  readonly balanceByCurrency: ReadonlyMap<string, number>;
  readonly singleCurrency: string | null;
  readonly totalBalance: number | null;
  readonly income: number;
  readonly expensesSum: number;
  readonly netFlow: number;
}

/** Everything the dashboard page needs to render, after loading. */
export interface DashboardData {
  readonly treasuries: readonly TreasuryRow[];
  readonly topTreasuries: readonly TreasuryRow[];
  readonly pendingExpenses: readonly RawExpense[];
  readonly pendingSummary: PendingApprovalSummary;
  readonly scopeById: ReadonlyMap<string, ScopeRow>;
  readonly kpis: DashboardKpis;
  readonly activity: readonly DashboardActivity[];
}
