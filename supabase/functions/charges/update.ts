/**
 * Action: charges/update
 *
 * PATCH-style update for a charge. Every field is optional; unspecified
 * fields stay unchanged. Financial-shape edits (base_amount, currency,
 * shape, goal_amount, capacity) are frozen at insert time — they are
 * NOT reachable through this endpoint. That's a deliberate constraint:
 * once a charge exists, its economic terms are stable so any obligations
 * generated against it stay explainable.
 *
 * Status transitions allowed by this endpoint:
 *   draft   → active | archived
 *   active  → paused | archived
 *   paused  → active | archived
 *   archived → (terminal)
 *
 * Auth: charge.update at the charge's scope_id.
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
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    categoryId: z.string().uuid().nullable().optional(),
    targetFilter: z.record(z.unknown()).optional(),
    activationDate: z.string().datetime().nullable().optional(),
    issueDate: z.string().datetime().nullable().optional(),
    openDate: z.string().datetime().nullable().optional(),
    closeDate: z.string().datetime().nullable().optional(),
    status: z.enum(['draft', 'active', 'paused', 'archived']).optional(),
  })
  .strict();

interface ChargeRow {
  readonly id: string;
  readonly scope_id: string;
  readonly status: 'draft' | 'active' | 'paused' | 'archived';
  readonly shape: string;
  readonly open_date: string | null;
  readonly close_date: string | null;
}

interface SuccessBody {
  readonly id: string;
  readonly traceId: string;
}

export async function updateCharge(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  // 1) Load the row.
  const serviceClient = createServiceRoleClient();
  const { data: existing, error: loadErr } = await serviceClient
    .schema('finance' as never)
    .from('charges' as never)
    .select('id, scope_id, status, shape, open_date, close_date')
    .eq('id', input.id)
    .maybeSingle();

  if (loadErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'charges/update: load failed',
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
    action: 'charge.update',
    scopeId: row.scope_id,
  });
  if (!allowed) {
    return withCors(req, forbidden('charge.update', ctx.traceId, { scopeId: row.scope_id }));
  }

  // 3) Archived charges are terminal.
  if (row.status === 'archived') {
    return withCors(
      req,
      conflict(
        'CHARGE_ARCHIVED',
        'Cannot update an archived charge. Restore or create a new one.',
        ctx.traceId,
      ),
    );
  }

  // 4) Window sanity — if either date is being changed, the resulting
  //    pair must satisfy close ≥ open.
  const nextOpen = input.openDate === undefined ? row.open_date : input.openDate;
  const nextClose = input.closeDate === undefined ? row.close_date : input.closeDate;
  if (nextOpen && nextClose && new Date(nextClose).getTime() < new Date(nextOpen).getTime()) {
    return withCors(
      req,
      conflict('WINDOW_INVALID', 'closeDate must be on or after openDate.', ctx.traceId),
    );
  }

  // 5) Status transitions.
  if (input.status && input.status !== row.status) {
    if (!isValidTransition(row.status, input.status)) {
      return withCors(
        req,
        conflict(
          'INVALID_TRANSITION',
          `Cannot transition charge from ${row.status} to ${input.status}.`,
          ctx.traceId,
        ),
      );
    }
  }

  // 6) Build the patch.
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description ?? null;
  if (input.categoryId !== undefined) patch.category_id = input.categoryId ?? null;
  if (input.targetFilter !== undefined) patch.target_filter = input.targetFilter;
  if (input.activationDate !== undefined) patch.activation_date = input.activationDate ?? null;
  if (input.issueDate !== undefined) patch.issue_date = input.issueDate ?? null;
  if (input.openDate !== undefined) patch.open_date = input.openDate ?? null;
  if (input.closeDate !== undefined) patch.close_date = input.closeDate ?? null;
  if (input.status !== undefined) patch.status = input.status;
  patch.updated_at = new Date().toISOString();

  if (Object.keys(patch).length === 1) {
    // Only updated_at — no-op. Return success without touching the row.
    return withCors(req, success({ id: row.id, traceId: ctx.traceId }));
  }

  const { error: updateErr } = await serviceClient
    .schema('finance' as never)
    .from('charges' as never)
    .update(patch as never)
    .eq('id', row.id);

  if (updateErr) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'charges/update: update failed',
        code: updateErr.code,
        error: updateErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  await logEvent(serviceClient, ctx, {
    action: 'charge.updated',
    entitySchema: 'finance',
    entityTable: 'charges',
    entityId: row.id,
    scopeId: row.scope_id,
    metadata: { patch: Object.keys(patch) },
  });

  const body: SuccessBody = { id: row.id, traceId: ctx.traceId };
  return withCors(req, success(body));
}

function isValidTransition(
  from: ChargeRow['status'],
  to: 'draft' | 'active' | 'paused' | 'archived',
): boolean {
  if (from === 'archived') return false;
  if (from === 'draft') return to === 'active' || to === 'archived';
  if (from === 'active') return to === 'paused' || to === 'archived';
  if (from === 'paused') return to === 'active' || to === 'archived';
  return false;
}
