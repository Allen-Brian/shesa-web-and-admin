/**
 * Registration state derivation — client-side mirror of the SQL
 * function `core.registration_state(row)`.
 *
 * State model (Phase 2 §3):
 *   not_required  → fee_required = false
 *   waived        → waived_at IS NOT NULL
 *   paid          → marked_paid_at IS NOT NULL
 *   unpaid        → default
 *
 * Consumed by the Exco members list "registration status" filter and
 * the profile page badge. Keeps in sync with the DB function so a
 * client-side filter can rely on the same derived value the server
 * indexes on.
 */

export const REGISTRATION_STATES = ['not_required', 'unpaid', 'paid', 'waived'] as const;
export type RegistrationState = (typeof REGISTRATION_STATES)[number];

export interface RegistrationStatusRow {
  fee_required: boolean;
  marked_paid_at: string | null;
  waived_at: string | null;
}

export function resolveRegistrationState(row: RegistrationStatusRow): RegistrationState {
  if (!row.fee_required) return 'not_required';
  if (row.waived_at) return 'waived';
  if (row.marked_paid_at) return 'paid';
  return 'unpaid';
}
