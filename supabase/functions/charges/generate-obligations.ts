/**
 * Action: charges/generate-obligations
 *
 * POST /functions/v1/charges/generate-obligations — manually fires
 * obligation generation for one charge (or the whole sweep when
 * chargeId is omitted).
 *
 * The scheduled path is pg_cron (see 20260706100400): the sweep runs
 * hourly with no operator intervention. This endpoint exists for the
 * admin who wants to "generate now" without waiting for the next cron
 * tick — e.g. right after activating a new charge, or after a schema
 * migration that shifted period boundaries.
 *
 * Auth:
 *   * chargeId set   → charge.create at the charge's scope.
 *   * chargeId unset → mainstream_admin only (the global sweep touches
 *                       every scope; a per-scope caller has no legitimate
 *                       reason to fire it).
 */

import { z } from 'npm:zod@3.24.1';

import { logEvent } from '../_shared/audit.ts';
import { withCors } from '../_shared/cors.ts';
import { forbidden, internalError, notFound, success, unauthorized } from '../_shared/errors.ts';
import { authorize } from '../_shared/policy.ts';
import { buildContext } from '../_shared/request-context.ts';
import { createServiceRoleClient, createUserClient } from '../_shared/supabase-client.ts';
import { parseJson } from '../_shared/validation.ts';

const inputSchema = z
  .object({
    chargeId: z.string().uuid().optional(),
    reference: z.string().datetime().optional(),
  })
  .strict();

interface SuccessBody {
  readonly inserted: number;
  readonly scope: 'single' | 'sweep';
  readonly traceId: string;
}

interface ChargeRow {
  readonly id: string;
  readonly scope_id: string;
  readonly shape: string;
  readonly status: string;
}

export async function generateObligations(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const userClient = createUserClient(ctx.jwt);
  const serviceClient = createServiceRoleClient();

  if (input.chargeId) {
    // Per-charge path — permission check against the charge's scope.
    const { data: chargeRow, error: loadErr } = await serviceClient
      .schema('finance' as never)
      .from('charges' as never)
      .select('id, scope_id, shape, status')
      .eq('id', input.chargeId)
      .maybeSingle();
    if (loadErr) {
      console.error(
        JSON.stringify({
          level: 'error',
          traceId: ctx.traceId,
          message: 'charges/generate-obligations: load failed',
          error: loadErr.message,
        }),
      );
      return withCors(req, internalError(ctx.traceId));
    }
    if (!chargeRow) return withCors(req, notFound('charge', ctx.traceId));
    const charge = chargeRow as ChargeRow;

    const allowed = await authorize(userClient, ctx, {
      action: 'charge.create',
      scopeId: charge.scope_id,
    });
    if (!allowed) {
      return withCors(req, forbidden('charge.create', ctx.traceId, { scopeId: charge.scope_id }));
    }

    const { data: inserted, error: rpcErr } = await serviceClient.schema('finance' as never).rpc(
      'generate_obligations_for_charge' as never,
      {
        p_charge_id: input.chargeId,
        p_reference: input.reference ?? new Date().toISOString(),
      } as never,
    );

    if (rpcErr) {
      console.error(
        JSON.stringify({
          level: 'error',
          traceId: ctx.traceId,
          message: 'generate_obligations_for_charge failed',
          error: rpcErr.message,
        }),
      );
      return withCors(req, internalError(ctx.traceId));
    }

    const insertedCount = typeof inserted === 'number' ? inserted : 0;

    await logEvent(serviceClient, ctx, {
      action: 'obligation.generated',
      entitySchema: 'finance',
      entityTable: 'obligations',
      entityId: charge.id,
      scopeId: charge.scope_id,
      metadata: { chargeId: charge.id, inserted: insertedCount },
    });

    const body: SuccessBody = { inserted: insertedCount, scope: 'single', traceId: ctx.traceId };
    return withCors(req, success(body));
  }

  // Sweep path — mainstream_admin only.
  // We resolve mainstream scope from core; any user with an active
  // NULL-scope mainstream_admin grant passes has_permission at that
  // scope for any action, but this endpoint uses charge.create as the
  // canonical "money-mover authority" gate.
  const { data: mainstream, error: msErr } = await serviceClient
    .schema('core' as never)
    .from('scopes' as never)
    .select('id')
    .eq('scope_type', 'mainstream')
    .maybeSingle();
  if (msErr || !mainstream) {
    return withCors(req, internalError(ctx.traceId));
  }
  const msId = (mainstream as { id: string }).id;

  const allowedSweep = await authorize(userClient, ctx, {
    action: 'charge.create',
    scopeId: msId,
  });
  if (!allowedSweep) {
    return withCors(req, forbidden('charge.create', ctx.traceId, { scope: 'sweep' }));
  }

  const { data: swept, error: sweepErr } = await serviceClient.schema('finance' as never).rpc(
    'generate_obligations_sweep' as never,
    {
      p_reference: input.reference ?? new Date().toISOString(),
    } as never,
  );

  if (sweepErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'generate_obligations_sweep failed',
        error: sweepErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const sweptCount = typeof swept === 'number' ? swept : 0;

  await logEvent(serviceClient, ctx, {
    action: 'obligation.generated',
    entitySchema: 'finance',
    entityTable: 'obligations',
    scopeId: msId,
    metadata: { sweep: true, inserted: sweptCount },
  });

  const body: SuccessBody = { inserted: sweptCount, scope: 'sweep', traceId: ctx.traceId };
  return withCors(req, success(body));
}
