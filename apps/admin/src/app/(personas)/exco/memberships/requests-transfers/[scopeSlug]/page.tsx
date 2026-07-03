import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getServerClient } from '@/lib/supabase-server';

import { RequestsTransfersSwitcher } from './widgets/switcher';
import type { RequestRow, TransferRow } from './widgets/switcher';

export const dynamic = 'force-dynamic';

interface Params {
  readonly params: Promise<{ scopeSlug: string }>;
}

export default async function RequestsTransfersScopePage({ params }: Params) {
  const { scopeSlug } = await params;
  const supabase = await getServerClient();

  const { data: scopeRow } = await supabase
    .schema('core')
    .from('scopes')
    .select('id, name, slug, scope_type, chapter_kind')
    .eq('slug', scopeSlug)
    .maybeSingle();

  if (!scopeRow) notFound();

  const isBranchLike =
    scopeRow.scope_type === 'branch' ||
    (scopeRow.scope_type === 'chapter' && scopeRow.chapter_kind === 'autonomous');

  // Batches don't hold pending requests or receive transfers — nothing
  // to do here. Render a not-applicable card that points back to the
  // Members page for the same scope.
  if (!isBranchLike) {
    if (scopeRow.scope_type === 'batch') {
      return <NotApplicableForBatch batchName={scopeRow.name} batchSlug={scopeRow.slug} />;
    }
    notFound(); // grouping chapters, houses, networks, mainstream
  }

  // ── Pending join requests (memberships in status=pending at this scope) ──
  const { data: pendingMemberships } = await supabase
    .schema('core')
    .from('memberships')
    .select('id, member_id, join_method, joined_at, created_at')
    .eq('scope_id', scopeRow.id)
    .eq('membership_status', 'pending')
    .order('created_at', { ascending: false });

  const pmList = pendingMemberships ?? [];
  const requestMemberIds = pmList.map((m) => m.member_id);

  // ── Pending incoming transfers (destination = this scope) ──
  // `core.membership_transfers` isn't in types.gen.ts yet — cast to the
  // hand-typed brief below. Reads via RLS: destination-scope admin sees
  // incoming pending rows (per the 2026-07-03 flip).
  interface TransferBrief {
    id: string;
    member_id: string;
    source_scope_id: string;
    requested_by: string | null;
    requested_at: string;
    reason: string | null;
    created_at: string;
  }
  const { data: pendingTransfersRaw } = await supabase
    .schema('core' as never)
    .from('membership_transfers' as never)
    .select('id, member_id, source_scope_id, requested_by, requested_at, reason, created_at')
    .eq('destination_scope_id', scopeRow.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  const ptList = (pendingTransfersRaw as TransferBrief[] | null) ?? [];
  const transferMemberIds = ptList.map((t) => t.member_id);
  const sourceScopeIds = Array.from(new Set(ptList.map((t) => t.source_scope_id)));

  const memberIds = Array.from(new Set([...requestMemberIds, ...transferMemberIds]));
  const { data: memberRows } = memberIds.length
    ? await supabase
        .schema('core')
        .from('members')
        .select('id, full_name, email, phone, batch_scope_id')
        .in('id', memberIds)
    : { data: [] as MemberBrief[] };
  const memberById = new Map((memberRows ?? []).map((m) => [m.id, m]));

  const batchIds = Array.from(new Set((memberRows ?? []).map((m) => m.batch_scope_id)));
  const refScopeIds = Array.from(new Set([...batchIds, ...sourceScopeIds]));
  const { data: refScopes } = refScopeIds.length
    ? await supabase
        .schema('core')
        .from('scopes')
        .select('id, name, slug, scope_type, entry_year')
        .in('id', refScopeIds)
    : {
        data: [] as {
          id: string;
          name: string;
          slug: string;
          scope_type: string;
          entry_year: number | null;
        }[],
      };
  const refScopeById = new Map((refScopes ?? []).map((s) => [s.id, s]));

  const requests: RequestRow[] = pmList.map((m) => {
    const mem = memberById.get(m.member_id);
    const batch = mem ? refScopeById.get(mem.batch_scope_id) : undefined;
    return {
      membership_id: m.id,
      member_id: m.member_id,
      full_name: mem?.full_name ?? '(missing)',
      email: mem?.email ?? null,
      phone: mem?.phone ?? null,
      batch_name: batch?.name ?? null,
      join_method: m.join_method,
      requested_at: m.created_at,
    };
  });

  const transfers: TransferRow[] = ptList.map((t) => {
    const mem = memberById.get(t.member_id);
    const batch = mem ? refScopeById.get(mem.batch_scope_id) : undefined;
    const source = refScopeById.get(t.source_scope_id);
    return {
      transfer_id: t.id,
      member_id: t.member_id,
      full_name: mem?.full_name ?? '(missing)',
      email: mem?.email ?? null,
      phone: mem?.phone ?? null,
      batch_name: batch?.name ?? null,
      source_scope_name: source?.name ?? '(unknown)',
      source_scope_slug: source?.slug ?? '',
      reason: t.reason,
      requested_at: t.requested_at,
    };
  });

  return (
    <RequestsTransfersSwitcher
      scope={{
        id: scopeRow.id,
        slug: scopeRow.slug,
        name: scopeRow.name,
        scope_type: scopeRow.scope_type as 'branch' | 'chapter',
      }}
      requests={requests}
      transfers={transfers}
    />
  );
}

interface MemberBrief {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  batch_scope_id: string;
}

function NotApplicableForBatch({
  batchName,
  batchSlug,
}: {
  readonly batchName: string;
  readonly batchSlug: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center">
      <div className="max-w-md rounded-xl border border-dashed border-border p-8 text-center">
        <h1 className="text-lg font-semibold text-foreground">Not applicable for batches</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Batches don&apos;t receive join requests or transfers — membership is set by graduation
          year and the roster is managed via imports.
        </p>
        <Link
          href={`/exco/memberships/members/${batchSlug}`}
          className="mt-4 inline-block rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-primary/5"
        >
          Go to {batchName} members
        </Link>
      </div>
    </div>
  );
}
