import { redirect } from 'next/navigation';

import { getServerClient } from '@/lib/supabase-server';

import { ChargesView, type ChargeRow, type ScopeOption } from './widgets/charges-view';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Finance — Charges' };

interface RawChargeRow {
  readonly id: string;
  readonly scope_id: string;
  readonly name: string;
  readonly description: string | null;
  readonly shape: string;
  readonly base_amount: string | null;
  readonly currency: string;
  readonly recurrence: string;
  readonly recurrence_interval: number;
  readonly status: string;
  readonly activation_date: string | null;
  readonly created_at: string;
}

interface RawScopeRow {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly scope_type: string;
  readonly chapter_kind: string | null;
  readonly currency_code: string;
}

interface RawObligationRow {
  readonly charge_id: string;
  readonly amount: string;
  readonly currency: string;
}

interface RawPaymentRow {
  readonly obligation_id: string | null;
  readonly amount: string;
  readonly reverses_payment_id: string | null;
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
 */
export default async function ChargesPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/finance/charges');

  const [{ data: chargesRaw }, { data: treasuriesRaw }] = await Promise.all([
    supabase
      .schema('finance' as never)
      .from('charges' as never)
      .select(
        'id, scope_id, name, description, shape, base_amount, currency, recurrence, recurrence_interval, status, activation_date, created_at',
      )
      .in('shape', ['charge', 'fixed'])
      .order('created_at', { ascending: false }),
    supabase
      .schema('finance' as never)
      .from('treasury_balances' as never)
      .select('scope_id'),
  ]);

  const chargesData = (chargesRaw ?? []) as RawChargeRow[];
  const chargeIds = chargesData.map((c) => c.id);

  const [{ data: obligationsRaw }, { data: paymentsRaw }] = chargeIds.length
    ? await Promise.all([
        supabase
          .schema('finance' as never)
          .from('obligations' as never)
          .select('charge_id, amount, currency')
          .in('charge_id', chargeIds),
        supabase
          .schema('finance' as never)
          .from('payments' as never)
          .select('obligation_id, amount, reverses_payment_id')
          .in('charge_id', chargeIds)
          .limit(5000),
      ])
    : [{ data: [] as RawObligationRow[] }, { data: [] as RawPaymentRow[] }];

  const obligations = (obligationsRaw ?? []) as RawObligationRow[];
  const payments = (paymentsRaw ?? []) as RawPaymentRow[];

  // Expected per charge — sum of obligation amounts.
  const expectedByCharge = new Map<string, number>();
  for (const o of obligations) {
    expectedByCharge.set(
      o.charge_id,
      (expectedByCharge.get(o.charge_id) ?? 0) + parseFloat(o.amount),
    );
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
          .schema('finance' as never)
          .from('obligations' as never)
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
    const amt = parseFloat(p.amount);
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
        .select('id, name, slug, scope_type, chapter_kind, currency_code')
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
      baseAmount: c.base_amount ? parseFloat(c.base_amount) : null,
      currency: c.currency,
      recurrence: c.recurrence,
      recurrenceInterval: c.recurrence_interval,
      status: c.status,
      activationDate: c.activation_date,
      createdAt: c.created_at,
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

  return <ChargesView charges={charges} scopeOptions={scopeOptions} />;
}
