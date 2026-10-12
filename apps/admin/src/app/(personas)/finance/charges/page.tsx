import { redirect } from 'next/navigation';

import { activeFinanceScope } from '@/lib/finance/active-scope';
import { getServerClient } from '@/lib/supabase-server';

import { ChargesView } from './widgets/charges-view';
import type {
  ChargeRow,
  ScopeOption,
  TargetPartyType,
  TargetScopeOption,
} from './widgets/charges-types';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Finance — Charges' };

interface RawChargeRow {
  readonly id: string;
  readonly scope_id: string;
  readonly name: string;
  readonly description: string | null;
  readonly shape: string;
  readonly base_amount: number | null;
  readonly currency: string;
  readonly recurrence: string;
  readonly recurrence_interval: number;
  readonly status: string;
  readonly activation_date: string | null;
  readonly created_at: string;
  readonly target_party_type: TargetPartyType | null;
}

interface RawScopeRow {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly scope_type: string;
  readonly chapter_kind: string | null;
  readonly currency_code: string;
  readonly parent_scope_id: string | null;
}

interface RawObligationRow {
  readonly charge_id: string;
  readonly amount: number;
  readonly currency: string;
}

interface RawPaymentRow {
  readonly obligation_id: string | null;
  readonly amount: number;
  readonly reverses_payment_id: string | null;
}

interface RawChargeTargetRow {
  readonly charge_id: string;
  readonly target_scope_id: string;
  readonly amount: number;
}

/**
 * Charges page — dues + levies (shape IN 'charge' | 'fixed').
 *
 * RLS on finance.charges filters SELECT to scopes the caller holds
 * treasury.read / finance.read at (M1 policy). The page reads what
 * comes back; no extra permission check needed on the read side.
 *
 * The create/edit/archive server actions live in ./actions.ts and go
 * through the charges/* edge functions (M2A) which do their own auth.
 *
 * Scope picker options are derived from the treasury_balances
 * visibility set — every finance-bearing scope the caller sees. Fresh
 * scopes without a treasury row yet are picked up via any charge
 * already at that scope; the branch-onboarding flow (creating the
 * first charge at a fresh branch) may need the mainstream to add
 * initial visibility.
 *
 * Also loads per-charge expected + collected aggregates so the list
 * can render a coverage % / progress cell without a per-row RPC. The
 * limit clamps to 5000 payments — enough for demo + early prod, and
 * we'll swap to a materialised view or dashboard RPC when charge
 * counts pass that ceiling.
 *
 * Group charges (target_party_type='branch') own an amount-per-target
 * row in finance.charge_targets; the list column just needs the count,
 * so we tally client-side from a lightweight `SELECT charge_id`.
 */
export default async function ChargesPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/finance/charges');

  const [{ data: chargesRaw }, { data: treasuriesRaw }] = await Promise.all([
    supabase
      .schema('finance')
      .from('charges')
      .select(
        'id, scope_id, name, description, shape, base_amount, currency, recurrence, recurrence_interval, status, activation_date, created_at, target_party_type',
      )
      .in('shape', ['charge', 'fixed'])
      .order('created_at', { ascending: false }),
    supabase.schema('finance').from('treasury_balances').select('scope_id'),
  ]);

  const chargesData = (chargesRaw ?? []) as RawChargeRow[];
  const chargeIds = chargesData.map((c) => c.id);

  const [{ data: obligationsRaw }, { data: paymentsRaw }, { data: chargeTargetsRaw }] =
    chargeIds.length
      ? await Promise.all([
          supabase
            .schema('finance')
            .from('obligations')
            .select('charge_id, amount, currency')
            .in('charge_id', chargeIds),
          supabase
            .schema('finance')
            .from('payments')
            .select('obligation_id, amount, reverses_payment_id')
            .in('charge_id', chargeIds)
            .limit(5000),
          supabase
            .schema('finance')
            .from('charge_targets')
            .select('charge_id, target_scope_id, amount')
            .in('charge_id', chargeIds),
        ])
      : [
          { data: [] as RawObligationRow[] },
          { data: [] as RawPaymentRow[] },
          { data: [] as RawChargeTargetRow[] },
        ];

  const obligations = (obligationsRaw ?? []) as RawObligationRow[];
  const payments = (paymentsRaw ?? []) as RawPaymentRow[];
  const chargeTargets = (chargeTargetsRaw ?? []) as RawChargeTargetRow[];

  // Expected per charge — sum of obligation amounts.
  const expectedByCharge = new Map<string, number>();
  for (const o of obligations) {
    expectedByCharge.set(o.charge_id, (expectedByCharge.get(o.charge_id) ?? 0) + o.amount);
  }

  // Target count per Group charge — displayed in the list Type cell so
  // "Group · 4 targets" reads at a glance without opening the detail
  // page.
  const targetCountByCharge = new Map<string, number>();
  // `ChargeTargetDraft.amount` is a string because the same shape backs the
  // edit dialog's form inputs, where the value is whatever the operator has
  // typed. The database column is NUMERIC and arrives as a number, so this is
  // a real boundary — convert explicitly rather than letting a cast hide it.
  const targetsByCharge = new Map<string, { targetScopeId: string; amount: string }[]>();
  for (const t of chargeTargets) {
    targetCountByCharge.set(t.charge_id, (targetCountByCharge.get(t.charge_id) ?? 0) + 1);
    const bucket = targetsByCharge.get(t.charge_id) ?? [];
    bucket.push({ targetScopeId: t.target_scope_id, amount: String(t.amount) });
    targetsByCharge.set(t.charge_id, bucket);
  }

  // Collected per charge — sum of settled payment amounts minus reversals.
  // Payments link to obligation which links to charge, so we build an
  // obligation-id → charge-id map first.
  const obligationChargeById = new Map<string, string>();
  {
    // Re-select needs obligation ids we already have via join in list —
    // obligations query returned charge_id but not id (dropped for size).
    // Grab the ids in a lightweight follow-up so the aggregation stays
    // correct without inflating the initial payload.
    const { data: obIds } = chargeIds.length
      ? await supabase
          .schema('finance')
          .from('obligations')
          .select('id, charge_id')
          .in('charge_id', chargeIds)
      : { data: [] as Array<{ id: string; charge_id: string }> };
    for (const row of (obIds ?? []) as Array<{ id: string; charge_id: string }>) {
      obligationChargeById.set(row.id, row.charge_id);
    }
  }

  const collectedByCharge = new Map<string, number>();
  for (const p of payments) {
    if (!p.obligation_id) continue;
    const chargeId = obligationChargeById.get(p.obligation_id);
    if (!chargeId) continue;
    const amt = p.amount;
    const signed = p.reverses_payment_id ? -amt : amt;
    collectedByCharge.set(chargeId, (collectedByCharge.get(chargeId) ?? 0) + signed);
  }

  const visibleScopeIds = Array.from(
    new Set(((treasuriesRaw ?? []) as Array<{ scope_id: string }>).map((t) => t.scope_id)),
  );

  const scopeSet = new Set<string>([...visibleScopeIds, ...chargesData.map((c) => c.scope_id)]);
  const { data: scopeRows } = scopeSet.size
    ? await supabase
        .schema('core')
        .from('scopes')
        .select('id, name, slug, scope_type, chapter_kind, currency_code, parent_scope_id')
        .in('id', Array.from(scopeSet))
    : { data: [] as RawScopeRow[] };
  const scopesData = (scopeRows ?? []) as RawScopeRow[];
  const scopeById = new Map(scopesData.map((s) => [s.id, s]));

  const charges: ChargeRow[] = chargesData.map((c) => {
    const scope = scopeById.get(c.scope_id);
    return {
      id: c.id,
      scopeId: c.scope_id,
      scopeName: scope?.name ?? '(unknown)',
      scopeSlug: scope?.slug ?? '',
      name: c.name,
      description: c.description,
      shape: c.shape,
      baseAmount: c.base_amount ? c.base_amount : null,
      currency: c.currency,
      recurrence: c.recurrence,
      recurrenceInterval: c.recurrence_interval,
      status: c.status,
      activationDate: c.activation_date,
      createdAt: c.created_at,
      targetPartyType: c.target_party_type ?? 'member',
      targetCount: targetCountByCharge.get(c.id) ?? 0,
      chargeTargets: targetsByCharge.get(c.id) ?? [],
      expected: expectedByCharge.get(c.id) ?? 0,
      collected: Math.max(0, collectedByCharge.get(c.id) ?? 0),
    };
  });

  const scopeOptions: ScopeOption[] = scopesData
    .filter(
      (s) =>
        s.scope_type === 'mainstream' ||
        s.scope_type === 'branch' ||
        (s.scope_type === 'chapter' && s.chapter_kind === 'autonomous'),
    )
    .map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      currency: s.currency_code,
      scopeType: s.scope_type,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Target scopes for Group charges — every visible Branch + Chapter +
  // Batch, each able to owe as a body. Batches are global (no parent
  // scope); branches/chapters carry their own name; the extra
  // parentName field surfaces "Chapter · Shesa Buea" grouping.
  const targetScopeSet = new Set<string>();
  {
    const { data: rawTargetScopes } = await supabase
      .schema('core')
      .from('scopes')
      .select('id, name, slug, scope_type, chapter_kind, currency_code, parent_scope_id')
      .in('scope_type', ['branch', 'chapter', 'batch']);
    for (const s of (rawTargetScopes ?? []) as RawScopeRow[]) {
      targetScopeSet.add(s.id);
      scopeById.set(s.id, s);
    }
  }

  const targetScopeOptions: TargetScopeOption[] = Array.from(targetScopeSet)
    .map((id) => scopeById.get(id))
    .filter((s): s is RawScopeRow => !!s)
    .map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      scopeType: s.scope_type as 'branch' | 'chapter' | 'batch',
      parentName: s.parent_scope_id ? (scopeById.get(s.parent_scope_id)?.name ?? null) : null,
    }))
    .sort((a, b) => {
      if (a.scopeType !== b.scopeType) return a.scopeType.localeCompare(b.scopeType);
      return a.name.localeCompare(b.name);
    });

  // Auto-derive the owner scope so the create dialog never has to ask.
  // Group charges always live at Mainstream (they only make sense at
  // the top of the tree); Individual charges default to whatever scope
  // the operator can actually create a charge at — mainstream for a
  // global finance user, their own branch otherwise.
  const active = await activeFinanceScope(user.id);
  const mainstreamOption = scopeOptions.find((s) => s.scopeType === 'mainstream') ?? null;
  const defaultIndividualScopeId =
    active?.scopeIds[0] ?? mainstreamOption?.id ?? scopeOptions[0]?.id ?? '';
  const mainstreamScopeId = mainstreamOption?.id ?? defaultIndividualScopeId;

  // The charge KIND is fixed by who the operator is — never a choice:
  //   • Mainstream Finance charges other bodies (group levies), never
  //     individuals.
  //   • Branch / Chapter Finance charges its own members, never groups.
  // (Spec Part III.) A user with no finance grant can't create at all.
  const chargeKind: 'group' | 'individual' = active?.kind === 'mainstream' ? 'group' : 'individual';

  return (
    <ChargesView
      charges={charges}
      scopeOptions={scopeOptions}
      targetScopeOptions={targetScopeOptions}
      defaultIndividualScopeId={defaultIndividualScopeId}
      mainstreamScopeId={mainstreamScopeId}
      chargeKind={chargeKind}
    />
  );
}
