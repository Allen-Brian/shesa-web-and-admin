/**
 * Shared row + form shapes for the finance charges view. Kept in a
 * plain file so the server-side page loader and every widget sibling
 * can import from one source.
 *
 * `targetPartyType` is the Individual-vs-Group axis:
 *   - 'member' → per-member obligations (default; every existing charge)
 *   - 'branch' → one obligation per target scope with a per-target amount
 *     driven by `finance.charge_targets`
 */

export type TargetPartyType = 'member' | 'branch';

export interface ChargeRow {
  readonly id: string;
  readonly scopeId: string;
  readonly scopeName: string;
  readonly scopeSlug: string;
  readonly name: string;
  readonly description: string | null;
  readonly shape: string;
  readonly baseAmount: number | null;
  readonly currency: string;
  readonly recurrence: string;
  readonly recurrenceInterval: number;
  readonly status: string;
  readonly activationDate: string | null;
  readonly createdAt: string;
  readonly targetPartyType: TargetPartyType;
  readonly targetCount: number;
  /**
   * Per-target amounts for Group charges — empty on Individual rows.
   * Kept on ChargeRow so the edit dialog can populate its Targets
   * step without a second round-trip.
   */
  readonly chargeTargets: readonly ChargeTargetDraft[];
  /** Sum of open obligation amounts on this charge. */
  readonly expected: number;
  /** Sum of settled payments (minus reversals). */
  readonly collected: number;
}

export interface ScopeOption {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly currency: string;
  readonly scopeType: string;
}

export type TargetScopeType = 'branch' | 'chapter' | 'batch';

/**
 * Target scope options for Group charges — branches + chapters +
 * batches the caller can see, each owing as a body. Currency stays
 * inherited from the mainstream owner scope (a Group charge is created
 * once and its per-target amounts are all in the owner-scope currency).
 */
export interface TargetScopeOption {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly scopeType: TargetScopeType;
  readonly parentName: string | null;
}

export type SerialRow = ChargeRow & { readonly serial: number };

export const RECURRENCES = [
  { value: 'one_time', label: 'One-time' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'biannual', label: 'Bi-annual' },
  { value: 'yearly', label: 'Yearly' },
] as const;

export type Recurrence = (typeof RECURRENCES)[number]['value'];

export interface ChargeTargetDraft {
  readonly targetScopeId: string;
  readonly amount: string;
}

export interface CreateForm {
  targetPartyType: TargetPartyType;
  scopeId: string;
  name: string;
  description: string;
  baseAmount: string;
  recurrence: Recurrence;
  activationDate: string;
  chargeTargets: readonly ChargeTargetDraft[];
  /**
   * Per-scope-type default amount for Group charges. Each target step
   * (Branches / Chapters / Batches) sets its own default that pre-fills
   * newly-selected rows of that type; a blank type-default falls back to
   * the overall `baseAmount` from Basics. Ignored for Individual charges.
   */
  targetDefaults: Record<TargetScopeType, string>;
}

export interface EditForm {
  id: string;
  name: string;
  description: string;
  activationDate: string;
  status: 'draft' | 'active' | 'paused';
  /** Frozen once the charge activates — shown but only editable on drafts. */
  baseAmount: string;
  recurrence: Recurrence;
  /**
   * Type is displayed but never editable — flipping the shape mid-life
   * would break every obligation already generated.
   */
  targetPartyType: TargetPartyType;
  /**
   * Currency inherited from the owner scope, shown alongside the amount
   * for confirmation. Not editable.
   */
  currency: string;
  /**
   * Group-charge targets. Empty for Individual charges. Fully editable
   * only when status is 'draft'; the edge fn rejects target edits on
   * any activated charge.
   */
  chargeTargets: readonly ChargeTargetDraft[];
}
