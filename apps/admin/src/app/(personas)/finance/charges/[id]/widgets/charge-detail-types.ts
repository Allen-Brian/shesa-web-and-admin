/**
 * Shared types for the charge-detail drill-down. Kept in a plain file
 * so both the client widgets and the server-side loader (used by two
 * personas' /charges/[id] pages) can `import type` from a single
 * source without pulling in the widget bundle.
 */

export interface ChargeSummary {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  /** The creating body's scope id — used for permission checks on the detail page. */
  readonly scopeId: string;
  readonly scopeName: string;
  readonly scopeSlug: string;
  readonly shape: string;
  readonly baseAmount: number | null;
  readonly currency: string;
  readonly recurrence: string;
  readonly recurrenceInterval: number;
  readonly status: string;
  readonly lifecycle: string | null;
  readonly activationDate: string | null;
  readonly createdAt: string;
  /** Goal target for `shape='goal'` — powers the goal-thermometer hero. */
  readonly goalAmount: number | null;
  /** Contribution window (goal / open / ticketed shapes). */
  readonly openDate: string | null;
  readonly closeDate: string | null;
}

export interface MatrixCell {
  readonly obligationId: string;
  readonly owed: number;
  readonly paid: number;
  readonly currency: string;
  readonly status: string;
  readonly prorated: boolean;
  /**
   * When the obligation's period ends. Used by the view to distinguish
   * "current" (period still open, not yet due) from "overdue" (period
   * has closed, still unpaid).
   */
  readonly periodEnd: string | null;
}

export interface MatrixMember {
  readonly memberId: string;
  readonly fullName: string;
  /**
   * Contact details and batch, for members. Null on scope-body rows,
   * which are a collective rather than a person. Carried so the
   * exported collection sheet can be chased from directly — "who is
   * behind, and how do I reach them" is one question.
   */
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly batchName?: string | null;
  readonly memberCode?: string | null;
  readonly cells: readonly (MatrixCell | null)[];
  /**
   * The earliest active/passive membership joined_at at this charge's
   * scope. When set, periods that end before this date render as
   * "Not applicable" — the member wasn't yet enrolled.
   */
  readonly joinedAt?: string | null;
  /**
   * `true` for scope-as-a-body rows (branch / chapter / batch owes as a
   * collective). Renders with a building icon instead of member initials
   * and a "scope" subtitle. Underlying obligation has party_type='branch'.
   */
  readonly isScopeBody?: boolean;
  readonly scopeType?: string | null;
}

export interface MatrixPeriod {
  readonly key: string;
  readonly periodStart: string | null;
  readonly periodEnd: string | null;
  readonly isUpcoming: boolean;
}

export interface PoolPayment {
  readonly id: string;
  readonly payerLabel: string;
  readonly amount: number;
  readonly currency: string;
  readonly method: string;
  readonly source: string;
  readonly isReversal: boolean;
  readonly createdAt: string;
  /**
   * Set for obligation-linked payments (matrix mode). `undefined` for
   * pure pool payments that hit the charge directly. Used by the
   * scope-body Collection timeline to group payments per period.
   */
  readonly obligationId?: string | null;
  /**
   * Receipt verification token minted by the M5 trigger. Present on
   * every payment; pool payments surface it in the collection table
   * so operators can jump straight to the receipt view.
   */
  readonly receiptToken?: string | null;
  readonly receiptNumber?: string | null;
  /** True when a finance.reconciliations row references this payment. */
  readonly reconciled?: boolean;
  /** True when another payment carries `reverses_payment_id = this.id`. */
  readonly isReversedOriginal?: boolean;
  // Extended detail — surfaced in the payment sheet, not the table.
  readonly payerEmail?: string | null;
  readonly payerPhone?: string | null;
  readonly payerLocation?: string | null;
  /** Members only — resolved from `core.members` so exports can reach them. */
  readonly payerBatch?: string | null;
  readonly payerMemberCode?: string | null;
  readonly isAnonymous?: boolean;
  readonly memo?: string | null;
  readonly externalRef?: string | null;
  readonly reconciledAt?: string | null;
  readonly reconciliationMatchedRef?: string | null;
  readonly reconciliationNotes?: string | null;
  /** Units bought — ticketed/attire purchases carry this in metadata. */
  readonly quantity?: number | null;
  /**
   * The size the buyer picked, on attire orders. Null everywhere else.
   *
   * Written into `payments.metadata.attire_size` by the settlement
   * path. Orders placed before that field existed are resolved from
   * `cms.agm_registrations` at load time, joined on the
   * `agm_reference` both records carry.
   */
  readonly attireSize?: string | null;
}

export interface PaymentMethodStat {
  readonly method: string;
  readonly count: number;
  readonly amount: number;
}

export interface PaymentSourceStat {
  readonly source: string; // 'auto' | 'manual' | other
  readonly count: number;
  readonly amount: number;
}

export interface PaymentTimingStats {
  readonly count: number;
  readonly avgAmount: number;
  readonly medianAmount: number;
  readonly lastPaymentAt: string | null;
}

export interface SeriesPoint {
  readonly date: string; // yyyy-MM-dd
  readonly cumulative: number;
  readonly daily: number;
}

export type MatrixRow = MatrixMember & {
  readonly serial: number;
  readonly _totalPaid?: number;
  readonly _totalOwed?: number;
  readonly _outstanding?: number;
  readonly _coverage?: number;
};

export type PoolRow = PoolPayment & { readonly serial: number };

export type MemberFilter = 'all' | 'fully_paid' | 'partial' | 'behind' | 'unpaid';

export interface MatrixFilterCounts {
  readonly all: number;
  readonly behind: number;
  readonly fullyPaid: number;
  readonly partial: number;
  readonly unpaid: number;
}

/**
 * Per-target amount plan for Group charges (target_party_type='branch').
 * Read from finance.charge_targets and rendered as a plan-reference
 * card above the matrix so a draft (no obligations yet) still shows
 * what the operator has configured.
 */
export interface ChargeTargetPlanRow {
  readonly targetScopeId: string;
  readonly targetName: string;
  readonly scopeType: string;
  readonly amount: number;
  readonly currency: string;
}

/**
 * Which mutating actions the current viewer may take from the cell
 * side sheet. Only the Finance persona's detail page sets these; the
 * Exco read-only mirror and the group lens leave it undefined, so the
 * sheet renders view-only (details, no record/waive buttons).
 */
export interface ChargeDetailActions {
  readonly canRecordPayment: boolean;
  readonly canForgive: boolean;
}

export type RuleForm = 'fixed' | 'relative' | 'senior' | 'individual';

/** One member rule (exception) on an individual charge, display-ready. */
export interface RuleRow {
  readonly id: string;
  readonly form: RuleForm;
  readonly replacementAmount: number;
  /** Human-readable summary built server-side (names already resolved). */
  readonly description: string;
}

/** A pickable target for the rule form — a batch scope or a member. */
export interface RuleOption {
  readonly id: string;
  readonly name: string;
}

/**
 * Rules (exceptions) management data for an individual charge. Only the
 * Finance persona's detail page populates it, and only when the viewer
 * holds exception.create; otherwise the panel is hidden.
 */
export interface ChargeRulesData {
  readonly canManage: boolean;
  readonly canManageIndividual: boolean;
  readonly currency: string;
  readonly rules: readonly RuleRow[];
  readonly batchOptions: readonly RuleOption[];
  readonly memberOptions: readonly RuleOption[];
}

export interface CommonChargeDetailProps {
  readonly summary: ChargeSummary;
  /** Where the "Back to charges" link points. Different per persona. */
  readonly backLinkHref: string;
  /** Mutating-action gate for the cell sheet; undefined ⇒ read-only. */
  readonly actions?: ChargeDetailActions;
  /** Member-rule management data; only set for the Finance individual view. */
  readonly rules?: ChargeRulesData;
  /**
   * Only populated for Group charges. Empty/undefined on Individual
   * charges; the target-plan card is hidden in that case.
   */
  readonly chargeTargets?: readonly ChargeTargetPlanRow[];
  readonly paymentsByMethod: readonly PaymentMethodStat[];
  readonly paymentsBySource: readonly PaymentSourceStat[];
  readonly paymentTiming: PaymentTimingStats;
  readonly cumulativeSeries: readonly SeriesPoint[];
}

export interface ChargeDetailMatrixProps extends CommonChargeDetailProps {
  readonly mode: 'matrix';
  /**
   * `members` — obligations fan out to individual members (a branch's
   * monthly dues, a subset-of-batch levy). Reports lean on per-member
   * analysis: coverage distribution, top payers, most behind.
   *
   * `scope-body` — the whole obligation is owed by a scope (a chapter
   * or batch as a collective). There's no per-member split, so those
   * distribution panels don't add value. Reports switch to a payment
   * log + finance panel that emphasises what the scope has remitted.
   */
  readonly variant: 'members' | 'scope-body';
  readonly expected: number;
  readonly collected: number;
  readonly periods: readonly MatrixPeriod[];
  readonly members: readonly MatrixMember[];
  /** Flat log of every payment against this charge (settled + reversals). */
  readonly paymentLog: readonly PoolPayment[];
}

export interface ChargeDetailPoolProps extends CommonChargeDetailProps {
  readonly mode: 'pool';
  readonly collected: number;
  readonly payerCount: number;
  readonly poolPayments: readonly PoolPayment[];
}

export type ChargeDetailProps = ChargeDetailMatrixProps | ChargeDetailPoolProps;

export interface PeriodStatsRow {
  readonly key: string;
  readonly period: string;
  readonly Paid: number;
  readonly Outstanding: number;
  readonly coverage: number;
  readonly paidMembers: number;
  readonly totalMembers: number;
}

export interface RankPanelRow {
  readonly id: string;
  readonly label: string;
  readonly value: string;
}
