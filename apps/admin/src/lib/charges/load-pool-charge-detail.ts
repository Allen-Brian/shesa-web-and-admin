import 'server-only';

import type {
  ChargeSummary,
  PoolPayment,
} from '@/app/(personas)/finance/charges/[id]/widgets/charge-detail-types';
import { loadMemberContacts } from '@/lib/finance/member-contacts';
import { getServerClient } from '@/lib/supabase-server';

import {
  aggregateByMethod,
  aggregateBySource,
  buildCumulativeSeries,
  computeTimingStats,
} from './charge-detail-aggregators';
import type { RawPayment } from './charge-detail-raw-types';
import type { PoolChargeDetail } from './charge-detail-types';

interface ReconRow {
  readonly payment_id: string;
  readonly reconciled_at: string | null;
  readonly matched_ref: string | null;
  readonly notes: string | null;
}

/**
 * Attire sizes for payments whose metadata does not carry one.
 *
 * The settlement path writes `metadata.attire_size` now, but orders
 * placed before it did carry the size only in the text of the gateway
 * description. It has always been recorded properly in
 * `cms.agm_registrations`, which joins to a payment on the
 * `agm_reference` both sides keep.
 *
 * Read-time rather than a backfill migration, because `finance.payments`
 * is append-only by trigger — every UPDATE and DELETE is blocked — and
 * reaching past that guard to annotate old rows would cost more than
 * the annotation is worth. A join gets the same answer, costs one
 * query, covers every historical order, and keeps the ledger's
 * invariant exactly as it is.
 *
 * Reads as the signed-in user: the RLS policy on that table admits
 * `treasury.read` / `finance.read`, which is who is looking at this
 * page. A viewer without it simply gets no sizes rather than an error.
 */
async function loadAttireSizes(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  payments: readonly RawPayment[],
): Promise<Map<string, string>> {
  const references = Array.from(
    new Set(
      payments
        .map((p) => {
          const meta = (p.metadata ?? {}) as { attire_size?: string; agm_reference?: string };
          return meta.attire_size ? null : (meta.agm_reference ?? null);
        })
        .filter((r): r is string => !!r),
    ),
  );
  if (references.length === 0) return new Map();

  const { data } = await supabase
    .schema('cms')
    .from('agm_registrations')
    .select('reference, attire_size')
    .eq('kind', 'attire')
    .in('reference', references);

  return new Map(
    ((data ?? []) as Array<{ reference: string; attire_size: string | null }>)
      .filter((r) => !!r.attire_size)
      .map((r) => [r.reference, r.attire_size as string]),
  );
}

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
    .schema('finance')
    .from('payments')
    .select(
      'id, obligation_id, charge_id, payer_member_id, amount, currency, method, source, reverses_payment_id, external_ref, metadata, created_at',
    )
    .eq('charge_id', chargeId)
    .order('created_at', { ascending: false });

  const payments = (paymentsRaw ?? []) as RawPayment[];
  const paymentIds = payments.map((p) => p.id);
  const memberIds = Array.from(
    new Set(payments.map((p) => p.payer_member_id).filter((x): x is string => !!x)),
  );

  const [memberById, { data: receiptRows }, { data: reconRows }] = await Promise.all([
    loadMemberContacts(supabase, memberIds),
    paymentIds.length
      ? supabase
          .schema('finance')
          .from('receipt_verifications')
          .select('token, payment_id, receipt_number')
          .in('payment_id', paymentIds)
      : Promise.resolve({
          data: [] as Array<{ token: string; payment_id: string; receipt_number: string }>,
        }),
    paymentIds.length
      ? supabase
          .schema('finance')
          .from('reconciliations')
          .select('payment_id, reconciled_at, matched_ref, notes')
          .in('payment_id', paymentIds)
      : Promise.resolve({ data: [] as ReconRow[] }),
  ]);

  const receiptByPayment = new Map(
    (
      (receiptRows ?? []) as Array<{ token: string; payment_id: string; receipt_number: string }>
    ).map((r) => [r.payment_id, r]),
  );
  const reconByPayment = new Map(((reconRows ?? []) as ReconRow[]).map((r) => [r.payment_id, r]));
  const reversedOriginalIds = new Set(
    payments.map((p) => p.reverses_payment_id).filter((x): x is string => !!x),
  );

  let collected = 0;
  for (const p of payments) {
    const amt = p.amount;
    collected += p.reverses_payment_id ? -amt : amt;
  }

  const sizeByReference = await loadAttireSizes(supabase, payments);

  const poolPayments: PoolPayment[] = payments.map((p) => {
    const meta = (p.metadata ?? {}) as {
      donor_name?: string;
      payer_name?: string;
      donor_email?: string;
      payer_email?: string;
      payer_phone?: string;
      payer_location?: string;
      note?: string;
      quantity?: number;
      attire_size?: string;
      agm_reference?: string;
      public_donation?: boolean;
      public_ticket_purchase?: boolean;
    };
    // Anonymous fallbacks for the two public paths: donations use
    // `donor_name`, ticket/attire purchases use `payer_name`. Ticket
    // purchases were rendering as "—" because the fallback only
    // checked donor_name.
    const anonName = meta.donor_name ?? meta.payer_name ?? null;
    const fallbackLabel =
      anonName ??
      (meta.public_donation
        ? 'Anonymous donor'
        : meta.public_ticket_purchase
          ? 'Anonymous buyer'
          : null);
    const receipt = receiptByPayment.get(p.id);
    const recon = reconByPayment.get(p.id);
    const isMember = !!p.payer_member_id;
    const member = p.payer_member_id ? memberById.get(p.payer_member_id) : null;
    return {
      id: p.id,
      payerLabel: member?.fullName ?? fallbackLabel ?? '—',
      amount: p.amount,
      currency: p.currency,
      method: p.method,
      source: p.source,
      isReversal: !!p.reverses_payment_id,
      createdAt: p.created_at,
      receiptToken: receipt?.token ?? null,
      receiptNumber: receipt?.receipt_number ?? null,
      reconciled: !!recon,
      isReversedOriginal: reversedOriginalIds.has(p.id),
      payerEmail: meta.donor_email ?? meta.payer_email ?? member?.email ?? null,
      payerPhone: meta.payer_phone ?? member?.phone ?? null,
      payerLocation: meta.payer_location ?? null,
      payerBatch: member?.batchName ?? null,
      payerMemberCode: member?.memberCode ?? null,
      isAnonymous: !isMember && !!(meta.public_donation || meta.public_ticket_purchase || anonName),
      memo: meta.note ?? null,
      externalRef: p.external_ref ?? null,
      reconciledAt: recon?.reconciled_at ?? null,
      reconciliationMatchedRef: recon?.matched_ref ?? null,
      reconciliationNotes: recon?.notes ?? null,
      quantity: typeof meta.quantity === 'number' ? meta.quantity : null,
      attireSize:
        meta.attire_size ??
        (meta.agm_reference ? (sizeByReference.get(meta.agm_reference) ?? null) : null),
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
