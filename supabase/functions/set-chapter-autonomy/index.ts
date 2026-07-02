/**
 * Edge Function: set-chapter-autonomy
 *
 * Flips a chapter's kind between `autonomous` and `grouping`. Distinct
 * from `update-scope` because the effect is severe — an autonomous
 * chapter holds its own memberships and treasury; a grouping chapter
 * only tags branch members. Flipping wrong direction disables member
 * management on a scope that already has members, which the DB will
 * reject via the memberships → chapter_kind CHECK constraint from E1.4.
 *
 * Distinct permission (`scope.change_autonomy`) so a Mainstream Admin
 * can hand out narrower `scope.update` grants without also handing out
 * the autonomy switch.
 *
 * Also mirrors chapter_kind into is_autonomous during the transition
 * so has_permission's ancestry walk keeps working until the follow-up
 * migration drops is_autonomous.
 */

import { z } from 'npm:zod@3.24.1';

import { logEvent } from '../_shared/audit.ts';
import { handlePreflight, withCors } from '../_shared/cors.ts';
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
    scopeId: z.string().uuid(),
    chapterKind: z.enum(['autonomous', 'grouping']),
  })
  .strict();

interface SuccessBody {
  scopeId: string;
  before: 'autonomous' | 'grouping';
  after: 'autonomous' | 'grouping';
  traceId: string;
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  const ctx = buildContext(req);
  if (!ctx.userId || !ctx.jwt) return withCors(req, unauthorized(ctx.traceId));

  const parsed = await parseJson(req, inputSchema, ctx.traceId);
  if (!parsed.ok) return withCors(req, parsed.response);
  const input = parsed.data;

  const supabase = createUserClient(ctx.jwt);

  const allowed = await authorize(supabase, ctx, {
    action: 'scope.change_autonomy',
    scopeId: input.scopeId,
  });
  if (!allowed) {
    return withCors(
      req,
      forbidden('scope.change_autonomy', ctx.traceId, { scopeId: input.scopeId }),
    );
  }

  const { data: current, error: readErr } = await supabase
    .from('scopes' as never)
    .select('id, scope_type, chapter_kind')
    .eq('id', input.scopeId)
    .maybeSingle();

  if (readErr || !current) return withCors(req, notFound('scope', ctx.traceId));
  const row = current as { scope_type: string; chapter_kind: 'autonomous' | 'grouping' };

  if (row.scope_type !== 'chapter') {
    return withCors(
      req,
      validationError('Only chapter scopes have an autonomy setting', ctx.traceId, {
        scopeId: `scope is ${row.scope_type}, not chapter`,
      }),
    );
  }
  if (row.chapter_kind === input.chapterKind) {
    // No change — idempotent success.
    const body: SuccessBody = {
      scopeId: input.scopeId,
      before: row.chapter_kind,
      after: input.chapterKind,
      traceId: ctx.traceId,
    };
    return withCors(req, success(body));
  }

  const { error: updateErr } = await supabase
    .from('scopes' as never)
    .update({
      chapter_kind: input.chapterKind,
      is_autonomous: input.chapterKind === 'autonomous',
    } as never)
    .eq('id', input.scopeId);

  if (updateErr) {
    if (updateErr.code === '23514') {
      return withCors(
        req,
        validationError('Autonomy change violates a scope invariant', ctx.traceId, {
          _: updateErr.message,
        }),
      );
    }
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'set-chapter-autonomy: UPDATE failed',
        code: updateErr.code,
        error: updateErr.message,
      }),
    );
    return withCors(req, internalError(ctx.traceId));
  }

  await logEvent(supabase, ctx, {
    action: 'scope.autonomy_changed',
    entitySchema: 'core',
    entityTable: 'scopes',
    entityId: input.scopeId,
    scopeId: input.scopeId,
    metadata: { before: row.chapter_kind, after: input.chapterKind },
  });

  const body: SuccessBody = {
    scopeId: input.scopeId,
    before: row.chapter_kind,
    after: input.chapterKind,
    traceId: ctx.traceId,
  };
  return withCors(req, success(body));
});
