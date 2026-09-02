/**
 * Shared submission path for the three AGM 2026 public forms
 * (ticket / attire / funding).
 *
 * There is no payment provider connected right now — Fapshi was removed
 * and Tranzak is not yet integrated — so a submission does exactly one
 * thing: it records who registered and what they chose, in
 * `cms.agm_registrations`.
 *
 * It deliberately writes NOTHING to the finance schema. No payment, no
 * ledger entry, no obligation, no receipt. The four anon-executable
 * finance RPCs this replaced (`record_public_ticket_purchase`,
 * `record_public_donation`, and the two Fapshi `initiate_public_*`
 * functions) let an unauthenticated caller mint a settled payment and a
 * verifiable receipt for money nobody had collected; they are gone.
 *
 * Finance reconciles this table by hand until Tranzak lands, at which
 * point submissions move back onto `finance.payment_intents` and the
 * existing authorized `payments/confirm` edge function.
 */

import { getServerClient } from './supabase-server';

/** The three shapes a public AGM submission can take. */
export type AgmRegistrationKind = 'ticket' | 'attire' | 'donation';

export interface AgmRegistrationInput {
  readonly kind: AgmRegistrationKind;
  readonly fullName: string;
  readonly email: string;
  /** Mandatory — the only reliable way to reach a registrant to settle payment. */
  readonly phone: string;
  readonly amountXaf: number;
  readonly paymentMethod: string;
  readonly quantity?: number | null;
  readonly attireSize?: string | null;
  readonly note?: string | null;
}

export type AgmRegistrationResult =
  | { readonly ok: true; readonly redirectTo: string }
  | { readonly ok: false; readonly message: string };

/** Shared field checks. The RPC re-validates — this exists for the message quality. */
export function validateAgmRegistration(
  input: Pick<AgmRegistrationInput, 'fullName' | 'phone'>,
): string | null {
  if (input.fullName.trim().length < 2) {
    return 'Please enter your full name.';
  }
  // 9 digits is the length of a Cameroonian mobile number; an
  // international `+237…` form is longer, so this floor accepts both.
  if (input.phone.trim().length < 9) {
    return 'Please enter a phone number we can reach you on.';
  }
  return null;
}

/**
 * Record a submission and return the path to its confirmation page.
 *
 * The reference the RPC generates (`AGM-XXXXXXXXXX`) is the visitor's
 * handle on their own submission and the confirmation page's URL segment.
 */
export async function submitAgmRegistration(
  input: AgmRegistrationInput,
): Promise<AgmRegistrationResult> {
  const invalid = validateAgmRegistration(input);
  if (invalid) return { ok: false, message: invalid };

  const supabase = await getServerClient();

  const { data, error } = await supabase.schema('cms' as never).rpc(
    'submit_agm_registration' as never,
    {
      p_kind: input.kind,
      p_full_name: input.fullName.trim(),
      p_phone: input.phone.trim(),
      p_amount_xaf: input.amountXaf,
      p_payment_method: input.paymentMethod,
      p_email: input.email.trim() || null,
      p_quantity: input.quantity ?? null,
      p_attire_size: input.attireSize ?? null,
      p_note: input.note ?? null,
    } as never,
  );

  if (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        component: 'web.agm.submitRegistration',
        message: 'submit_agm_registration failed',
        kind: input.kind,
        code: error.code,
        error: error.message,
      }),
    );
    return {
      ok: false,
      message: "We couldn't record your registration. Please try again in a moment.",
    };
  }

  const rows = data as Array<{ reference: string }> | null;
  const reference = Array.isArray(rows) && rows.length > 0 ? rows[0]?.reference : null;
  if (!reference) {
    return { ok: false, message: 'Your registration was not recorded. Please try again.' };
  }

  return { ok: true, redirectTo: `/agm-2026/confirmation/${reference}` };
}
