/**
 * Action: payments/initiate
 *
 * POST /functions/v1/payments/initiate — creates a persistent
 * finance.payment_intents row and returns the handle that the payment
 * window / confirm loop keys off. Spec Part VII:
 *
 *   The payment window (simulated) — a member receives a prefilled
 *   link/window (method, phone, amount) and pays. In this build the
 *   confirmation is a ~3-second simulation → success, behind a
 *   PaymentProvider interface.
 *
 * The M1 domain SimulatedProvider stores intents in-memory; that
 * doesn't survive across Edge Function invocations. This endpoint uses
 * the M4B finance.payment_intents table for durable state instead. The
 * PaymentProvider seam still exists conceptually — real MoMo/Orange/card
 * providers slot in behind the same table (they own the transitions
 * via webhooks; the simulator uses the available_from timer here).
 *
 * Simulator behavior:
 *   * available_from = created_at + PAYMENT_SIMULATOR_DELAY_MS
 *     (defaults to 3000 per spec; overridable via env for tests).
 *   * confirm() before available_from → returns pending.
 *   * confirm() at or after available_from → success + payment row inserted.
 *
 * Auth: payment.record at the resolved scope. Member-facing self-service
 * initiation lands with the public flow later.
 */

import { z } from 'npm:zod@3.24.1';

import { logEvent } from '../_shared/audit.ts';
import { withCors } from '../_shared/cors.ts';
import {
  conflict,
  forbidden,
  internalError,
  notFound,
  success,
  unauthorized,
  validationError,
} from '../_shared/errors.ts';
import { authorize } from '../_shared/policy.ts';
import { buildContext } from '../_shared/request-context.ts';
import { createServiceRoleClient, createUserClient } from '../_shared/supabase-client.ts';
import { parseJson } from '../_shared/validation.ts';

const PAYMENT_METHODS = ['mtn_momo', 'orange_money', 'cash', 'bank_transfer', 'card'] as const;

const inputSchema = z
  .object({
    obligationId: z.string().uuid().optional(),
    chargeId: z.string().uuid().optional(),
    payerMemberId: z.string().uuid().optional(),
    amount: z.number().positive(),
    currency: z
      .string()
      .length(3)
      .regex(/^[A-Z]{3}$/),
    method: z.enum(PAYMENT_METHODS),
  })
  .strict()
  .refine((v) => !!v.obligationId || !!v.chargeId, {
    message: 'One of obligationId or chargeId must be provided.',
    path: ['obligationId'],
  });

interface ObligationRow {
  readonly id: string;
  readonly charge_id: string;
  readonly scope_id: string;
  readonly currency: string;
  readonly party_type: string;
  readonly party_id: string;
  readonly status: string;
}

interface ChargeRow {
  readonly id: string;
  readonly scope_id: string;
  readonly currency: string;
}

interface SuccessBody {
  readonly intentId: string;
  readonly availableFrom: string;
  readonly prefill: {
    readonly amount: number;
    readonly currency: string;
    readonly method: string;
    readonly displayMessage: string;
  };
  readonly traceId: string;
}

export async function initiatePayment(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const serviceClient = createServiceRoleClient();

  let scopeId: string;
  let currency: string;
  let chargeId: string | null = null;
  let derivedPayer: string | null = input.payerMemberId ?? null;

  if (input.obligationId) {
    const { data: obligationRow, error: obErr } = await serviceClient
      .schema('finance' as never)
      .from('obligations' as never)
      .select('id, charge_id, scope_id, currency, party_type, party_id, status')
      .eq('id', input.obligationId)
      .maybeSingle();
    if (obErr) {
      console.error(
        JSON.stringify({
          level: 'error',
          traceId: ctx.traceId,
          message: 'payments/initiate: obligation load failed',
          error: obErr.message,
        }),
      );
      return withCors(req, internalError(ctx.traceId));
    }
    if (!obligationRow) return withCors(req, notFound('obligation', ctx.traceId));
    const obligation = obligationRow as ObligationRow;

    if (obligation.status === 'cancelled') {
      return withCors(
        req,
        conflict(
          'OBLIGATION_CANCELLED',
          'Cannot initiate against a cancelled obligation.',
          ctx.traceId,
        ),
      );
    }
    if (obligation.status === 'paid') {
      return withCors(
        req,
        conflict('OBLIGATION_PAID', 'Obligation is already fully paid.', ctx.traceId),
      );
    }

    scopeId = obligation.scope_id;
    currency = obligation.currency;
    chargeId = obligation.charge_id;
    if (!derivedPayer && obligation.party_type === 'member') {
      derivedPayer = obligation.party_id;
    }
  } else {
    const { data: chargeRow, error: chErr } = await serviceClient
      .schema('finance' as never)
      .from('charges' as never)
      .select('id, scope_id, currency')
      .eq('id', input.chargeId!)
      .maybeSingle();
    if (chErr) {
      console.error(
        JSON.stringify({
          level: 'error',
          traceId: ctx.traceId,
          message: 'payments/initiate: charge load failed',
          error: chErr.message,
        }),
      );
      return withCors(req, internalError(ctx.traceId));
    }
    if (!chargeRow) return withCors(req, notFound('charge', ctx.traceId));
    const charge = chargeRow as ChargeRow;

    scopeId = charge.scope_id;
    currency = charge.currency;
    chargeId = charge.id;
  }

  const userClient = createUserClient(ctx.jwt);
  const allowed = await authorize(userClient, ctx, {
    action: 'payment.record',
    scopeId,
  });
  if (!allowed) {
    return withCors(req, forbidden('payment.record', ctx.traceId, { scopeId }));
  }

  if (currency !== input.currency) {
    return withCors(
      req,
      validationError(
        `Payment currency ${input.currency} does not match target currency ${currency}.`,
        ctx.traceId,
        { paymentCurrency: input.currency, targetCurrency: currency },
      ),
    );
  }

  // Simulator delay — env-configurable so integration tests can shorten it.
  const delayMs = parseInt(Deno.env.get('PAYMENT_SIMULATOR_DELAY_MS') ?? '3000', 10);
  const now = new Date();
  const availableFrom = new Date(now.getTime() + delayMs);

  const { data: row, error: insertErr } = await serviceClient
    .schema('finance' as never)
    .from('payment_intents' as never)
    .insert({
      obligation_id: input.obligationId ?? null,
      charge_id: chargeId,
      scope_id: scopeId,
      payer_member_id: derivedPayer,
      amount: input.amount,
      currency: input.currency,
      method: input.method,
      status: 'pending',
      available_from: availableFrom.toISOString(),
      created_by: ctx.userId,
      metadata: { provider: 'simulated' },
    } as never)
    .select('id')
    .maybeSingle();

  if (insertErr || !row) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'payments/initiate: insert failed',
        code: insertErr?.code,
        error: insertErr?.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const intentId = (row as { id: string }).id;

  await logEvent(serviceClient, ctx, {
    action: 'payment.recorded',
    entitySchema: 'finance',
    entityTable: 'payment_intents',
    entityId: intentId,
    scopeId,
    metadata: {
      phase: 'initiated',
      amount: input.amount,
      currency: input.currency,
      method: input.method,
      obligationId: input.obligationId ?? null,
      chargeId,
      availableFrom: availableFrom.toISOString(),
    },
  });

  const body: SuccessBody = {
    intentId,
    availableFrom: availableFrom.toISOString(),
    prefill: {
      amount: input.amount,
      currency: input.currency,
      method: input.method,
      displayMessage: `Simulated ${input.method} · ${input.amount} ${input.currency}`,
    },
    traceId: ctx.traceId,
  };
  return withCors(req, success(body, 201));
}
