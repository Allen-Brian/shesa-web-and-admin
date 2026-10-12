/**
 * Shared submission path for the three AGM 2026 public forms
 * (ticket / attire / funding).
 *
 * A submission always records who registered and what they chose, in
 * `cms.agm_registrations`, and that record is never conditional on the
 * payment: someone who abandons checkout has still told the secretariat
 * they intend to come.
 *
 * Handing off to the gateway is a separate step the caller takes after
 * this one — see `./agm-checkout`. "Pay on arrival" skips it entirely.
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

import { createHash } from 'node:crypto';
import { headers } from 'next/headers';

import { clientEnv } from '@shesa/config/env.client';

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
  | {
      readonly ok: true;
      readonly redirectTo: string;
      /** `AGM-XXXXXXXXXX` — the visitor's handle, and the join key to a payment. */
      readonly reference: string;
    }
  | { readonly ok: false; readonly message: string };

/** Submissions allowed per client, per window. */
const THROTTLE_LIMIT = 5;
const THROTTLE_WINDOW_SECONDS = 3600;

/**
 * Build the throttle bucket key for this request.
 *
 * The database never sees the visitor — submissions arrive through a
 * Server Action, so the Postgres session IP is this server's. The real
 * client address is only available here, in the request headers.
 *
 * It is hashed before it leaves this function so the counter table never
 * becomes a log of who browsed the site from where. Salted with the
 * apex domain so the digests aren't a plain rainbow-table lookup of the
 * IPv4 space.
 */
async function throttleKey(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || h.get('cf-connecting-ip') || h.get('x-real-ip');
  if (!ip) return null;
  return createHash('sha256')
    .update(`agm:${clientEnv.NEXT_PUBLIC_APP_BASE_DOMAIN}:${ip}`)
    .digest('hex');
}

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

  // Rate limit before writing anything. The forms are linked from the
  // homepage and take anonymous writes, so without this they are
  // trivially floodable.
  const key = await throttleKey();
  const { data: allowed, error: throttleErr } = await supabase
    .schema('cms')
    .rpc('consume_submission_slot', {
      // An empty key is the "could not attribute this request" signal —
      // consume_submission_slot fails closed on it, same as on NULL.
      p_bucket_key: key ?? '',
      p_limit: THROTTLE_LIMIT,
      p_window_seconds: THROTTLE_WINDOW_SECONDS,
    });

  if (throttleErr) {
    // Fail closed. A rate limiter that opens up when it breaks is not a
    // rate limiter.
    console.error(
      JSON.stringify({
        level: 'error',
        component: 'web.agm.submitRegistration',
        message: 'consume_submission_slot failed',
        error: throttleErr.message,
      }),
    );
    return { ok: false, message: 'We could not process that right now. Please try again shortly.' };
  }

  if (allowed !== true) {
    return {
      ok: false,
      message:
        "You've submitted several registrations already. Please wait a little while, or contact the secretariat if you need to register a group.",
    };
  }

  const { data, error } = await supabase.schema('cms').rpc('submit_agm_registration', {
    p_kind: input.kind,
    p_full_name: input.fullName.trim(),
    p_phone: input.phone.trim(),
    p_amount_xaf: input.amountXaf,
    p_payment_method: input.paymentMethod,
    // These four are DEFAULT NULL in SQL, so the generated types make
    // them optional rather than nullable — omit rather than pass null.
    p_email: input.email.trim() || undefined,
    p_quantity: input.quantity ?? undefined,
    p_attire_size: input.attireSize ?? undefined,
    p_note: input.note ?? undefined,
  });

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

  return { ok: true, redirectTo: `/agm-2026/confirmation/${reference}`, reference };
}
