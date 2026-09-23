/**
 * Action: payments/initiate-public
 *
 * Opens a hosted-checkout payment for one of the public AGM forms:
 * creates the `finance.payment_intents` row, asks Tranzak for a payment
 * request, and returns the URL the payer's browser is sent to.
 *
 * ─── The price is not an input ─────────────────────────────────────────
 * For ticketed charges the amount is read from `finance.charges.base_amount`
 * and multiplied by the quantity here, server-side. The caller says *what*
 * they are buying and *how many*; it never says what it costs.
 *
 * That distinction is the whole of SEC-01. The RPCs this replaces —
 * `record_public_ticket_purchase` and `record_public_donation` — were
 * SECURITY DEFINER, granted to `anon`, and took the amount from the
 * caller straight into `finance.payments`. Anyone with the public anon
 * key could mint a settled payment and a verifiable receipt for money
 * nobody had collected.
 *
 * Donations genuinely are caller-priced — that is what a donation is —
 * so they are bounded instead, and nothing settles until Tranzak says the
 * money arrived.
 *
 * ─── Why this is service_role only ─────────────────────────────────────
 * `apps/web`'s server action is the only caller, and it rate-limits the
 * visitor through `cms.consume_submission_slot` before getting here. Were
 * this reachable with the anon key that shipped in the browser bundle,
 * the throttle would be one `curl` away from irrelevant and anyone could
 * make us open unbounded gateway requests.
 *
 * The check reads the caller's `role` claim rather than comparing its key
 * against an env var — see `_shared/service-role-auth.ts` for why the
 * first version of that broke in production.
 */

import { z } from 'npm:zod@3.24.1';

import { withCors } from '../_shared/cors.ts';
import {
  internalError,
  notFound,
  success,
  unauthorized,
  validationError,
} from '../_shared/errors.ts';
import { buildContext } from '../_shared/request-context.ts';
import { createServiceRoleClient } from '../_shared/supabase-client.ts';
import { createPaymentRequest, TranzakError } from '../_shared/tranzak-client.ts';
import { PAYER_CARRIES_FEE_PERCENT, resolveTranzakConfig } from '../_shared/tranzak-config.ts';
import { isServiceRole } from '../_shared/service-role-auth.ts';
import { parseJson } from '../_shared/validation.ts';

/**
 * What the visitor chose to do, mapped onto an intent method.
 *
 * `pay-now` maps to null — not "unknown" as a value, but genuinely not
 * chosen yet. The payer picks their method on Tranzak's page and
 * settlement records what they actually used. Inventing a provisional
 * value here would show Finance a method that later changes.
 *
 * The four named methods are kept because older links and any integration
 * still posting them should keep working; they are simply a more specific
 * answer to the same question.
 *
 * `cash-on-site` is absent on purpose — the web action never sends it
 * here, and if something did, refusing is the right answer: there is no
 * gateway payment to open.
 */
const FORM_CHOICE_TO_METHOD: Record<string, string | null> = {
  'pay-now': null,
  'mtn-momo': 'mtn_momo',
  'orange-money': 'orange_money',
  card: 'card',
  'bank-transfer': 'bank_transfer',
};

/** A donation of more than this is a conversation, not a web form. */
const MAX_DONATION_XAF = 50_000_000;

const inputSchema = z
  .object({
    chargeId: z.string().uuid(),
    /**
     * Resolved by the caller from a verified session, never sent by a
     * browser. `apps/web` is the only caller and holds the service key.
     */
    payerMemberId: z.string().uuid().nullable().optional(),
    quantity: z.number().int().min(1).max(20).optional(),
    /** Donations only — ignored for ticketed charges, which are priced here. */
    amountXaf: z.number().positive().max(MAX_DONATION_XAF).optional(),
    fullName: z.string().min(2).max(200),
    email: z.string().max(320).optional(),
    phone: z.string().min(9).max(80),
    paymentMethod: z.string().min(1).max(40),
    /** `cms.agm_registrations.reference`, so the two records can be joined. */
    reference: z.string().max(60).optional(),
    /**
     * Attire orders only. Kept on the intent — and from there on the
     * settled payment — so the size is readable as data wherever the
     * order is, not just as words inside the gateway description.
     */
    attireSize: z.string().max(10).optional(),
    /** Free text from the payer — "in memory of…", "from the Douala chapter". */
    note: z.string().max(500).optional(),
    description: z.string().min(1).max(200),
    /** Path the payer returns to; joined onto the configured origin. */
    returnPath: z.string().startsWith('/').max(300),
  })
  .strict();

interface ChargeRow {
  readonly id: string;
  readonly scope_id: string;
  readonly name: string;
  readonly shape: string;
  readonly base_amount: number | null;
  readonly currency: string;
  readonly status: string;
  readonly close_date: string | null;
}

export async function initiatePublicPayment(req: Request): Promise<Response> {
  const ctx = await buildContext(req);

  if (!(await isServiceRole(ctx.jwt))) {
    return withCors(req, unauthorized(ctx.traceId));
  }

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  if (!(input.paymentMethod in FORM_CHOICE_TO_METHOD)) {
    return withCors(
      req,
      validationError('Unsupported payment method', ctx.traceId, {
        paymentMethod: `"${input.paymentMethod}" cannot open a gateway payment.`,
      }),
    );
  }
  const method = FORM_CHOICE_TO_METHOD[input.paymentMethod] ?? null;

  const service = createServiceRoleClient();

  const { data: chargeRow } = await service
    .schema('finance' as never)
    .from('charges' as never)
    .select('id, scope_id, name, shape, base_amount, currency, status, close_date')
    .eq('id', input.chargeId)
    .maybeSingle();

  const charge = chargeRow as ChargeRow | null;
  if (!charge) return withCors(req, notFound('charge', ctx.traceId));

  if (charge.status !== 'active') {
    return withCors(
      req,
      validationError('Charge is not open', ctx.traceId, {
        chargeId: `"${charge.name}" is not currently accepting payments.`,
      }),
    );
  }
  if (charge.close_date && new Date(charge.close_date).getTime() < Date.now()) {
    return withCors(
      req,
      validationError('Charge has closed', ctx.traceId, {
        chargeId: `"${charge.name}" closed on ${charge.close_date}.`,
      }),
    );
  }

  // ── The price ────────────────────────────────────────────────────────
  let amount: number;
  let quantity: number | null = null;

  if (charge.shape === 'ticketed') {
    if (charge.base_amount == null || Number(charge.base_amount) <= 0) {
      console.error(
        JSON.stringify({
          level: 'error',
          traceId: ctx.traceId,
          component: 'payments.initiate-public',
          message: 'ticketed charge has no base_amount',
          chargeId: charge.id,
        }),
      );
      return withCors(req, internalError(ctx.traceId));
    }
    quantity = input.quantity ?? 1;
    amount = Number(charge.base_amount) * quantity;
  } else {
    if (input.amountXaf == null) {
      return withCors(
        req,
        validationError('An amount is required', ctx.traceId, {
          amountXaf: 'Donations must state how much.',
        }),
      );
    }
    amount = input.amountXaf;
  }

  let config;
  try {
    config = resolveTranzakConfig();
  } catch (err) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        component: 'payments.initiate-public',
        message: 'tranzak configuration invalid',
        error: String(err),
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  // ── The intent ───────────────────────────────────────────────────────
  // Written before the gateway call so the id exists to use as
  // `mchTransactionRef`, which is what buys idempotency: a retry cannot
  // open a second payment request for the same intent.
  const { data: intentRow, error: intentErr } = await service
    .schema('finance' as never)
    .from('payment_intents' as never)
    .insert({
      charge_id: charge.id,
      scope_id: charge.scope_id,
      payer_member_id: input.payerMemberId ?? null,
      amount,
      currency: charge.currency,
      method,
      // `initiated`, not `pending`: the gateway has not been called yet.
      // If the call below fails, this row is the only evidence anybody
      // tried to pay, and its status says exactly where it stopped.
      status: 'initiated',
      mode: config.mode,
      quantity,
      payer_name: input.fullName.trim(),
      payer_email: input.email?.trim() || null,
      payer_phone: input.phone.trim(),
      note: input.note?.trim() || null,
      metadata: {
        provider: 'tranzak',
        source: 'public_agm_form',
        form_payment_method: input.paymentMethod,
        agm_reference: input.reference ?? null,
        attire_size: input.attireSize ?? null,
      },
    } as never)
    .select('id')
    .maybeSingle();

  if (intentErr || !intentRow) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        component: 'payments.initiate-public',
        message: 'intent insert failed',
        code: intentErr?.code,
        error: intentErr?.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const intentId = (intentRow as { id: string }).id;

  // ── The gateway ──────────────────────────────────────────────────────
  try {
    const created = await createPaymentRequest(
      {
        amount,
        currencyCode: charge.currency,
        description: input.description,
        mchTransactionRef: intentId,
        // Both point at the same handler, deliberately.
        //
        // On a real sandbox payment Tranzak ignored the per-request
        // `returnUrl` and sent the payer to the `cancelUrl` instead —
        // with `success=true` on the query string. The documentation does
        // not describe the precedence, so rather than guess, every exit
        // lands somewhere that can work it out. Tranzak appends
        // `requestId` to whichever it picks, and that is enough.
        returnUrl: `${config.returnUrlBase}${input.returnPath.replace('{intentId}', intentId)}`,
        cancelUrl: `${config.returnUrlBase}${input.returnPath.replace('{intentId}', intentId)}`,
        callbackUrl: config.callbackUrl,
        // The organisation is owed the full amount; the gateway's cut goes
        // on top rather than coming out of it.
        payerFeePercentage: PAYER_CARRIES_FEE_PERCENT,
      },
      config,
    );

    const checkoutUrl = created.links?.paymentAuthUrl;
    if (!checkoutUrl) {
      throw new Error('gateway returned no paymentAuthUrl');
    }

    // The gateway now holds the request, so the intent moves on and
    // records the reference the return page and webhook both key off.
    await service
      .schema('finance' as never)
      .from('payment_intents' as never)
      .update({
        status: 'pending',
        metadata: {
          provider: 'tranzak',
          provider_ref: created.requestId,
          source: 'public_agm_form',
          form_payment_method: input.paymentMethod,
          agm_reference: input.reference ?? null,
          attire_size: input.attireSize ?? null,
        },
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', intentId);

    return withCors(
      req,
      success({ intentId, checkoutUrl, amount, currency: charge.currency, traceId: ctx.traceId }),
    );
  } catch (err) {
    // The intent exists but has no gateway request. Mark it failed rather
    // than leaving a pending row nothing will ever settle — and record the
    // gateway's own words, so Payment attempts answers "why" instead of
    // sending someone to the logs. "Access to the payments API has been
    // temporarily restricted" is a sentence an operator can act on; "could
    // not open a gateway payment request" is not.
    const gatewayMessage =
      err instanceof TranzakError && err.gatewayMessage ? err.gatewayMessage : null;

    await service
      .schema('finance' as never)
      .from('payment_intents' as never)
      .update({
        status: 'failed',
        failure_reason: (gatewayMessage ?? 'Could not open a gateway payment request.').slice(
          0,
          500,
        ),
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', intentId);

    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        component: 'payments.initiate-public',
        message: 'gateway create failed',
        intentId,
        error: String(err),
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }
}
