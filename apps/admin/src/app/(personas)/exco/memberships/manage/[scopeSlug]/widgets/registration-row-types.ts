export interface RegistrationRow {
  readonly membership_id: string;
  readonly member_id: string;
  readonly full_name: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly batch_year: number | null;
  readonly batch_name: string | null;
  readonly fee_required: boolean;
  readonly amount: number | null;
  readonly currency_code: string | null;
  readonly registration_state: 'not_required' | 'pending' | 'paid' | 'paid_on_behalf' | 'waived';
  readonly waived_reason: string | null;
  readonly paid_on_behalf_note: string | null;
  readonly joined_at: string | null;
  readonly membership_status: 'active' | 'passive';
}

export type SerialRegistrationRow = RegistrationRow & { readonly serial: number };

export type RegistrationConfirmState =
  | null
  | { readonly kind: 'markPaid'; readonly target: RegistrationRow }
  | { readonly kind: 'waive'; readonly target: RegistrationRow }
  | { readonly kind: 'payOnBehalf'; readonly target: RegistrationRow }
  | { readonly kind: 'escalate'; readonly target: RegistrationRow }
  | { readonly kind: 'bulkMarkPaid'; readonly targets: readonly RegistrationRow[] }
  | { readonly kind: 'bulkEscalate'; readonly targets: readonly RegistrationRow[] };

/**
 * A row is "settled" when no further action is meaningful — the fee
 * has been paid, waived, or wasn't required in the first place. Used to
 * disable per-row actions and to gate the default "action-needed" view.
 */
export function isSettledRegistration(state: RegistrationRow['registration_state']): boolean {
  return (
    state === 'paid' || state === 'paid_on_behalf' || state === 'waived' || state === 'not_required'
  );
}
