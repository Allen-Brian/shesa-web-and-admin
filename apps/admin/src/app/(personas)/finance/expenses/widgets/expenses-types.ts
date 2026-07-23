export interface ExpenseRow {
  readonly id: string;
  readonly scopeId: string;
  readonly scopeName: string;
  readonly categoryKey: string | null;
  readonly categoryName: string | null;
  readonly payee: string;
  readonly amount: number;
  readonly currency: string;
  readonly description: string | null;
  readonly status: string;
  readonly reversesExpenseId: string | null;
  readonly isReversed: boolean;
  readonly incurredAt: string;
  readonly createdAt: string;
  readonly groupId: string | null;
  readonly groupName: string | null;
}

/**
 * Event groups visible to the caller — used to build the Group
 * filter dropdown above the expenses table.
 */
export interface GroupOption {
  readonly id: string;
  readonly name: string;
}

export interface ScopeOption {
  readonly id: string;
  readonly name: string;
  readonly currency: string;
  readonly threshold: number | null;
}

export interface CategoryOption {
  readonly id: string;
  readonly key: string;
  readonly name: string;
}

export type SerialRow = ExpenseRow & { readonly serial: number };
export type StatusFilter = 'all' | 'recorded' | 'pending_approval' | 'approved';
export type CategoryFilter = 'all' | string;
export type GroupFilter = 'all' | 'none' | string;

export interface RecordForm {
  scopeId: string;
  categoryId: string;
  payee: string;
  amount: string;
  description: string;
  incurredAt: string;
}
