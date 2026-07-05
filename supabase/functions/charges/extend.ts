/**
 * Action: charges/extend
 *
 * POST /functions/v1/charges/extend — extends a contribution's
 * close_date past the current one, reopening the window if it had
 * already passed. Locked spec (Part IV):
 *
 *   Extended — the distinctive state: AFTER the close date has passed,
 *              Finance adds extra days (a new close date), reopening it.
 *              Every extension is audited (who, when, old close → new
 *              close).
 *
 * The audit trail lives in finance.contribution_extensions (created in
 * M1). Each call to this endpoint writes one row there capturing the
 * previous close_at + new close_at + who + why.
 *
 * "Extended" is a derived read-time state — the enum stays 4-valued
 * (draft/open/closed/archived). A contribution is "extended" iff
 * lifecycle='open' AND close_date has moved forward AND an extension
 * row exists. The UI and reports read the extension count to distinguish.
 *
 * Source lifecycle can be 'open' (close_date past) or 'closed' (auto-
 * transitioned). Both are supported; the endpoint flips lifecycle to
 * 'open' if it was 'closed'.
 *
 * Auth: contribution.extend at the charge's scope.
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
    newCloseDate: z.string().datetime(),
    reason: z.string().trim().max(500).optional(),
  })
  .strict();

interface ChargeRow {
  readonly id: string;
  readonly scope_id: string;
  readonly shape: string;
  readonly lifecycle: string | null;
  readonly close_date: string | null;
  readonly name: string;
}

export async function extendContribution(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const serviceClient = createServiceRoleClient();
  const { data: chargeRow, error: loadErr } = await serviceClient
    .schema('finance' as never)
    .from('charges' as never)
    .select('id, scope_id, shape, lifecycle, close_date, name')
    .eq('id', input.id)
    .maybeSingle();

  if (loadErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'charges/extend: load failed',
        error: loadErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }
  if (!chargeRow) return withCors(req, notFound('charge', ctx.traceId));
  const row = chargeRow as ChargeRow;

  const userClient = createUserClient(ctx.jwt);
  const allowed = await authorize(userClient, ctx, {
    action: 'contribution.extend',
    scopeId: row.scope_id,
  });
  if (!allowed) {
    return withCors(req, forbidden('contribution.extend', ctx.traceId, { scopeId: row.scope_id }));
  }

  if (row.shape === 'charge') {
    return withCors(
      req,
      conflict('NOT_A_CONTRIBUTION', 'Extend applies to contribution shapes only.', ctx.traceId),
    );
  }

  if (row.lifecycle !== 'open' && row.lifecycle !== 'closed') {
    return withCors(
      req,
      conflict(
        'NOT_EXTENDABLE',
        `Contribution must be in lifecycle=open or closed to extend (currently ${row.lifecycle}).`,
        ctx.traceId,
      ),
    );
  }

  if (!row.close_date) {
    return withCors(
      req,
      conflict(
        'MISSING_CLOSE_DATE',
        'Contribution has no close_date to extend. Update the contribution first.',
        ctx.traceId,
      ),
    );
  }

  const previousClose = new Date(row.close_date);
  const newClose = new Date(input.newCloseDate);
  if (newClose.getTime() <= previousClose.getTime()) {
    return withCors(
      req,
      conflict(
        'NEW_CLOSE_NOT_AFTER',
        'newCloseDate must be strictly after the current close_date.',
        ctx.traceId,
      ),
    );
  }

  // Insert the audit row first — if that fails, the extension didn't
  // happen; if the second step fails, we've written an orphaned
  // extension record but the contribution is still closed. That's the
  // safer failure mode (audit over-records rather than under-records).
  const { error: extErr } = await serviceClient
    .schema('finance' as never)
    .from('contribution_extensions' as never)
    .insert({
      charge_id: row.id,
      previous_close_at: row.close_date,
      new_close_at: input.newCloseDate,
      extended_by: ctx.userId,
      reason: input.reason ?? null,
    } as never);

  if (extErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'charges/extend: extension log failed',
        code: extErr.code,
        error: extErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await serviceClient
    .schema('finance' as never)
    .from('charges' as never)
    .update({
      lifecycle: 'open',
      close_date: input.newCloseDate,
      updated_at: now,
    } as never)
    .eq('id', row.id);

  if (updateErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'charges/extend: update failed',
        code: updateErr.code,
        error: updateErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  await logEvent(serviceClient, ctx, {
    action: 'contribution.extended',
    entitySchema: 'finance',
    entityTable: 'charges',
    entityId: row.id,
    scopeId: row.scope_id,
    metadata: {
      name: row.name,
      previousClose: row.close_date,
      newClose: input.newCloseDate,
      reason: input.reason ?? null,
    },
  });

  return withCors(req, success({ id: row.id, traceId: ctx.traceId }));
}
