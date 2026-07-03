/**
 * Audit helper — wraps `audit.log_event` for Edge Functions.
 *
 * Every Edge Function emits an audit entry on every meaningful
 * outcome: success, denial, validation failure (where appropriate),
 * downstream error. The helper centralizes the call so callers don't
 * have to remember the column order or repeat the boilerplate.
 *
 * Failures to log are NOT propagated as request failures — a request
 * that succeeded its business work shouldn't 500 because the audit
 * write hit a transient blip. The failure IS logged to console with
 * the traceId so it can be triaged from the runtime logs.
 */

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.47.10';

import type { Database } from '../_types/database.ts';
import type { RequestContext } from './request-context.ts';

export interface AuditArgs {
  readonly action: string; // matches @shesa/types AuditAction literal
  readonly entitySchema: string;
  readonly entityTable: string;
  readonly entityId?: string | null;
  readonly scopeId?: string | null;
  readonly metadata?: Record<string, unknown>;
}

export async function logEvent(
  client: SupabaseClient<Database>,
  ctx: RequestContext,
  args: AuditArgs,
): Promise<void> {
  // log_event lives in the `audit` schema. Without the schema hint,
  // PostgREST resolves against `public` and 404s.
  const { error } = await client.schema('audit' as never).rpc('log_event' as never, {
    p_action: args.action,
    p_entity_schema: args.entitySchema,
    p_entity_table: args.entityTable,
    p_entity_id: args.entityId ?? null,
    p_scope_id: args.scopeId ?? null,
    p_metadata: args.metadata ?? {},
    p_ip_address: ctx.ip,
    p_user_agent: ctx.userAgent,
  });

  if (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        traceId: ctx.traceId,
        message: 'audit.log_event failed',
        action: args.action,
        entity: `${args.entitySchema}.${args.entityTable}`,
        error: error.message,
      }),
    );
  }
}
