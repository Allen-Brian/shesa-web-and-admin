import { redirect } from 'next/navigation';

import { getServerClient } from '@/lib/supabase-server';

import { PaymentsView, type ChargeOption, type PaymentRow } from './widgets/payments-view';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Finance — Payments' };

interface RawPaymentRow {
  readonly id: string;
  readonly obligation_id: string | null;
  readonly charge_id: string | null;
  readonly scope_id: string;
  readonly payer_member_id: string | null;
  readonly amount: string;
  readonly currency: string;
  readonly method: string;
  readonly source: string;
  readonly reverses_payment_id: string | null;
  readonly external_ref: string | null;
  readonly metadata: Record<string, unknown> | null;
  readonly created_at: string;
}

interface RawChargeRow {
  readonly id: string;
  readonly scope_id: string;
  readonly name: string;
  readonly shape: string;
  readonly currency: string;
  readonly status: string;
  readonly lifecycle: string | null;
}

interface RawScopeRow {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
}

interface RawMemberRow {
  readonly id: string;
  readonly full_name: string;
}

/**
 * Payments page — every recorded payment across scopes the caller can see.
 *
 * The record-manual entry lets Finance enter a cash / bank / MoMo
 * payment against a charge (contribution / donation / goal). Reversals
 * insert a new row that cancels an original out — same table, same
 * flow.
 */
export default async function PaymentsPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/finance/payments');

  const [{ data: paymentsRaw }, { data: chargesRaw }] = await Promise.all([
    supabase
      .schema('finance' as never)
      .from('payments' as never)
      .select(
        'id, obligation_id, charge_id, scope_id, payer_member_id, amount, currency, method, source, reverses_payment_id, external_ref, metadata, created_at',
      )
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .schema('finance' as never)
      .from('charges' as never)
      .select('id, scope_id, name, shape, currency, status, lifecycle')
      .eq('status', 'active')
      .order('name'),
  ]);

  const paymentsData = (paymentsRaw ?? []) as RawPaymentRow[];
  const chargesData = (chargesRaw ?? []) as RawChargeRow[];

  const scopeIds = Array.from(
    new Set([...paymentsData.map((p) => p.scope_id), ...chargesData.map((c) => c.scope_id)]),
  );
  const memberIds = Array.from(
    new Set(paymentsData.map((p) => p.payer_member_id).filter((id): id is string => !!id)),
  );

  const [{ data: scopeRows }, { data: memberRows }] = await Promise.all([
    scopeIds.length
      ? supabase.schema('core').from('scopes').select('id, name, slug').in('id', scopeIds)
      : Promise.resolve({ data: [] as RawScopeRow[] }),
    memberIds.length
      ? supabase.schema('core').from('members').select('id, full_name').in('id', memberIds)
      : Promise.resolve({ data: [] as RawMemberRow[] }),
  ]);
  const scopeById = new Map(((scopeRows ?? []) as RawScopeRow[]).map((s) => [s.id, s]));
  const memberById = new Map(((memberRows ?? []) as RawMemberRow[]).map((m) => [m.id, m]));
  const chargeById = new Map(chargesData.map((c) => [c.id, c]));

  // Charges referenced by payments but no longer active (e.g. archived
  // or closed) still need names for the payments table.
  const staleChargeIds = Array.from(
    new Set(
      paymentsData
        .map((p) => p.charge_id)
        .filter((id): id is string => !!id && !chargeById.has(id)),
    ),
  );
  const { data: staleChargeRows } = staleChargeIds.length
    ? await supabase
        .schema('finance' as never)
        .from('charges' as never)
        .select('id, scope_id, name, shape, currency, status, lifecycle')
        .in('id', staleChargeIds)
    : { data: [] as RawChargeRow[] };
  for (const c of (staleChargeRows ?? []) as RawChargeRow[]) chargeById.set(c.id, c);

  const payments: PaymentRow[] = paymentsData.map((p) => {
    const scope = scopeById.get(p.scope_id);
    const member = p.payer_member_id ? memberById.get(p.payer_member_id) : null;
    const charge = p.charge_id ? chargeById.get(p.charge_id) : null;
    const meta = (p.metadata ?? {}) as { donor_name?: string; public_donation?: boolean };
    const donorLabel = meta.donor_name ?? (meta.public_donation ? 'Anonymous donor' : null);
    return {
      id: p.id,
      obligationId: p.obligation_id,
      chargeId: p.charge_id,
      chargeName: charge?.name ?? '—',
      chargeShape: charge?.shape ?? null,
      scopeName: scope?.name ?? '—',
      payerLabel: member?.full_name ?? donorLabel ?? '—',
      amount: parseFloat(p.amount),
      currency: p.currency,
      method: p.method,
      source: p.source,
      reversesPaymentId: p.reverses_payment_id,
      externalRef: p.external_ref,
      createdAt: p.created_at,
    };
  });

  const chargeOptions: ChargeOption[] = chargesData
    .filter((c) => c.status === 'active' && (c.lifecycle === null || c.lifecycle === 'open'))
    .map((c) => {
      const scope = scopeById.get(c.scope_id);
      return {
        id: c.id,
        name: c.name,
        shape: c.shape,
        scopeId: c.scope_id,
        scopeName: scope?.name ?? '—',
        currency: c.currency,
      };
    });

  return <PaymentsView payments={payments} chargeOptions={chargeOptions} />;
}
