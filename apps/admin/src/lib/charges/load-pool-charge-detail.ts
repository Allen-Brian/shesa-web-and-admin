import 'server-only';

import type {
  ChargeSummary,
  PoolPayment,
} from '@/app/(personas)/finance/charges/[id]/widgets/charge-detail-types';
import { getServerClient } from '@/lib/supabase-server';

import {
  aggregateByMethod,
  aggregateBySource,
  buildCumulativeSeries,
  computeTimingStats,
} from './charge-detail-aggregators';
import type { RawPayment } from './charge-detail-raw-types';
import type { PoolChargeDetail } from './charge-detail-types';

/**
 * Load the pool branch of a charge — payments hit the charge
 * directly (goal / open / ticketed / donation flavours) rather than
 * fanning out to per-member obligations. Payer labels resolve
 * against the members table for known members and fall back to a
 * donor label from the payment metadata for public donations.
 *
 * Enrichment for the contribution-detail table (matches the
 * mainstream Transactions view shape): receipt token + number for
 * the receipt column, reconciliation flag, and a "reversed by
 * another payment" flag so the status pill can distinguish a plain
 * cleared payment from one that another row has undone.
 */
export async function loadPoolChargeDetail(
  chargeId: string,
  summary: ChargeSummary,
): Promise<PoolChargeDetail> {
  const supabase = await getServerClient();

  const { data: paymentsRaw } = await supabase
    .schema('finance' as never)
    .from('payments' as never)
    .select(
      'id, obligation_id, charge_id, payer_member_id, amount, currency, method, source, reverses_payment_id, metadata, created_at',
    )
    .eq('charge_id', chargeId)
    .order('created_at', { ascending: false });

  const payments = (paymentsRaw ?? []) as RawPayment[];
  const paymentIds = payments.map((p) => p.id);
  const memberIds = Array.from(
    new Set(payments.map((p) => p.payer_member_id).filter((x): x is string => !!x)),
  );

  const [{ data: memberRows }, { data: receiptRows }, { data: reconRows }] = await Promise.all([
    memberIds.length
      ? supabase.schema('core').from('members').select('id, full_name').in('id', memberIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string }> }),
    paymentIds.length
      ? supabase
          .schema('finance' as never)
          .from('receipt_verifications' as never)
          .select('token, payment_id, receipt_number')
          .in('payment_id', paymentIds)
      : Promise.resolve({
          data: [] as Array<{ token: string; payment_id: string; receipt_number: string }>,
        }),
    paymentIds.length
      ? supabase
          .schema('finance' as never)
          .from('reconciliations' as never)
          .select('payment_id')
          .in('payment_id', paymentIds)
      : Promise.resolve({ data: [] as Array<{ payment_id: string }> }),
  ]);

  const memberById = new Map(
    ((memberRows ?? []) as Array<{ id: string; full_name: string }>).map((m) => [
      m.id,
      m.full_name,
    ]),
  );
  const receiptByPayment = new Map(
    (
      (receiptRows ?? []) as Array<{ token: string; payment_id: string; receipt_number: string }>
    ).map((r) => [r.payment_id, r]),
  );
  const reconciledIds = new Set(
    ((reconRows ?? []) as Array<{ payment_id: string }>).map((r) => r.payment_id),
  );
  const reversedOriginalIds = new Set(
    payments.map((p) => p.reverses_payment_id).filter((x): x is string => !!x),
  );

  let collected = 0;
  for (const p of payments) {
    const amt = parseFloat(p.amount);
    collected += p.reverses_payment_id ? -amt : amt;
  }

  const poolPayments: PoolPayment[] = payments.map((p) => {
    const meta = (p.metadata ?? {}) as { donor_name?: string; public_donation?: boolean };
    const donorLabel = meta.donor_name ?? (meta.public_donation ? 'Anonymous donor' : null);
    const receipt = receiptByPayment.get(p.id);
    return {
      id: p.id,
      payerLabel:
        (p.payer_member_id ? memberById.get(p.payer_member_id) : null) ?? donorLabel ?? '—',
      amount: parseFloat(p.amount),
      currency: p.currency,
      method: p.method,
      source: p.source,
      isReversal: !!p.reverses_payment_id,
      createdAt: p.created_at,
      receiptToken: receipt?.token ?? null,
      receiptNumber: receipt?.receipt_number ?? null,
      reconciled: reconciledIds.has(p.id),
      isReversedOriginal: reversedOriginalIds.has(p.id),
    };
  });

  return {
    summary,
    mode: 'pool',
    collected,
    payerCount: new Set(
      payments.filter((p) => !p.reverses_payment_id).map((p) => p.payer_member_id),
    ).size,
    poolPayments,
    paymentsByMethod: aggregateByMethod(payments),
    paymentsBySource: aggregateBySource(payments),
    paymentTiming: computeTimingStats(payments),
    cumulativeSeries: buildCumulativeSeries(payments),
  };
}
