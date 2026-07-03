import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getServerClient } from '@/lib/supabase-server';

import { RegistrationTable, type RegistrationRow } from './widgets/registration-table';

export const dynamic = 'force-dynamic';

interface Params {
  readonly params: Promise<{ scopeSlug: string }>;
}

export default async function RegistrationScopePage({ params }: Params) {
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

  if (!isBranchLike) {
    if (scopeRow.scope_type === 'batch') {
      return <NotApplicableForBatch batchName={scopeRow.name} batchSlug={scopeRow.slug} />;
    }
    notFound();
  }

  const { data: memberships } = await supabase
    .schema('core')
    .from('memberships')
    .select('id, member_id, membership_status, joined_at')
    .eq('scope_id', scopeRow.id)
    .in('membership_status', ['active', 'passive']);

  const membershipList = memberships ?? [];
  const membershipIds = membershipList.map((m) => m.id);
  const memberIds = membershipList.map((m) => m.member_id);

  const [{ data: members }, { data: registration }] = await Promise.all([
    memberIds.length
      ? supabase
          .schema('core')
          .from('members')
          .select('id, full_name, batch_scope_id, email, phone')
          .in('id', memberIds)
      : Promise.resolve({ data: [] as MemberBrief[] }),
    membershipIds.length
      ? supabase
          .schema('core')
          .from('registration_status')
          .select(
            'membership_id, fee_required, amount, currency_code, marked_paid_at, waived_at, waived_reason, paid_on_behalf_at, paid_on_behalf_note',
          )
          .in('membership_id', membershipIds)
      : Promise.resolve({ data: [] as RegistrationBrief[] }),
  ]);

  const memberById = new Map((members ?? []).map((m) => [m.id, m]));
  const regByMembership = new Map((registration ?? []).map((r) => [r.membership_id, r]));

  const batchIds = Array.from(new Set((members ?? []).map((m) => m.batch_scope_id)));
  const { data: batchScopes } = batchIds.length
    ? await supabase.schema('core').from('scopes').select('id, name, entry_year').in('id', batchIds)
    : { data: [] as { id: string; name: string; entry_year: number | null }[] };
  const batchById = new Map((batchScopes ?? []).map((s) => [s.id, s]));

  const rows: RegistrationRow[] = membershipList.map((m) => {
    const mem = memberById.get(m.member_id);
    const reg = regByMembership.get(m.id);
    const batch = mem ? batchById.get(mem.batch_scope_id) : undefined;
    const state = reg ? computeState(reg) : 'not_required';
    return {
      membership_id: m.id,
      member_id: m.member_id,
      full_name: mem?.full_name ?? '(missing)',
      email: mem?.email ?? null,
      phone: mem?.phone ?? null,
      batch_year: batch?.entry_year ?? null,
      batch_name: batch?.name ?? null,
      fee_required: reg?.fee_required ?? false,
      amount: reg?.amount ?? null,
      currency_code: reg?.currency_code ?? null,
      registration_state: state,
      waived_reason: reg?.waived_reason ?? null,
      paid_on_behalf_note: reg?.paid_on_behalf_note ?? null,
      joined_at: m.joined_at,
      membership_status: m.membership_status as 'active' | 'passive',
    };
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Memberships · {scopeRow.scope_type === 'chapter' ? 'Autonomous chapter' : 'Branch'}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {scopeRow.name} · Registration
        </h1>
        <p className="font-mono text-xs text-muted-foreground">{scopeRow.slug}</p>
      </div>

      <RegistrationTable rows={rows} />
    </div>
  );
}

interface MemberBrief {
  id: string;
  full_name: string;
  batch_scope_id: string;
  email: string | null;
  phone: string | null;
}

interface RegistrationBrief {
  membership_id: string;
  fee_required: boolean;
  amount: number | null;
  currency_code: string | null;
  marked_paid_at: string | null;
  waived_at: string | null;
  waived_reason: string | null;
  paid_on_behalf_at: string | null;
  paid_on_behalf_note: string | null;
}

function computeState(reg: RegistrationBrief): RegistrationRow['registration_state'] {
  if (!reg.fee_required) return 'not_required';
  if (reg.marked_paid_at) return 'paid';
  if (reg.waived_at) return 'waived';
  if (reg.paid_on_behalf_at) return 'paid_on_behalf';
  return 'pending';
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
          Batches don&apos;t collect a registration fee — the roster is managed via imports.
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
