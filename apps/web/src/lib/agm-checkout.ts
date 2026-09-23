/**
 * Handing an AGM submission over to the payment gateway.
 *
 * The registration is recorded first, in `cms.agm_registrations`, and is
 * never conditional on the payment: someone who abandons checkout has
 * still told the secretariat they intend to come, and that record is
 * worth having. Only after it exists do we ask for a payment request.
 *
 * ─── What this file deliberately does not know ─────────────────────────
 * The price. It sends the charge id and the quantity; the Edge Function
 * reads `base_amount` off the charge and multiplies. `apps/web` also
 * holds no Tranzak credentials, so it cannot open a gateway request
 * itself and cannot verify a settlement — both live in the Edge runtime.
 *
 * The forms display a price from `agm-content.ts` so a visitor sees a
 * total before submitting; that constant is a *label*, and the charge row
 * is the authority. If the two ever disagree, the payer is charged what
 * the charge says and the label is the bug.
 */

import { serverEnv } from '@shesa/config/env.server';
import { createServiceRoleClient } from '@shesa/supabase/service-role';

import { getServerClient } from './supabase-server';

/** Charges seeded by `supabase/seed.sql`, section 5.2. */
export const AGM_CHARGE_IDS = {
  ticket: '88888888-2026-1111-0000-000000000002',
  attire: '88888888-2026-1111-0000-000000000003',
  bronze: '88888888-2026-1111-0000-000000000010',
  silver: '88888888-2026-1111-0000-000000000011',
  gold: '88888888-2026-1111-0000-000000000012',
  platinum: '88888888-2026-1111-0000-000000000013',
  /** Catch-all campaign for a gift that matches no tier. */
  general: '88888888-2026-1111-0000-000000000001',
} as const;

/**
 * The one option that never reaches the gateway. "Pay on arrival" means
 * exactly that — the secretariat collects at the door, so a checkout
 * would be nonsense.
 */
export const PAY_ON_ARRIVAL = 'cash-on-site';

export interface CheckoutInput {
  readonly chargeId: string;
  readonly quantity?: number;
  /** Donations only. Ticketed charges are priced from the charge row. */
  readonly amountXaf?: number;
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly paymentMethod: string;
  /** The `cms.agm_registrations` reference, so the two records join up. */
  readonly reference: string;
  /**
   * Attire orders only. Rides through to the payment's metadata so the
   * secretariat can read sizes off the payments table rather than
   * cross-referencing every order against the registrations list.
   */
  readonly attireSize?: string;
  /** Shown to the payer on the gateway's page. */
  readonly description: string;
}

/**
 * The member behind the person paying, when there is one.
 *
 * The public site has no sign-in of its own, but the session cookie is
 * scoped to the apex domain, so a member signed in on the admin app is
 * recognised here too. When we can identify them the payment attaches to
 * their member record and counts on their profile; when we cannot — which
 * is most public traffic — it stays a guest payment carrying only the
 * name, email and phone they typed.
 *
 * The lookup runs service-role because `core.member_accounts` is not
 * readable by `anon`, and it is keyed on an id taken from the verified
 * session rather than from anything the caller sent.
 */
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
    // Never block a payment over this. A guest payment is a complete
    // record; an unattributed one is a smaller problem than a failed one.
    return null;
  }
}

export type CheckoutResult =
  | { readonly ok: true; readonly checkoutUrl: string; readonly intentId: string }
  | { readonly ok: false; readonly message: string };

/**
 * Open a hosted checkout for a recorded registration.
 *
 * Calls with the service-role key because `payments/initiate-public`
 * accepts nothing else — the visitor's rate limit is applied in the
 * server action before this, and an endpoint reachable with the public
 * anon key would let anyone step around it.
 */
export async function openAgmCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const url = `${serverEnv.SUPABASE_URL.replace(/\/+$/, '')}/functions/v1/payments/initiate-public`;

  try {
    const res = await fetch(url, {
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
        paymentMethod: input.paymentMethod,
        reference: input.reference,
        attireSize: input.attireSize,
        description: input.description,
        // `{intentId}` is substituted by the Edge Function, which is the
        // only side that knows the id it just created.
        returnPath: '/receipt/{intentId}',
      }),
    });

    const body = (await res.json().catch(() => null)) as {
      checkoutUrl?: string;
      intentId?: string;
      message?: string;
    } | null;

    if (!res.ok || !body?.checkoutUrl || !body.intentId) {
      console.error(
        JSON.stringify({
          level: 'error',
          component: 'web.agm.openCheckout',
          message: 'initiate-public did not return a checkout url',
          status: res.status,
          detail: body?.message ?? null,
        }),
      );
      return {
        ok: false,
        message:
          'Your registration was recorded, but we could not open the payment page. The secretariat will be in touch.',
      };
    }

    return { ok: true, checkoutUrl: body.checkoutUrl, intentId: body.intentId };
  } catch (err) {
    console.error(
      JSON.stringify({
        level: 'error',
        component: 'web.agm.openCheckout',
        message: 'initiate-public call threw',
        error: String(err),
      }),
    );
    return {
      ok: false,
      message:
        'Your registration was recorded, but the payment service is unreachable. The secretariat will be in touch.',
    };
  }
}
