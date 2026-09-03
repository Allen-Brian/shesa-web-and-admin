/**
 * Contributions to anything — a project, a public event, the AGM.
 *
 * ─── Why the button appears and disappears on its own ──────────────────
 * There is no "accepting contributions" flag anywhere. A project or event
 * either points at a `finance.charge` or it does not, and that charge is
 * either open right now or it is not. The button is rendered from those
 * two facts, so closing the charge closes the form, and there is no second
 * switch that can disagree with where the money actually goes.
 *
 * `finance.public_contribution` is what the public site is allowed to know
 * about a charge: its name, its price, its currency, and whether it is
 * open. `anon` has no read on `finance.charges` and should not — that
 * table holds internal dues alongside public campaigns.
 */

import { createHash } from 'node:crypto';
import { headers } from 'next/headers';

import { clientEnv } from '@shesa/config/env.client';
import { serverEnv } from '@shesa/config/env.server';
import { createServiceRoleClient } from '@shesa/supabase/service-role';

import { getServerClient } from './supabase-server';

export interface PublicContribution {
  readonly chargeId: string;
  readonly name: string;
  /** `ticketed` charges are priced per unit; `donation` charges are open. */
  readonly shape: string;
  readonly baseAmount: number | null;
  readonly currency: string;
  readonly closeDate: string | null;
  readonly isOpen: boolean;
}

/**
 * What a public page may show for a charge, or null when there is nothing
 * to show — no charge linked, or one that is closed.
 *
 * Returns null rather than a closed contribution on purpose: a page has no
 * use for a form it must then disable, and "no button" is the correct
 * rendering of "not accepting contributions".
 */
export async function loadPublicContribution(
  chargeId: string | null | undefined,
): Promise<PublicContribution | null> {
  if (!chargeId) return null;

  const supabase = await getServerClient();
  const { data, error } = await supabase
    .schema('finance')
    .rpc('public_contribution', { p_charge_id: chargeId });

  if (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        component: 'web.contribution.load',
        message: 'public_contribution failed',
        chargeId,
        error: error.message,
      }),
    );
    return null;
  }

  const rows = (data ?? []) as Array<{
    charge_id: string;
    name: string;
    shape: string;
    base_amount: number | null;
    currency: string;
    close_date: string | null;
    is_open: boolean;
  }>;
  const row = rows[0];
  if (!row || !row.is_open) return null;

  return {
    chargeId: row.charge_id,
    name: row.name,
    shape: row.shape,
    baseAmount: row.base_amount == null ? null : Number(row.base_amount),
    currency: row.currency,
    closeDate: row.close_date,
    isOpen: row.is_open,
  };
}

/* ══════════════════════════════════════════════════════════════════════
 * Submitting one
 * ══════════════════════════════════════════════════════════════════════ */

const THROTTLE_LIMIT = 5;
const THROTTLE_WINDOW_SECONDS = 3600;

/**
 * Bucket key for the rate limit — the visitor's address, hashed.
 *
 * The database never sees the visitor: submissions arrive through a Server
 * Action, so the Postgres session address is this server's. Hashing before
 * it leaves here keeps the counter table from becoming a log of who
 * browsed the site from where, salted with the apex domain so the digests
 * are not a plain lookup of the IPv4 space.
 */
async function throttleKey(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || h.get('cf-connecting-ip') || h.get('x-real-ip');
  if (!ip) return null;
  return createHash('sha256')
    .update(`contribute:${clientEnv.NEXT_PUBLIC_APP_BASE_DOMAIN}:${ip}`)
    .digest('hex');
}

/** The member behind the payer, when the apex-scoped session identifies one. */
async function signedInMemberId(): Promise<string | null> {
  try {
    const supabase = await getServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await createServiceRoleClient()
      .schema('core')
      .from('member_accounts')
      .select('member_id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    return (data as { member_id: string } | null)?.member_id ?? null;
  } catch {
    return null;
  }
}

export interface ContributionInput {
  readonly chargeId: string;
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  /** Ticketed charges only. */
  readonly quantity?: number;
  /** Donation charges only — the payer names the figure. */
  readonly amountXaf?: number;
  readonly note?: string;
  /** Shown to the payer on the gateway's page. */
  readonly description: string;
}

export type ContributionResult =
  | { readonly ok: true; readonly checkoutUrl: string; readonly intentId: string }
  | { readonly ok: false; readonly message: string };

/**
 * Rate-limit, then open a hosted checkout.
 *
 * The price is not sent for ticketed charges — `payments/initiate-public`
 * reads `base_amount` off the charge and multiplies by the quantity. What
 * travels from here is what the payer is buying, not what it costs.
 */
export async function submitContribution(input: ContributionInput): Promise<ContributionResult> {
  if (input.fullName.trim().length < 2) {
    return { ok: false, message: 'Please enter your full name.' };
  }
  if (input.phone.trim().length < 9) {
    return { ok: false, message: 'Please enter a phone number we can reach you on.' };
  }

  const supabase = await getServerClient();
  const key = await throttleKey();
  const { data: allowed, error: throttleErr } = await supabase
    .schema('cms')
    .rpc('consume_submission_slot', {
      p_bucket_key: key ?? '',
      p_limit: THROTTLE_LIMIT,
      p_window_seconds: THROTTLE_WINDOW_SECONDS,
    });

  if (throttleErr) {
    // Fail closed. A rate limiter that opens up when it breaks is not one.
    console.error(
      JSON.stringify({
        level: 'error',
        component: 'web.contribution.submit',
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
        "You've submitted several times already. Please wait a little while, or contact the secretariat.",
    };
  }

  try {
    const res = await fetch(
      `${serverEnv.SUPABASE_URL.replace(/\/+$/, '')}/functions/v1/payments/initiate-public`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          apikey: serverEnv.SUPABASE_SERVICE_ROLE_KEY,
          authorization: `Bearer ${serverEnv.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          chargeId: input.chargeId,
          payerMemberId: await signedInMemberId(),
          quantity: input.quantity,
          amountXaf: input.amountXaf,
          fullName: input.fullName.trim(),
          email: input.email.trim() || undefined,
          phone: input.phone.trim(),
          paymentMethod: 'pay-now',
          note: input.note?.trim() || undefined,
          description: input.description,
          returnPath: '/receipt/{intentId}',
        }),
      },
    );

    const body = (await res.json().catch(() => null)) as {
      checkoutUrl?: string;
      intentId?: string;
      message?: string;
    } | null;

    if (!res.ok || !body?.checkoutUrl || !body.intentId) {
      console.error(
        JSON.stringify({
          level: 'error',
          component: 'web.contribution.submit',
          message: 'initiate-public did not return a checkout url',
          status: res.status,
          detail: body?.message ?? null,
        }),
      );
      return {
        ok: false,
        message: 'We could not open the payment page. Please try again shortly.',
      };
    }

    return { ok: true, checkoutUrl: body.checkoutUrl, intentId: body.intentId };
  } catch (err) {
    console.error(
      JSON.stringify({
        level: 'error',
        component: 'web.contribution.submit',
        message: 'initiate-public call threw',
        error: String(err),
      }),
    );
    return { ok: false, message: 'The payment service is unreachable. Please try again shortly.' };
  }
}
