/**
 * Action: charges/archive
 *
 * POST /functions/v1/charges/archive — soft-archives a charge (status ←
 * 'archived'). Related obligations stay in whatever state they were
 * in — archiving does NOT cancel or forgive them (spec Part VI:
 * "obligations never deleted"). Archive is the charge-side "no more
 * generation for this row" flag.
 *
 * Auth: charge.archive at the charge's scope_id.
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
  readonly status: 'draft' | 'active' | 'paused' | 'archived';
  readonly name: string;
}

interface SuccessBody {
  readonly id: string;
  readonly traceId: string;
}

export async function archiveCharge(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  // 1) Load.
  const serviceClient = createServiceRoleClient();
  const { data: existing, error: loadErr } = await serviceClient
    .schema('finance' as never)
    .from('charges' as never)
    .select('id, scope_id, status, name')
    .eq('id', input.id)
    .maybeSingle();

  if (loadErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'charges/archive: load failed',
        error: loadErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }
  if (!existing) return withCors(req, notFound('charge', ctx.traceId));
  const row = existing as ChargeRow;

  // 2) Authorize.
  const userClient = createUserClient(ctx.jwt);
  const allowed = await authorize(userClient, ctx, {
    action: 'charge.archive',
    scopeId: row.scope_id,
  });
  if (!allowed) {
    return withCors(req, forbidden('charge.archive', ctx.traceId, { scopeId: row.scope_id }));
  }

  // 3) Already archived → no-op success. Callers can retry idempotently.
  if (row.status === 'archived') {
    return withCors(req, success({ id: row.id, traceId: ctx.traceId }));
  }

  // 4) Update status.
  const { error: updateErr } = await serviceClient
    .schema('finance' as never)
    .from('charges' as never)
    .update({ status: 'archived', updated_at: new Date().toISOString() } as never)
    .eq('id', row.id);

  if (updateErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'charges/archive: update failed',
        code: updateErr.code,
        error: updateErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  await logEvent(serviceClient, ctx, {
    action: 'charge.archived',
    entitySchema: 'finance',
    entityTable: 'charges',
    entityId: row.id,
    scopeId: row.scope_id,
    metadata: { name: row.name, reason: input.reason ?? null, priorStatus: row.status },
  });

  const body: SuccessBody = { id: row.id, traceId: ctx.traceId };
  return withCors(req, success(body));
}
