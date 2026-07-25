/**
 * Action: charges/forgive-obligation
 *
 * POST /functions/v1/charges/forgive-obligation — writes off a single
 * obligation (status ← 'forgiven'). Spec Part VI: forgiveness is the
 * "valid but written off" path (hardship, president's relief), distinct
 * from `cancelled` (should never have existed) and from `paid`. It
 * surfaces in reports as forgone income, never as collected.
 *
 * Obligations are frozen (only status/updated_at mutate) and never
 * deleted, so a waiver is a status flip, not a row edit. The M4A
 * payment-recompute trigger preserves 'forgiven', so a stray later
 * payment won't silently un-waive it.
 *
 * Auth: obligation.forgive at the obligation's scope_id. This is a
 * sensitive, deliberately-unbundled permission — granted per person,
 * not baked into the finance/branch_admin role bundles.
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
    obligationId: z.string().uuid(),
    reason: z.string().trim().min(1).max(500),
  })
  .strict();

interface ObligationRow {
  readonly id: string;
  readonly scope_id: string;
  readonly charge_id: string;
  readonly party_type: 'member' | 'branch';
  readonly party_id: string;
  readonly amount: string;
  readonly currency: string;
  readonly status: 'open' | 'partial' | 'paid' | 'cancelled' | 'forgiven';
}

export async function forgiveObligation(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  // 1) Load.
  const serviceClient = createServiceRoleClient();
  const { data: existing, error: loadErr } = await serviceClient
    .schema('finance' as never)
    .from('obligations' as never)
    .select('id, scope_id, charge_id, party_type, party_id, amount, currency, status')
    .eq('id', input.obligationId)
    .maybeSingle();

  if (loadErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'charges/forgive-obligation: load failed',
        error: loadErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }
  if (!existing) return withCors(req, notFound('obligation', ctx.traceId));
  const row = existing as ObligationRow;

  // 2) Authorize — sensitive tier.
  const userClient = createUserClient(ctx.jwt);
  const allowed = await authorize(userClient, ctx, {
    action: 'obligation.forgive',
    scopeId: row.scope_id,
  });
  if (!allowed) {
    return withCors(req, forbidden('obligation.forgive', ctx.traceId, { scopeId: row.scope_id }));
  }

  // 3) State guards.
  if (row.status === 'forgiven') {
    // Idempotent — a double-click or retry just confirms the waiver.
    return withCors(req, success({ id: row.id, traceId: ctx.traceId }));
  }
  if (row.status === 'cancelled') {
    return withCors(
      req,
      conflict('CANCELLED', 'A cancelled obligation cannot be forgiven.', ctx.traceId),
    );
  }
  if (row.status === 'paid') {
    return withCors(
      req,
      conflict(
        'ALREADY_PAID',
        'This obligation is fully paid — reverse the payment instead of forgiving.',
        ctx.traceId,
      ),
    );
  }

  // 4) Flip to forgiven.
  const { error: updateErr } = await serviceClient
    .schema('finance' as never)
    .from('obligations' as never)
    .update({ status: 'forgiven', updated_at: new Date().toISOString() } as never)
    .eq('id', row.id);

  if (updateErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'charges/forgive-obligation: update failed',
        code: updateErr.code,
        error: updateErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  await logEvent(serviceClient, ctx, {
    action: 'obligation.forgiven',
    entitySchema: 'finance',
    entityTable: 'obligations',
    entityId: row.id,
    scopeId: row.scope_id,
    metadata: {
      chargeId: row.charge_id,
      partyType: row.party_type,
      partyId: row.party_id,
      amount: row.amount,
      currency: row.currency,
      priorStatus: row.status,
      reason: input.reason,
    },
  });

  return withCors(req, success({ id: row.id, traceId: ctx.traceId }));
}
