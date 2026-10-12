/**
 * Edge Function: admin-correct-member
 *
 * The admin-only corrections path — writes the same rows as
 * `update-member`'s protected fields, but with two differences that
 * make it worth a dedicated endpoint:
 *
 *   1. **Distinct audit action key** — emits `member.corrected` instead
 *      of `member.updated` so an auditor scanning the log can filter on
 *      "admin correction" separately from routine updates. The audit
 *      metadata includes the full `before` snapshot in a JSONB blob so
 *      the correction is reversible from the log alone.
 *
 *   2. **Requires `member.update` at Mainstream** — no self-edit path
 *      here. This function refuses to run for the member themselves;
 *      that's what update-member's self path is for.
 *
 * The Exco UI "Admin correction" screen (E1.7c) is the intended
 * consumer.
 */

import { z } from 'npm:zod@3.24.1';

import { logEvent } from '../_shared/audit.ts';
import { withCors } from '../_shared/cors.ts';
import {
  forbidden,
  internalError,
  notFound,
  success,
  unauthorized,
  validationError,
} from '../_shared/errors.ts';
import { authorize } from '../_shared/policy.ts';
import { buildContext } from '../_shared/request-context.ts';
import { createUserClient } from '../_shared/supabase-client.ts';
import { parseJson } from '../_shared/validation.ts';

const inputSchema = z
  .object({
    memberId: z.string().uuid(),
    reason: z.string().min(1).max(500),
    fullName: z.string().min(1).max(200).optional(),
    email: z.string().email().nullable().optional(),
    phone: z.string().min(1).max(40).nullable().optional(),
    batchScopeId: z.string().uuid().optional(),
    houseScopeId: z.string().uuid().optional(),
    networkScopeId: z.string().uuid().optional(),
    field: z.string().max(120).nullable().optional(),
    entryYear: z.number().int().min(1953).max(2100).nullable().optional(),
    exitYear: z.number().int().min(1953).max(2100).nullable().optional(),
    gender: z.string().max(40).nullable().optional(),
    dateOfBirth: z.string().date().nullable().optional(),
    memberStatus: z.enum(['active', 'deceased']).optional(),
  })
  .strict();

interface SuccessBody {
  memberId: string;
  updated: string[];
  traceId: string;
}

const inputToColumn: Record<string, string> = {
  fullName: 'full_name',
  email: 'email',
  phone: 'phone',
  batchScopeId: 'batch_scope_id',
  houseScopeId: 'house_scope_id',
  networkScopeId: 'network_scope_id',
  field: 'field',
  entryYear: 'entry_year',
  exitYear: 'exit_year',
  gender: 'gender',
  dateOfBirth: 'date_of_birth',
  memberStatus: 'member_status',
};

export async function adminCorrectMember(req: Request): Promise<Response> {
  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const supabase = createUserClient(ctx.jwt);

  const { data: ms } = await supabase
    .schema('core' as never)
    .from('scopes' as never)
    .select('id')
    .eq('scope_type', 'mainstream')
    .maybeSingle();
  if (!ms) return withCors(req, internalError(ctx.traceId));
  const mainstreamId = (ms as { id: string }).id;

  const allowed = await authorize(supabase, ctx, {
    action: 'member.update',
    scopeId: mainstreamId,
  });
  if (!allowed) {
    return withCors(req, forbidden('member.update', ctx.traceId, { scopeId: mainstreamId }));
  }

  // Refuse self-corrections through this endpoint — that would defeat
  // the "admin correction" audit signal.
  const { data: ownership } = await supabase
    .schema('core' as never)
    .rpc('member_owned_by' as never, {
      p_member_id: input.memberId,
      p_user_id: ctx.userId,
    });
  if (ownership === true) {
    return withCors(
      req,
      forbidden('admin-correct-member: cannot self-correct through this endpoint', ctx.traceId, {
        hint: 'use update-member for self edits',
      }),
    );
  }

  // Load the current row for the audit's before-snapshot.
  const { data: before } = await supabase
    .schema('core' as never)
    .from('members' as never)
    .select('*')
    .eq('id', input.memberId)
    .maybeSingle();
  if (!before) return withCors(req, notFound('member', ctx.traceId));

  const touched: string[] = [];
  const patch: Record<string, unknown> = {};
  for (const key of Object.keys(input) as (keyof typeof input)[]) {
    if (key === 'memberId' || key === 'reason') continue;
    if (input[key] === undefined) continue;
    const column = inputToColumn[key];
    if (!column) continue;
    touched.push(column);
    patch[column] = input[key];
  }

  if (touched.length === 0) {
    return withCors(
      req,
      validationError('admin-correct-member requires at least one field to change', ctx.traceId),
    );
  }

  const { error: updateErr } = await supabase
    .schema('core' as never)
    .from('members' as never)
    .update(patch as never)
    .eq('id', input.memberId);

  if (updateErr) {
    if (updateErr.code === '23514') {
      return withCors(
        req,
        validationError('Correction violates a member invariant', ctx.traceId, {
          _: updateErr.message,
        }),
      );
    }
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'admin-correct-member: UPDATE failed',
        code: updateErr.code,
        error: updateErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  await logEvent(supabase, ctx, {
    action: 'member.corrected',
    entitySchema: 'core',
    entityTable: 'members',
    entityId: input.memberId,
    scopeId: null,
    metadata: {
      reason: input.reason,
      changed: touched,
      before,
    },
  });

  const body: SuccessBody = { memberId: input.memberId, updated: touched, traceId: ctx.traceId };
  return withCors(req, success(body));
}
