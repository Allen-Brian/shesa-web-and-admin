/**
 * Action: charges/approve
 *
 * POST /functions/v1/charges/approve — Finance approves an
 * Admin-proposed contribution. Locked spec (Part IV):
 *
 *   > An Admin-created contribution enters Pending-Finance and goes
 *   > live only on Finance approval — because publishing it puts
 *   > money-collecting objects into the world, and the Finance officer
 *   > owns the books.
 *
 * Only contribution shapes (goal / open / ticketed / fixed / donation)
 * are eligible — the 'charge' shape (dues / levies) does not use the
 * contribution lifecycle and moves through charges/update instead.
 *
 * The transition is draft → open. If open_date is unset, it defaults to
 * NOW. close_date must already be set (validated at create time for
 * bounded-window shapes). This endpoint does NOT generate obligations
 * for 'fixed' contributions — that fires via charges/generate-obligations
 * on the standard cron sweep, or the operator can call it manually.
 *
 * Auth: contribution.approve at the charge's scope.
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
  readonly shape: string;
  readonly lifecycle: string | null;
  readonly status: string;
  readonly open_date: string | null;
  readonly close_date: string | null;
  readonly name: string;
}

interface SuccessBody {
  readonly id: string;
  readonly traceId: string;
}

export async function approveContribution(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const serviceClient = createServiceRoleClient();
  const { data: chargeRow, error: loadErr } = await serviceClient
    .schema('finance' as never)
    .from('charges' as never)
    .select('id, scope_id, shape, lifecycle, status, open_date, close_date, name')
    .eq('id', input.id)
    .maybeSingle();

  if (loadErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'charges/approve: load failed',
        error: loadErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }
  if (!chargeRow) return withCors(req, notFound('charge', ctx.traceId));
  const row = chargeRow as ChargeRow;

  const userClient = createUserClient(ctx.jwt);
  const allowed = await authorize(userClient, ctx, {
    action: 'contribution.approve',
    scopeId: row.scope_id,
  });
  if (!allowed) {
    return withCors(req, forbidden('contribution.approve', ctx.traceId, { scopeId: row.scope_id }));
  }

  if (row.shape === 'charge') {
    return withCors(
      req,
      conflict(
        'NOT_A_CONTRIBUTION',
        'Approve applies to contribution shapes only. Use charges/update to activate a charge (dues/levy).',
        ctx.traceId,
      ),
    );
  }

  if (row.lifecycle !== 'draft') {
    return withCors(
      req,
      conflict(
        'NOT_IN_DRAFT',
        `Contribution must be in lifecycle=draft to approve (currently ${row.lifecycle}).`,
        ctx.traceId,
      ),
    );
  }

  if (!row.close_date) {
    return withCors(
      req,
      conflict(
        'MISSING_CLOSE_DATE',
        'Contribution requires a close_date before it can go open.',
        ctx.traceId,
      ),
    );
  }

  const now = new Date().toISOString();
  const openDate = row.open_date ?? now;

  if (new Date(row.close_date).getTime() <= new Date(openDate).getTime()) {
    return withCors(
      req,
      conflict(
        'WINDOW_INVALID',
        'close_date must be strictly after open_date. Update the contribution before approving.',
        ctx.traceId,
      ),
    );
  }

  const { error: updateErr } = await serviceClient
    .schema('finance' as never)
    .from('charges' as never)
    .update({
      lifecycle: 'open',
      status: 'active',
      open_date: openDate,
      updated_at: now,
    } as never)
    .eq('id', row.id);

  if (updateErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'charges/approve: update failed',
        code: updateErr.code,
        error: updateErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  await logEvent(serviceClient, ctx, {
    action: 'contribution.approved',
    entitySchema: 'finance',
    entityTable: 'charges',
    entityId: row.id,
    scopeId: row.scope_id,
    metadata: { shape: row.shape, name: row.name, openDate },
  });

  const body: SuccessBody = { id: row.id, traceId: ctx.traceId };
  return withCors(req, success(body));
}
