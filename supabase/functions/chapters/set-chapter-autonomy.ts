/**
 * Action: set-chapter-autonomy
 *
 * Handler for POST /functions/v1/chapters/set-chapter-autonomy. Flips
 * `chapter_kind` between autonomous and grouping. The autonomous →
 * grouping demote guard lives in `core.change_chapter_autonomy()`,
 * which blocks when memberships are still attached.
 *
 * Distinct permission (`scope.change_autonomy`) so `scope.update`
 * grants can be handed out narrower than this severe transition.
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

export async function setChapterAutonomy(req: Request): Promise<Response> {
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
    .schema('core' as never)
    .from('scopes')
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
    const body: SuccessBody = {
      scopeId: input.scopeId,
      before: row.chapter_kind,
      after: input.chapterKind,
      traceId: ctx.traceId,
    };
    return withCors(req, success(body));
  }

  const { error: rpcErr } = await supabase.schema('core' as never).rpc(
    'change_chapter_autonomy' as never,
    {
      p_scope_id: input.scopeId,
      p_new_kind: input.chapterKind,
    } as never,
  );

  if (rpcErr) {
    if (rpcErr.code === '23514' && String(rpcErr.message).includes('cannot demote')) {
      return withCors(req, conflict('CHAPTER_HAS_MEMBERS', rpcErr.message, ctx.traceId));
    }
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'chapters/set-chapter-autonomy: RPC failed',
        code: rpcErr.code,
        error: rpcErr.message,
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
}
