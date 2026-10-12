/**
 * Registration state derivation — client-side mirror of the SQL
 * function `core.registration_state()`.
 *
 * State model (Phase 2 §3, revised 2026-07-03):
 *   not_required    → fee_required = false
 *   paid            → marked_paid_at IS NOT NULL
 *   waived          → waived_at IS NOT NULL
 *   paid_on_behalf  → paid_on_behalf_at IS NOT NULL
 *   pending         → fee_required, none of the terminal timestamps set
 *
 * The 5-state model replaces the earlier 4-state (`unpaid`) model. The
 * DB CHECK on `core.registration_status` guarantees at most one terminal
 * timestamp is set on any row (see 20260704100100_extend_registration_status.sql),
 * so the CASE ordering below is deterministic — the first match wins,
 * and only one match is ever possible.
 *
 * Kept in sync with `core.registration_state(row)` — a client-side
 * filter and the SQL indexes derive the same value.
 */

export const REGISTRATION_STATES = [
  'not_required',
  'pending',
  'paid',
  'paid_on_behalf',
  'waived',
] as const;
export type RegistrationState = (typeof REGISTRATION_STATES)[number];

export interface RegistrationStatusRow {
  fee_required: boolean;
  marked_paid_at: string | null;
  waived_at: string | null;
  paid_on_behalf_at: string | null;
}

export function resolveRegistrationState(row: RegistrationStatusRow): RegistrationState {
  if (!row.fee_required) return 'not_required';
  if (row.marked_paid_at) return 'paid';
  if (row.waived_at) return 'waived';
  if (row.paid_on_behalf_at) return 'paid_on_behalf';
  return 'pending';
}

/**
 * UI display label for a registration state. Presentation-only —
 * storage always uses the enum value directly.
 */
const REGISTRATION_LABELS: Record<RegistrationState, string> = {
  not_required: 'Not required',
  pending: 'Pending',
  paid: 'Paid',
  paid_on_behalf: 'Paid on behalf',
  waived: 'Waived',
};

export function formatRegistrationState(state: RegistrationState): string {
  return REGISTRATION_LABELS[state];
}
