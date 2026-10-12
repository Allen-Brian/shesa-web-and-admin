/**
 * Action: charges/close
 *
 * POST /functions/v1/charges/close — manually closes an open
 * contribution before its close_date. Locked spec (Part IV):
 *
 *   Closed — reached its close date (auto) OR closed early by Finance
 *            (manual). No longer accepting payments.
 *
 * The automatic path (reaching close_date) is not implemented here —
 * that would be a pg_cron sweep. For M3 v1 we treat "closed" as either
 * the manual state produced here OR a derived read-time state ("close_date
 * has passed and no extension row was written afterwards"). Reports and
 * the UI treat both the same. When the auto-close sweep lands, it
 * writes lifecycle='closed' onto rows crossing close_date so downstream
 * queries don't need the derivation.
 *
 * Auth: charge.update at the charge's scope. Finance owns the money
 * lifecycle; this endpoint isn't a distinct permission from update.
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
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

interface ChargeRow {
  readonly id: string;
  readonly scope_id: string;
  readonly shape: string;
  readonly lifecycle: string | null;
  readonly name: string;
}

export async function closeContribution(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const serviceClient = createServiceRoleClient();
  const { data: chargeRow, error: loadErr } = await serviceClient
    .schema('finance' as never)
    .from('charges' as never)
    .select('id, scope_id, shape, lifecycle, name')
    .eq('id', input.id)
    .maybeSingle();

  if (loadErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'charges/close: load failed',
        error: loadErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }
  if (!chargeRow) return withCors(req, notFound('charge', ctx.traceId));
  const row = chargeRow as ChargeRow;

  const userClient = createUserClient(ctx.jwt);
  const allowed = await authorize(userClient, ctx, {
    action: 'charge.update',
    scopeId: row.scope_id,
  });
  if (!allowed) {
    return withCors(req, forbidden('charge.update', ctx.traceId, { scopeId: row.scope_id }));
  }

  if (row.shape === 'charge') {
    return withCors(
      req,
      conflict(
        'NOT_A_CONTRIBUTION',
        'Close applies to contribution shapes only. Use charges/update to pause a charge.',
        ctx.traceId,
      ),
    );
  }

  if (row.lifecycle !== 'open') {
    return withCors(
      req,
      conflict(
        'NOT_OPEN',
        `Contribution must be in lifecycle=open to close (currently ${row.lifecycle}).`,
        ctx.traceId,
      ),
    );
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await serviceClient
    .schema('finance' as never)
    .from('charges' as never)
    .update({ lifecycle: 'closed', close_date: now, updated_at: now } as never)
    .eq('id', row.id);

  if (updateErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'charges/close: update failed',
        code: updateErr.code,
        error: updateErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  await logEvent(serviceClient, ctx, {
    action: 'contribution.closed',
    entitySchema: 'finance',
    entityTable: 'charges',
    entityId: row.id,
    scopeId: row.scope_id,
    metadata: { name: row.name, reason: input.reason ?? null, closedEarly: true },
  });

  return withCors(req, success({ id: row.id, traceId: ctx.traceId }));
}
