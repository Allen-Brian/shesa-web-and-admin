/**
 * Finance domain enums.
 *
 * TypeScript mirrors of the finance schema's Postgres enums. Every enum
 * value here MUST match the DB exactly — lowercase, no underscores
 * substituted, no aliases. The DB is the source of truth (spec Part XVI);
 * a value mismatch means a query that returns zero rows with no error.
 *
 * Full spec: docs/product/finance.md.
 */

// ─── Charge shape ──────────────────────────────────────────────────────
// One primitive, six shapes. The shape column selects behavior in the
// edge functions:
//   charge     — recurring dues / levy; creates per-member obligations
//   goal       — bounded window, group target (raised vs. goal)
//   open       — bounded window, freewill, no target
//   ticketed   — fixed unit price, quantity + optional capacity cap
//   fixed      — one-off per-member (behaves like a one-off charge)
//   donation   — freewill gift, no obligation
export const CHARGE_SHAPES = ['charge', 'goal', 'open', 'ticketed', 'fixed', 'donation'] as const;
export type ChargeShape = (typeof CHARGE_SHAPES)[number];

/** Shapes that create per-member obligations. Contributions + donations don't. */
export const OBLIGATION_CREATING_SHAPES: readonly ChargeShape[] = ['charge', 'fixed'] as const;

export function createsObligations(shape: ChargeShape): boolean {
  return OBLIGATION_CREATING_SHAPES.includes(shape);
}

// ─── Recurrence ────────────────────────────────────────────────────────

export const CHARGE_RECURRENCES = [
  'one_time',
  'monthly',
  'quarterly',
  'biannual',
  'yearly',
] as const;
export type ChargeRecurrence = (typeof CHARGE_RECURRENCES)[number];

// ─── Lifecycle ─────────────────────────────────────────────────────────

export const CHARGE_STATUSES = ['draft', 'active', 'paused', 'archived'] as const;
export type ChargeStatus = (typeof CHARGE_STATUSES)[number];

export const CONTRIBUTION_LIFECYCLES = ['draft', 'open', 'closed', 'archived'] as const;
export type ContributionLifecycle = (typeof CONTRIBUTION_LIFECYCLES)[number];

// The "extended" state from spec Part IV isn't a discrete enum value —
// it's `open` after close_date has been moved forward once. An extension
// row on `finance.contribution_extensions` records the audit trail.
export function isExtended(
  lifecycle: ContributionLifecycle,
  closeDate: Date | null,
  extensionCount: number,
  now: Date = new Date(),
): boolean {
  return lifecycle === 'open' && !!closeDate && closeDate <= now && extensionCount > 0;
}

// ─── Obligation ────────────────────────────────────────────────────────

export const PARTY_TYPES = ['member', 'branch'] as const;
export type PartyType = (typeof PARTY_TYPES)[number];

export const OBLIGATION_STATUSES = ['open', 'partial', 'paid', 'cancelled', 'forgiven'] as const;
export type ObligationStatus = (typeof OBLIGATION_STATUSES)[number];

/** Statuses that mean money is still due. */
export const OBLIGATION_OUTSTANDING_STATUSES: readonly ObligationStatus[] = [
  'open',
  'partial',
] as const;

// ─── Payment ───────────────────────────────────────────────────────────

export const PAYMENT_METHODS = [
  'mtn_momo',
  'orange_money',
  'cash',
  'bank_transfer',
  'card',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_SOURCES = ['auto', 'manual'] as const;
export type PaymentSource = (typeof PAYMENT_SOURCES)[number];

// ─── Exception ─────────────────────────────────────────────────────────

export const EXCEPTION_FORMS = ['relative', 'fixed', 'senior', 'individual'] as const;
export type ExceptionForm = (typeof EXCEPTION_FORMS)[number];

/**
 * Priority bands per spec judgment call #9 — highest wins, no stacking:
 *
 *   1000+  individual overrides (individual form)
 *    500+  attribute / relative rules (relative + senior forms)
 *    100+  group / batch rules (fixed form targeting group)
 *      0   base charge amount (implicit fallback)
 *
 * The resolver walks by priority DESC and takes the first match, never
 * the union. Storing the priority on the exception row lets a member
 * statement always explain the number.
 */
export const EXCEPTION_PRIORITY_BANDS = {
  individual: 1000,
  attribute: 500,
  group: 100,
  base: 0,
} as const;

// ─── Expense ───────────────────────────────────────────────────────────

export const EXPENSE_STATUSES = ['recorded', 'pending_approval', 'approved'] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

// ─── Ledger ────────────────────────────────────────────────────────────

export const LEDGER_DIRECTIONS = ['income', 'expense'] as const;
export type LedgerDirection = (typeof LEDGER_DIRECTIONS)[number];

// ─── Which scope types can hold a treasury ─────────────────────────────
// Locked spec decision #1: only mainstream, branch, autonomous chapter
// are finance-bearing. Batches / houses / networks are target filters,
// never debtor bodies. This constant is the TypeScript mirror of the
// same constraint the DB enforces via CHECK on treasury_balances (M6).

export const FINANCE_BEARING_SCOPE_TYPES = ['mainstream', 'branch', 'chapter'] as const;
export type FinanceBearingScopeType = (typeof FINANCE_BEARING_SCOPE_TYPES)[number];

/**
 * A branch or mainstream is always finance-bearing. An autonomous
 * chapter is finance-bearing; a grouping chapter is NOT. Callers must
 * pass chapter_kind for chapters — otherwise this errs on the safe
 * side and returns false.
 */
export function isFinanceBearing(
  scopeType: string,
  chapterKind: 'autonomous' | 'grouping' | null | undefined,
): boolean {
  if (scopeType === 'mainstream' || scopeType === 'branch') return true;
  if (scopeType === 'chapter') return chapterKind === 'autonomous';
  return false;
}
