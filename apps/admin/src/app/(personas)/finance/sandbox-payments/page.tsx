import { redirect } from 'next/navigation';

import { serverEnv } from '@shesa/config/env.server';

import { activeFinanceScope } from '@/lib/finance/active-scope';
import { getServerClient } from '@/lib/supabase-server';

import { SandboxPaymentsView } from './widgets/sandbox-payments-view';
import type { SandboxPaymentRow } from './widgets/sandbox-payment-types';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Finance — Sandbox payments' };

interface RawSandboxPayment {
  readonly id: string;
  readonly intent_id: string;
  readonly charge_id: string | null;
  readonly scope_id: string;
  readonly amount: number;
  readonly currency: string;
  readonly method: string;
  readonly payer_name: string | null;
  readonly payer_email: string | null;
  readonly payer_phone: string | null;
  readonly provider: string;
  readonly provider_ref: string | null;
  readonly provider_transaction_id: string | null;
  readonly provider_status: string | null;
  readonly gateway_amount: number | null;
  readonly gateway_currency: string | null;
  readonly gateway_fee: number | null;
  readonly gateway_net_amount: number | null;
  readonly raw_payload: Record<string, unknown> | null;
  readonly created_at: string;
}

interface RawNamed {
  readonly id: string;
  readonly name: string;
}

/**
 * Sandbox payments — test settlements from the Tranzak sandbox.
 *
 * Reads `finance.sandbox_payments`, which no other finance page touches.
 * Its RLS gate is the same as `finance.payments` (`treasury.read` or
 * `finance.read` at the scope), so a user who can see real settlements
 * can see the test ones, and nobody else can — the rows carry payer
 * contact details.
 */
export default async function SandboxPaymentsPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/finance/sandbox-payments');

  const active = await activeFinanceScope(user.id);
  const scopeFilterIds = active?.scopeIds ?? [];

  const { data: rawRows } = await supabase
    .schema('finance')
    .from('sandbox_payments')
    .select(
      'id, intent_id, charge_id, scope_id, amount, currency, method, payer_name, payer_email, ' +
        'payer_phone, provider, provider_ref, provider_transaction_id, provider_status, ' +
        'gateway_amount, gateway_currency, gateway_fee, gateway_net_amount, raw_payload, created_at',
    )
    .in('scope_id', scopeFilterIds)
    .order('created_at', { ascending: false })
    .limit(500);

  const rows = (rawRows ?? []) as unknown as RawSandboxPayment[];

  const chargeIds = Array.from(
    new Set(rows.map((r) => r.charge_id).filter((id): id is string => !!id)),
  );
  const scopeIds = Array.from(new Set(rows.map((r) => r.scope_id)));

  const [{ data: chargeRows }, { data: scopeRows }] = await Promise.all([
    chargeIds.length
      ? supabase.schema('finance').from('charges').select('id, name').in('id', chargeIds)
      : Promise.resolve({ data: [] as RawNamed[] }),
    scopeIds.length
      ? supabase.schema('core').from('scopes').select('id, name').in('id', scopeIds)
      : Promise.resolve({ data: [] as RawNamed[] }),
  ]);

  const chargeById = new Map(((chargeRows ?? []) as RawNamed[]).map((c) => [c.id, c.name]));
  const scopeById = new Map(((scopeRows ?? []) as RawNamed[]).map((s) => [s.id, s.name]));

  const payments: SandboxPaymentRow[] = rows.map((r) => ({
    id: r.id,
    intentId: r.intent_id,
    chargeName: (r.charge_id && chargeById.get(r.charge_id)) || 'Unattached',
    scopeName: scopeById.get(r.scope_id) ?? '—',
    amount: Number(r.amount),
    currency: r.currency,
    method: r.method,
    payerLabel: r.payer_name?.trim() || 'Anonymous',
    payerEmail: r.payer_email,
    payerPhone: r.payer_phone,
    provider: r.provider,
    providerRef: r.provider_ref,
    providerTransactionId: r.provider_transaction_id,
    providerStatus: r.provider_status,
    gatewayAmount: r.gateway_amount == null ? null : Number(r.gateway_amount),
    gatewayCurrency: r.gateway_currency,
    gatewayFee: r.gateway_fee == null ? null : Number(r.gateway_fee),
    gatewayNetAmount: r.gateway_net_amount == null ? null : Number(r.gateway_net_amount),
    // Recomputed here rather than stored, so the answer always reflects
    // the row you are looking at. Settlement refuses a mismatch, so a
    // `false` here means something was written before that check existed
    // or by hand.
    reconciles:
      r.gateway_amount != null &&
      Math.abs(Number(r.gateway_amount) - Number(r.amount)) < 0.005 &&
      (r.gateway_currency ?? '').toUpperCase() === r.currency.toUpperCase(),
    rawPayload: r.raw_payload,
    createdAt: r.created_at,
  }));

  return <SandboxPaymentsView payments={payments} mode={serverEnv.TRANZAK_MODE ?? null} />;
}
