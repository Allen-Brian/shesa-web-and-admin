import { notFound, redirect } from 'next/navigation';

import { resolveMemberableScopes } from '@/lib/memberships/memberable-scopes';
import { getServerClient } from '@/lib/supabase-server';

import { AuditLogsView, type AuditEntryRow } from './widgets/audit-logs-view';

export const dynamic = 'force-dynamic';

const PAGE_LIMIT = 200;

/**
 * Audit Logs page — siloed per viewer per ADR-0041.
 *
 *   Global mainstream_admin → Mainstream-scoped entries only.
 *   Branch / autonomous-chapter admin → their scope's entries only.
 *
 * RLS on `audit.audit_entries` (rls_audit migration) already restricts
 * SELECT to holders of `audit.read` at the row's scope, but the policy
 * uses the tree-walking `has_permission`, so a global admin would in
 * principle see every child scope's rows too. The silo is enforced here
 * on the query side — we explicitly filter by scope_id so the admin
 * lens matches the announcements / events convention.
 */
export default async function AuditLogsPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/exco/audit-logs');

  // Resolve the viewer's audit scope. Global mainstream_admin lands on
  // Mainstream; a branch admin lands on their first branch-like grant.
  const { data: mainstream } = await supabase
    .schema('core')
    .from('scopes')
    .select('id, name, slug, scope_type')
    .eq('scope_type', 'mainstream')
    .maybeSingle();

  let auditScope: { id: string; name: string; slug: string; scope_type: string } | null = null;

  if (mainstream) {
    const { data: allowed } = await supabase.schema('core').rpc('has_permission', {
      p_user_id: user.id,
      p_scope_id: mainstream.id,
      p_permission_key: 'audit.read',
    });
    if (allowed === true) auditScope = mainstream;
  }

  if (!auditScope) {
    // Fall back to the viewer's first branch-like grant. `resolveMemberableScopes`
    // already returns branch + autonomous-chapter scopes ordered by name.
    const scopes = await resolveMemberableScopes(supabase, user.id);
    const first = scopes[0];
    if (first) {
      const { data: allowed } = await supabase.schema('core').rpc('has_permission', {
        p_user_id: user.id,
        p_scope_id: first.id,
        p_permission_key: 'audit.read',
      });
      if (allowed === true) {
        auditScope = {
          id: first.id,
          name: first.name,
          slug: first.slug,
          scope_type: first.scope_type,
        };
      }
    }
  }

  if (!auditScope) notFound();

  const { data: entries } = await supabase
    .schema('audit')
    .from('audit_entries')
    .select(
      'id, actor_user_id, action, entity_schema, entity_table, entity_id, scope_id, metadata, ip_address, user_agent, created_at',
    )
    .eq('scope_id', auditScope.id)
    .order('created_at', { ascending: false })
    .limit(PAGE_LIMIT);

  const entryList = entries ?? [];
  const actorIds = Array.from(
    new Set(entryList.map((e) => e.actor_user_id).filter((id): id is string => !!id)),
  );

  const { data: actorProfiles } = actorIds.length
    ? await supabase
        .schema('core')
        .from('profiles')
        .select('id, display_name, email')
        .in('id', actorIds)
    : { data: [] as Array<{ id: string; display_name: string | null; email: string | null }> };

  const actorById = new Map((actorProfiles ?? []).map((p) => [p.id, p]));

  const rows: AuditEntryRow[] = entryList.map((e) => {
    const actor = e.actor_user_id ? actorById.get(e.actor_user_id) : null;
    return {
      id: e.id,
      actor_label: actor
        ? (actor.display_name ?? actor.email ?? '(unknown)')
        : e.actor_user_id
          ? '(deleted user)'
          : '(system)',
      actor_email: actor?.email ?? null,
      action: e.action,
      entity_schema: e.entity_schema,
      entity_table: e.entity_table,
      entity_id: e.entity_id,
      metadata: (e.metadata ?? {}) as Record<string, unknown>,
      ip_address: e.ip_address ? String(e.ip_address) : null,
      user_agent: e.user_agent,
      created_at: e.created_at,
    };
  });

  return (
    <AuditLogsView
      scope={{
        id: auditScope.id,
        slug: auditScope.slug,
        name: auditScope.name,
        scope_type: auditScope.scope_type as
          'mainstream' | 'branch' | 'chapter' | 'batch' | 'house' | 'network',
      }}
      rows={rows}
      limit={PAGE_LIMIT}
    />
  );
}
