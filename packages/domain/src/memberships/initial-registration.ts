/**
 * `resolveInitialRegistration` — the SINGLE source of the "when a
 * membership is created, what registration state does it join with?"
 * rule.
 *
 * Three creation paths land in `core.memberships`:
 *   1. Direct add (branch admin adds an existing member) — apps/admin
 *      Members tab, Server Action.
 *   2. Approve join request — supabase/functions/memberships/approve-join-request.
 *   3. Batch import — supabase/functions/imports/confirm-import.
 *
 * Each of these MUST call this helper to compute the initial
 * registration_status row alongside the membership insert. Never inline
 * the rule at a call site — if the mapping ever needs refinement (auto-
 * waive under some condition, currency handling for non-XAF branches,
 * etc.) it changes here and every path picks it up.
 *
 * PR review rule: an INSERT into `core.memberships` without a companion
 * `resolveInitialRegistration` + `core.registration_status` INSERT is a
 * mistake.
 *
 * Locked 2026-07-03 per memory/project_phase2_membership_locks.md #3.
 */

import type { RegistrationState } from '../registration/state';

export interface BranchFeeConfig {
  /** From core.branches.registration_fee_required. */
  registrationFeeRequired: boolean;
  /** From core.branches.registration_fee_amount. */
  registrationFeeAmount: number | null;
  /** From core.branches.registration_fee_currency. */
  registrationFeeCurrency: string | null;
}

export interface InitialRegistration {
  /** Snapshot into core.registration_status.fee_required. */
  fee_required: boolean;
  /** Derived initial state — either 'not_required' or 'pending'. */
  registration_state: Extract<RegistrationState, 'not_required' | 'pending'>;
  /** Snapshot into core.registration_status.amount. */
  amount: number | null;
  /** Snapshot into core.registration_status.currency_code. */
  currency_code: string | null;
}

/**
 * Resolve the initial registration state a new membership should join
 * with, given the destination branch's current fee configuration.
 *
 * Rule:
 *   - No fee active → state is `not_required`, amount/currency both NULL.
 *   - Fee active   → state is `pending`, amount + currency snapshotted
 *                     onto the row so a future fee change doesn't rewrite
 *                     the member's obligation (stable historical fact).
 *
 * Batches never have a fee config, so batch imports pass a config with
 * `registrationFeeRequired = false` — same helper, same rule.
 */
export function resolveInitialRegistration(config: BranchFeeConfig): InitialRegistration {
  if (!config.registrationFeeRequired) {
    return {
      fee_required: false,
      registration_state: 'not_required',
      amount: null,
      currency_code: null,
    };
  }
  return {
    fee_required: true,
    registration_state: 'pending',
    amount: config.registrationFeeAmount,
    currency_code: config.registrationFeeCurrency,
  };
}
