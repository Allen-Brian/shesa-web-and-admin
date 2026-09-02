import { ClipboardList } from 'lucide-react';

import { getServerClient } from '@/lib/supabase-server';

import { ExcoObligationsView, type ObligationRow } from './widgets/obligations-view';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Admin — Obligations' };

interface RawObligation {
  readonly id: string;
  readonly charge_id: string;
  readonly party_id: string;
  readonly scope_id: string;
  readonly amount: number;
  readonly currency: string;
  readonly status: string;
  readonly period_start: string | null;
  readonly period_end: string | null;
  readonly created_at: string;
}

interface RawCharge {
  readonly id: string;
  readonly name: string;
  readonly scope_id: string;
  readonly recurrence: string;
}

interface RawScope {
  readonly id: string;
  readonly name: string;
  readonly scope_type: string;
}

interface RawPayment {
  readonly obligation_id: string | null;
  readonly amount: number;
  readonly reverses_payment_id: string | null;
}

/**
 * Obligations — the branch/chapter's read-only view of charges the
 * Mainstream has assigned to their body (not per-member). Data source:
 * `finance.obligations` filtered to `party_type='branch'`. RLS scopes
 * rows to what the caller can see.
 *
 * Layout matches the other exco finance-view pages: KPI strip, then
 * EntityTablePanel with search + status filter, then the table.
 */
export default async function ExcoObligationsPage() {
  const supabase = await getServerClient();

  const { data: obligationsRaw } = await supabase
    .schema('finance')
    .from('obligations')
    .select(
      'id, charge_id, party_id, scope_id, amount, currency, status, period_start, period_end, created_at',
    )
    .eq('party_type', 'branch')
    .order('period_start', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(500);

  const raw = (obligationsRaw ?? []) as RawObligation[];
  const chargeIds = Array.from(new Set(raw.map((o) => o.charge_id)));
  const partyIds = Array.from(new Set(raw.map((o) => o.party_id)));

  // Payments per obligation — needed to show paid / outstanding + the
  // "record payment" dialog's remaining-owed default. Reversals are
  // subtracted so the number reflects the net settled amount.
  const { data: paymentsRaw } = raw.length
    ? await supabase
        .schema('finance')
        .from('payments')
        .select('obligation_id, amount, reverses_payment_id')
        .in(
          'obligation_id',
          raw.map((o) => o.id),
        )
    : { data: [] as RawPayment[] };
  const paidByObligation = new Map<string, number>();
  for (const p of (paymentsRaw ?? []) as RawPayment[]) {
    if (!p.obligation_id) continue;
    const amt = p.amount;
    const signed = p.reverses_payment_id ? -amt : amt;
    paidByObligation.set(p.obligation_id, (paidByObligation.get(p.obligation_id) ?? 0) + signed);
  }

  const { data: chargeRows } = chargeIds.length
    ? await supabase
        .schema('finance')
        .from('charges')
        .select('id, name, scope_id, recurrence')
        .in('id', chargeIds)
    : { data: [] as RawCharge[] };
  const charges = (chargeRows ?? []) as RawCharge[];
  const chargeScopeIds = new Set<string>(charges.map((c) => c.scope_id));
  const scopeIds = Array.from(new Set([...partyIds, ...chargeScopeIds]));

  const { data: scopeRows } = scopeIds.length
    ? await supabase.schema('core').from('scopes').select('id, name, scope_type').in('id', scopeIds)
    : { data: [] as RawScope[] };
  const chargeById = new Map(charges.map((c) => [c.id, c]));
  const scopeById = new Map(((scopeRows ?? []) as RawScope[]).map((s) => [s.id, s]));

  const rows: ObligationRow[] = raw.map((o) => {
    const charge = chargeById.get(o.charge_id);
    const amount = o.amount;
    const paid = Math.max(0, paidByObligation.get(o.id) ?? 0);
    return {
      id: o.id,
      chargeId: o.charge_id,
      scopeId: o.scope_id,
      chargeName: charge?.name ?? '—',
      imposerName: charge ? (scopeById.get(charge.scope_id)?.name ?? 'Mainstream') : 'Mainstream',
      recurrence: charge?.recurrence ?? '',
      branchName: scopeById.get(o.party_id)?.name ?? '—',
      periodStart: o.period_start,
      periodEnd: o.period_end,
      amount,
      paid,
      outstanding: Math.max(0, amount - paid),
      currency: o.currency,
      status: o.status,
    };
  });

  return (
    <section className="flex flex-1 flex-col gap-5">
      <header className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Finance
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ClipboardList className="h-6 w-6" />
          Obligations
        </h1>
        <p className="text-sm text-muted-foreground">
          What your branch owes the Mainstream — charges the Mainstream has assigned to you as a
          body. Click any row to record a payment against it.
        </p>
      </header>

      <ExcoObligationsView rows={rows} />
    </section>
  );
}
