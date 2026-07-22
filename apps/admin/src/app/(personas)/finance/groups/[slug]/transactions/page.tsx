import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import { loadGroupBySlug } from '@/lib/finance/groups/load-group';
import { getServerClient } from '@/lib/supabase-server';

import { TransactionsView } from '../../../transactions/widgets/transactions-view';
import type {
  ChargeOption,
  TransactionRow,
} from '../../../transactions/widgets/transactions-types';

export const dynamic = 'force-dynamic';

interface Props {
  readonly params: Promise<{ slug: string }>;
}

interface RawPayment {
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

interface RawCharge {
  readonly id: string;
  readonly scope_id: string;
  readonly name: string;
  readonly shape: string;
  readonly currency: string;
  readonly status: string;
  readonly lifecycle: string | null;
}

interface PayerMeta {
  readonly donor_name?: string;
  readonly donor_email?: string;
  readonly note?: string;
  readonly public_donation?: boolean;
  readonly payer_name?: string;
  readonly payer_email?: string;
  readonly payer_phone?: string;
  readonly payer_location?: string;
  readonly public_ticket_purchase?: boolean;
}

/**
 * Group transactions — same view widget as the mainstream page but
 * filtered to `group_id = <this group>`. Reuses TransactionsView so
 * reconciliation, mass actions, filters, and receipt preview all
 * behave identically inside the group lens.
 */
export default async function GroupTransactionsPage({ params }: Props) {
  const { slug } = await params;
  const group = await loadGroupBySlug(slug);
  if (!group) notFound();

  const supabase = await getServerClient();
  const [
    { data: paymentsRaw },
    { data: chargesRaw },
    { data: receiptsRaw },
    { data: reconciliationsRaw },
  ] = await Promise.all([
    supabase
      .schema('finance' as never)
      .from('payments' as never)
      .select(
        'id, obligation_id, charge_id, scope_id, payer_member_id, amount, currency, method, source, reverses_payment_id, external_ref, metadata, created_at',
      )
      .eq('group_id', group.id)
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .schema('finance' as never)
      .from('charges' as never)
      .select('id, scope_id, name, shape, currency, status, lifecycle')
      .eq('group_id', group.id),
    supabase
      .schema('finance' as never)
      .from('receipt_verifications' as never)
      .select('token, payment_id, receipt_number'),
    supabase
      .schema('finance' as never)
      .from('reconciliations' as never)
      .select('payment_id, reconciled_at, matched_ref, notes'),
  ]);

  const payments = (paymentsRaw ?? []) as RawPayment[];
  const charges = (chargesRaw ?? []) as RawCharge[];
  const receiptByPayment = new Map(
    (
      (receiptsRaw ?? []) as Array<{
        token: string;
        payment_id: string;
        receipt_number: string;
      }>
    ).map((r) => [r.payment_id, r]),
  );
  const reconciliationByPayment = new Map(
    (
      (reconciliationsRaw ?? []) as Array<{
        payment_id: string;
        reconciled_at: string;
        matched_ref: string | null;
        notes: string | null;
      }>
    ).map((r) => [r.payment_id, r]),
  );

  const hdrs = await headers();
  const host = hdrs.get('host') ?? 'localhost:3000';
  const proto = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https';
  const baseUrl = `${proto}://${host}`;

  const scopeIds = Array.from(
    new Set([...payments.map((p) => p.scope_id), ...charges.map((c) => c.scope_id)]),
  );
  const memberIds = Array.from(
    new Set(payments.map((p) => p.payer_member_id).filter((id): id is string => !!id)),
  );

  const [{ data: scopeRows }, { data: memberRows }] = await Promise.all([
    scopeIds.length
      ? supabase.schema('core').from('scopes').select('id, name, slug').in('id', scopeIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string; slug: string }> }),
    memberIds.length
      ? supabase.schema('core').from('members').select('id, full_name').in('id', memberIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string }> }),
  ]);
  const scopeById = new Map(
    ((scopeRows ?? []) as Array<{ id: string; name: string; slug: string }>).map((s) => [s.id, s]),
  );
  const memberById = new Map(
    ((memberRows ?? []) as Array<{ id: string; full_name: string }>).map((m) => [m.id, m]),
  );
  const chargeById = new Map(charges.map((c) => [c.id, c]));

  const transactions: TransactionRow[] = payments.map((p) => {
    const scope = scopeById.get(p.scope_id);
    const member = p.payer_member_id ? memberById.get(p.payer_member_id) : null;
    const charge = p.charge_id ? chargeById.get(p.charge_id) : null;
    const meta = (p.metadata ?? {}) as PayerMeta;
    const anonName = meta.donor_name ?? meta.payer_name ?? null;
    const isAnon = !member && !!(meta.public_donation || meta.public_ticket_purchase || anonName);
    const donorLabel =
      anonName ??
      (meta.public_donation
        ? 'Anonymous donor'
        : meta.public_ticket_purchase
          ? 'Anonymous buyer'
          : null);
    const receipt = receiptByPayment.get(p.id);
    const reconciliation = reconciliationByPayment.get(p.id);
    return {
      id: p.id,
      obligationId: p.obligation_id,
      chargeId: p.charge_id,
      chargeName: charge?.name ?? '—',
      chargeShape: charge?.shape ?? null,
      scopeName: scope?.name ?? '—',
      payerLabel: member?.full_name ?? donorLabel ?? '—',
      payerEmail: meta.donor_email ?? meta.payer_email ?? null,
      payerPhone: meta.payer_phone ?? null,
      payerLocation: meta.payer_location ?? null,
      isAnonymousPayer: isAnon,
      amount: parseFloat(p.amount),
      currency: p.currency,
      method: p.method,
      source: p.source,
      reversesPaymentId: p.reverses_payment_id,
      externalRef: p.external_ref,
      memo: meta.note ?? null,
      createdAt: p.created_at,
      receiptToken: receipt?.token ?? null,
      receiptNumber: receipt?.receipt_number ?? null,
      reconciled: !!reconciliation,
      reconciledAt: reconciliation?.reconciled_at ?? null,
      reconciliationMatchedRef: reconciliation?.matched_ref ?? null,
      reconciliationNotes: reconciliation?.notes ?? null,
    };
  });

  const chargeOptions: ChargeOption[] = charges
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

  return (
    <TransactionsView transactions={transactions} chargeOptions={chargeOptions} baseUrl={baseUrl} />
  );
}
