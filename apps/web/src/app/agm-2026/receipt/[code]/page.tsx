import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';

import { createServiceRoleClient } from '@shesa/supabase/service-role';

import {
  ReceiptCard,
  type AgmReceiptData,
  type AgmReceiptKind,
} from '@/components/agm/receipt-card';

export const dynamic = 'force-dynamic';

interface Params {
  readonly code: string;
}

interface RawVerification {
  readonly token: string;
  readonly receipt_number: string;
  readonly payment_id: string;
}

interface RawPayment {
  readonly amount: string;
  readonly currency: string;
  readonly method: string;
  readonly metadata: Record<string, unknown> | null;
  readonly created_at: string;
  readonly charge_id: string | null;
}

interface RawCharge {
  readonly id: string;
  readonly name: string;
  readonly shape: string;
}

/**
 * Look up an AGM receipt by its verification token. The token is the
 * short code the visitor sees on the URL; it maps to a specific
 * payment via `finance.receipt_verifications`, which then joins its
 * parent charge to switch the receipt renderer by shape.
 *
 * Uses the service-role client because the receipt page is public
 * (anyone with the token can view) and finance.payments' RLS gates
 * reads to `authenticated`. The route is server-only + gated by the
 * token in the URL, so the elevated read is safe.
 */
async function loadReceipt(token: string): Promise<AgmReceiptData | null> {
  const supabase = createServiceRoleClient();

  const { data: verification } = await supabase
    .schema('finance' as never)
    .from('receipt_verifications' as never)
    .select('token, receipt_number, payment_id')
    .eq('token', token)
    .maybeSingle();
  const v = verification as RawVerification | null;
  if (!v) return null;

  const { data: paymentRaw } = await supabase
    .schema('finance' as never)
    .from('payments' as never)
    .select('amount, currency, method, metadata, created_at, charge_id')
    .eq('id', v.payment_id)
    .maybeSingle();
  const payment = paymentRaw as RawPayment | null;
  if (!payment) return null;

  const { data: chargeRaw } = payment.charge_id
    ? await supabase
        .schema('finance' as never)
        .from('charges' as never)
        .select('id, name, shape')
        .eq('id', payment.charge_id)
        .maybeSingle()
    : { data: null };
  const charge = chargeRaw as RawCharge | null;

  const metadata = (payment.metadata ?? {}) as Record<string, unknown>;
  const payerName =
    (metadata.payer_name as string | undefined) ??
    (metadata.donor_name as string | undefined) ??
    'Anonymous';

  return {
    kind: kindFor(charge),
    chargeName: charge?.name ?? '-',
    receiptNumber: v.receipt_number,
    payerName,
    email:
      (metadata.payer_email as string | undefined) ??
      (metadata.donor_email as string | undefined) ??
      null,
    phone: (metadata.payer_phone as string | undefined) ?? null,
    amount: Number.parseFloat(payment.amount),
    currency: payment.currency,
    method: payment.method,
    createdAt: payment.created_at,
    metadata,
  };
}

function kindFor(charge: RawCharge | null): AgmReceiptKind {
  if (!charge) return 'other';
  if (charge.shape === 'donation') return 'donation';
  if (charge.name === 'Attire') return 'attire';
  if (charge.shape === 'ticketed') return 'ticket';
  return 'other';
}

export async function generateMetadata({
  params,
}: {
  readonly params: Promise<Params>;
}): Promise<Metadata> {
  const { code } = await params;
  return { title: `AGM 2026 Receipt · ${code} · SHESA` };
}

export default async function ReceiptPage({ params }: { readonly params: Promise<Params> }) {
  const { code } = await params;
  const receipt = await loadReceipt(code);
  if (!receipt) notFound();

  const receiptUrl = `https://shesaconnect.com/agm-2026/receipt/${code}`;
  const qrSvg = await QRCode.toString(receiptUrl, {
    type: 'svg',
    margin: 0,
    color: {
      dark: '#111111',
      light: '#00000000',
    },
    errorCorrectionLevel: 'M',
  });

  return (
    <main className="relative min-h-screen bg-white">
      <ReceiptCard receipt={receipt} qrSvg={qrSvg} />
    </main>
  );
}
