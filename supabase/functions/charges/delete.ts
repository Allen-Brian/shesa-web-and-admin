/**
 * Action: charges/delete
 *
 * POST /functions/v1/charges/delete — hard-delete a charge. This is
 * only safe when no payments have ever hit the ledger against the
 * row; obligations + charge_targets cascade cleanly (FK ON DELETE
 * CASCADE), but finance.payments carries ON DELETE RESTRICT so
 * anything with even one payment must be archived instead.
 *
 * Auth: charge.archive at the charge's scope_id — delete is treated
 * as a stronger form of archive, no separate permission.
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
} from '../_shared/errors.ts';
import { authorize } from '../_shared/policy.ts';
import { buildContext } from '../_shared/request-context.ts';
import { createServiceRoleClient, createUserClient } from '../_shared/supabase-client.ts';
import { parseJson } from '../_shared/validation.ts';

const inputSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

interface ChargeRow {
  readonly id: string;
  readonly scope_id: string;
  readonly name: string;
}

interface SuccessBody {
  readonly id: string;
  readonly traceId: string;
}

export async function deleteCharge(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const serviceClient = createServiceRoleClient();

  // 1) Load.
  const { data: existing, error: loadErr } = await serviceClient
    .schema('finance' as never)
    .from('charges' as never)
    .select('id, scope_id, name')
    .eq('id', input.id)
    .maybeSingle();
  if (loadErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'charges/delete: load failed',
        error: loadErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }
  if (!existing) return withCors(req, notFound('charge', ctx.traceId));
  const row = existing as ChargeRow;

  // 2) Authorize (reuse charge.archive — delete is a strict subset of
  //    "remove from active use").
  const userClient = createUserClient(ctx.jwt);
  const allowed = await authorize(userClient, ctx, {
    action: 'charge.archive',
    scopeId: row.scope_id,
  });
  if (!allowed) {
    return withCors(req, forbidden('charge.archive', ctx.traceId, { scopeId: row.scope_id }));
  }

  // 3) Reject if any payment (or payment_intent) exists — those tables
  //    use ON DELETE RESTRICT and the operator almost certainly wants
  //    to archive in that case, not lose history.
  const { count: paymentCount, error: cntErr } = await serviceClient
    .schema('finance' as never)
    .from('payments' as never)
    .select('id', { count: 'exact', head: true })
    .eq('charge_id', row.id);
  if (cntErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'charges/delete: payment count failed',
        error: cntErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }
  if ((paymentCount ?? 0) > 0) {
    return withCors(
      req,
      conflict(
        'CHARGE_HAS_PAYMENTS',
        `This charge has ${paymentCount} payment(s) recorded and cannot be deleted. Archive it instead.`,
        ctx.traceId,
      ),
    );
  }

  // 4) Delete. Obligations + charge_targets cascade automatically.
  const { error: delErr } = await serviceClient
    .schema('finance' as never)
    .from('charges' as never)
    .delete()
    .eq('id', row.id);
  if (delErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'charges/delete: delete failed',
        code: delErr.code,
        error: delErr.message,
      }),
    );
    if (delErr.code === '23503') {
      return withCors(
        req,
        conflict(
          'CHARGE_HAS_DEPENDENTS',
          'Charge is referenced by other rows and cannot be deleted. Archive it instead.',
          ctx.traceId,
        ),
      );
    }
    return withCors(req, internalError(ctx.traceId));
  }

  await logEvent(serviceClient, ctx, {
    action: 'charge.deleted',
    entitySchema: 'finance',
    entityTable: 'charges',
    entityId: row.id,
    scopeId: row.scope_id,
    metadata: { name: row.name },
  });

  const body: SuccessBody = { id: row.id, traceId: ctx.traceId };
  return withCors(req, success(body));
}
