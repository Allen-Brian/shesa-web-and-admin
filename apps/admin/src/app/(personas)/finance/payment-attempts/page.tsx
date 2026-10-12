import { redirect } from 'next/navigation';

import { activeFinanceScope } from '@/lib/finance/active-scope';
import { getServerClient } from '@/lib/supabase-server';

import { PaymentAttemptsView } from './widgets/payment-attempts-view';
import type { PaymentAttemptRow } from './widgets/payment-attempt-types';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Finance — Payment attempts' };

interface RawIntent {
  readonly id: string;
  readonly charge_id: string | null;
  readonly scope_id: string;
  readonly payer_member_id: string | null;
  readonly amount: number;
  readonly currency: string;
  readonly method: string | null;
  readonly status: string;
  readonly mode: string;
  readonly quantity: number | null;
  readonly note: string | null;
  readonly payer_name: string | null;
  readonly payer_email: string | null;
  readonly payer_phone: string | null;
  readonly failure_reason: string | null;
  readonly resulting_payment_id: string | null;
  readonly sandbox_payment_id: string | null;
  readonly metadata: Record<string, unknown> | null;
  readonly created_at: string;
  readonly updated_at: string;
}

interface RawNamed {
  readonly id: string;
  readonly name: string;
}

interface RawMember {
  readonly id: string;
  readonly full_name: string;
}

/**
 * Payment attempts — `finance.payment_intents` across the scopes the
 * caller can see.
 *
 * Kept off the Transactions page deliberately. That page is the books:
 * money that moved. An attempt is somebody trying, and most of what is
 * worth seeing here are the ones that did not work. Putting them in the
 * same table would mean every total had to remember to exclude them.
 */
export default async function PaymentAttemptsPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/finance/payment-attempts');

  const active = await activeFinanceScope(user.id);
  const scopeFilterIds = active?.scopeIds ?? [];

  const { data: rawRows } = await supabase
    .schema('finance')
    .from('payment_intents')
    .select(
      'id, charge_id, scope_id, payer_member_id, amount, currency, method, status, mode, ' +
        'quantity, note, payer_name, payer_email, payer_phone, failure_reason, ' +
        'resulting_payment_id, sandbox_payment_id, metadata, created_at, updated_at',
    )
    .in('scope_id', scopeFilterIds)
    .order('created_at', { ascending: false })
    .limit(500);

  const rows = (rawRows ?? []) as unknown as RawIntent[];

  const chargeIds = Array.from(
    new Set(rows.map((r) => r.charge_id).filter((id): id is string => !!id)),
  );
  const scopeIds = Array.from(new Set(rows.map((r) => r.scope_id)));
  const memberIds = Array.from(
    new Set(rows.map((r) => r.payer_member_id).filter((id): id is string => !!id)),
  );

  const [{ data: chargeRows }, { data: scopeRows }, { data: memberRows }] = await Promise.all([
    chargeIds.length
      ? supabase.schema('finance').from('charges').select('id, name').in('id', chargeIds)
      : Promise.resolve({ data: [] as RawNamed[] }),
    scopeIds.length
      ? supabase.schema('core').from('scopes').select('id, name').in('id', scopeIds)
      : Promise.resolve({ data: [] as RawNamed[] }),
    memberIds.length
      ? supabase.schema('core').from('members').select('id, full_name').in('id', memberIds)
      : Promise.resolve({ data: [] as RawMember[] }),
  ]);

  const chargeById = new Map(((chargeRows ?? []) as RawNamed[]).map((c) => [c.id, c.name]));
  const scopeById = new Map(((scopeRows ?? []) as RawNamed[]).map((s) => [s.id, s.name]));
  const memberById = new Map(((memberRows ?? []) as RawMember[]).map((m) => [m.id, m.full_name]));

  const attempts: PaymentAttemptRow[] = rows.map((r) => {
    const meta = (r.metadata ?? {}) as Record<string, unknown>;
    const member = r.payer_member_id ? memberById.get(r.payer_member_id) : null;

    return {
      id: r.id,
      status: r.status,
      mode: r.mode,
      chargeName: (r.charge_id && chargeById.get(r.charge_id)) || 'Unattached',
      scopeName: scopeById.get(r.scope_id) ?? '—',
      amount: Number(r.amount),
      currency: r.currency,
      method: r.method,
      quantity: r.quantity,
      // A member's own name beats whatever they typed into the form.
      payerLabel: member ?? r.payer_name?.trim() ?? 'Anonymous',
      payerEmail: r.payer_email,
      payerPhone: r.payer_phone,
      isMember: !!member,
      note: r.note,
      provider: typeof meta.provider === 'string' ? meta.provider : null,
      gatewayRef: typeof meta.provider_ref === 'string' ? meta.provider_ref : null,
      failureReason: r.failure_reason,
      settlementId: r.resulting_payment_id ?? r.sandbox_payment_id ?? null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  });

  return <PaymentAttemptsView attempts={attempts} />;
}
