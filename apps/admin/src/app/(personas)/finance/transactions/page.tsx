import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { activeFinanceScope } from '@/lib/finance/active-scope';
import { getServerClient } from '@/lib/supabase-server';

import { TransactionsView } from './widgets/transactions-view';
import type { ChargeOption, TransactionRow } from './widgets/transactions-types';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Finance — Transactions' };

interface RawTransactionRow {
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

interface RawReconciliationRow {
  readonly payment_id: string;
  readonly reconciled_at: string;
  readonly matched_ref: string | null;
  readonly notes: string | null;
}

interface PayerMetadata {
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
 * Transactions page — every recorded payment across scopes the caller
 * can see (Mainstream Finance is filtered to mainstream-scope rows
 * via `activeFinanceScope`). Cash / bank / MoMo manual entries and
 * gateway-confirmed public payments share the table. Reversals are
 * new immutable rows — never edits.
 */
export default async function TransactionsPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/finance/transactions');

  const active = await activeFinanceScope(user.id);
  const scopeFilterIds = active?.scopeIds ?? [];

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
      .in('scope_id', scopeFilterIds)
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .schema('finance' as never)
      .from('charges' as never)
      .select('id, scope_id, name, shape, currency, status, lifecycle')
      .in('scope_id', scopeFilterIds)
      .eq('status', 'active')
      .order('name'),
    supabase
      .schema('finance' as never)
      .from('receipt_verifications' as never)
      .select('token, payment_id, receipt_number'),
    supabase
      .schema('finance' as never)
      .from('reconciliations' as never)
      .select('payment_id, reconciled_at, matched_ref, notes'),
  ]);

  const paymentsData = (paymentsRaw ?? []) as RawTransactionRow[];
  const chargesData = (chargesRaw ?? []) as RawChargeRow[];
  const receiptsData = (receiptsRaw ?? []) as Array<{
    token: string;
    payment_id: string;
    receipt_number: string;
  }>;
  const reconciliations = (reconciliationsRaw ?? []) as RawReconciliationRow[];

  const receiptByPayment = new Map(receiptsData.map((r) => [r.payment_id, r]));
  const reconciliationByPayment = new Map(reconciliations.map((r) => [r.payment_id, r]));

  const hdrs = await headers();
  const host = hdrs.get('host') ?? 'localhost:3000';
  const proto = host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https';
  const baseUrl = `${proto}://${host}`;

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

  // Charges referenced by payments but no longer active (archived / closed)
  // still need names for the table.
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

  const transactions: TransactionRow[] = paymentsData.map((p) => {
    const scope = scopeById.get(p.scope_id);
    const member = p.payer_member_id ? memberById.get(p.payer_member_id) : null;
    const charge = p.charge_id ? chargeById.get(p.charge_id) : null;
    const meta = (p.metadata ?? {}) as PayerMetadata;
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

  return (
    <TransactionsView transactions={transactions} chargeOptions={chargeOptions} baseUrl={baseUrl} />
  );
}
