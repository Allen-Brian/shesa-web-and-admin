import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import QRCode from 'qrcode';

import { createServiceRoleClient } from '@shesa/supabase/service-role';

import {
  PaymentStatus,
  settleGatewayRequest,
  settlePaymentIntent,
  type SettleResponse,
} from './payment-status';
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
  readonly amount: number;
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
/**
 * Sandbox settlements are addressed by `sandbox-{id}` rather than a
 * verification token, because they never get one: `finance.sandbox_payments`
 * carries none of `finance.payments`' triggers, so nothing mints a receipt
 * for a test payment. That is deliberate — `finance.verify_receipt` must
 * never validate a receipt for money nobody collected, which is exactly
 * what SEC-01 was.
 *
 * They still render the real receipt, because seeing what a payer will see
 * is the entire point of a test run. The `isTest` flag is what stamps it.
 */
const SANDBOX_PREFIX = 'sandbox-';

/**
 * A receipt verification token is a UUID with the dashes stripped — 32 hex
 * characters. An intent id is a plain UUID, 36 characters with dashes. So
 * the two can share this route without ambiguity, which is what lets the
 * receipt page double as the gateway's return URL.
 */
const INTENT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadSandboxReceipt(id: string): Promise<AgmReceiptData | null> {
  const supabase = createServiceRoleClient();

  const { data: raw } = await supabase
    .schema('finance')
    .from('sandbox_payments')
    .select(
      'id, amount, currency, method, charge_id, payer_name, payer_email, payer_phone, ' +
        'provider_ref, provider_status, created_at',
    )
    .eq('id', id)
    .maybeSingle();

  const row = raw as {
    id: string;
    amount: number;
    currency: string;
    method: string;
    charge_id: string | null;
    payer_name: string | null;
    payer_email: string | null;
    payer_phone: string | null;
    provider_ref: string | null;
    provider_status: string | null;
    created_at: string;
  } | null;
  if (!row) return null;

  const { data: chargeRaw } = row.charge_id
    ? await supabase
        .schema('finance')
        .from('charges')
        .select('id, name, shape')
        .eq('id', row.charge_id)
        .maybeSingle()
    : { data: null };
  const charge = chargeRaw as RawCharge | null;

  return {
    kind: kindFor(charge),
    chargeName: charge?.name ?? '-',
    // Prefixed so it can never be mistaken for, or typed in as, a real
    // receipt number.
    receiptNumber: `TEST-${row.provider_ref ?? row.id.slice(0, 8).toUpperCase()}`,
    payerName: row.payer_name?.trim() || 'Anonymous',
    email: row.payer_email,
    phone: row.payer_phone,
    amount: row.amount,
    currency: row.currency,
    method: row.method,
    createdAt: row.created_at,
    isTest: true,
    metadata: { gateway_status: row.provider_status, provider_ref: row.provider_ref },
  };
}

async function loadReceipt(token: string): Promise<AgmReceiptData | null> {
  const supabase = createServiceRoleClient();

  const { data: verification } = await supabase
    .schema('finance')
    .from('receipt_verifications')
    .select('token, receipt_number, payment_id')
    .eq('token', token)
    .maybeSingle();
  const v = verification as RawVerification | null;
  if (!v) return null;

  const { data: paymentRaw } = await supabase
    .schema('finance')
    .from('payments')
    .select('amount, currency, method, metadata, created_at, charge_id')
    .eq('id', v.payment_id)
    .maybeSingle();
  const payment = paymentRaw as RawPayment | null;
  if (!payment) return null;

  const { data: chargeRaw } = payment.charge_id
    ? await supabase
        .schema('finance')
        .from('charges')
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
    // PostgREST serialises NUMERIC as a JSON number, so this is already
    // numeric. The parseFloat worked only because JS coerces on the way in.
    amount: payment.amount,
    currency: payment.currency,
    method: payment.method,
    createdAt: payment.created_at,
    isTest: false,
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
  return {
    title: `Receipt · ${code} · SHESA`,
    // Receipts name a payer and an amount. Nothing here belongs in a
    // search index, and the intent form of this URL settles a payment.
    robots: { index: false, follow: false },
  };
}

/**
 * The receipt, and the place the gateway returns payers to.
 *
 * Three kinds of code land here:
 *
 *   {32 hex}      a receipt verification token — the durable, shareable
 *                 address of a receipt, and what its QR encodes.
 *   sandbox-{id}  a test settlement. Renders the same document with a
 *                 watermark; no token exists because sandbox settlements
 *                 deliberately mint none.
 *   {uuid}        a payment intent, fresh back from Tranzak. The payment
 *                 is settled here and then its receipt is rendered.
 *
 * That last case is why this page is the gateway's `returnUrl`. Sending
 * the payer straight to a receipt token cannot work — the token is minted
 * by a trigger that only fires once the payment row exists, which may be
 * after the browser gets back. Settling on arrival closes that gap, and a
 * payment that did not succeed gets an explanation instead of a receipt.
 */
export default async function ReceiptPage({
  params,
  searchParams,
}: {
  readonly params: Promise<Params>;
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { code } = await params;
  const query = await searchParams;

  // Tranzak appends its own `requestId` to whichever exit it picks, and on
  // a real payment it picked one we had not planned for. Honouring the
  // parameter means the page still works if the gateway sends the payer
  // somewhere unexpected, as long as it lands here.
  const gatewayRequestId = typeof query.requestId === 'string' ? query.requestId : null;

  let receipt: AgmReceiptData | null = null;
  let settleResult: SettleResponse | null = null;
  let displayCode = code;

  if (code.startsWith(SANDBOX_PREFIX)) {
    receipt = await loadSandboxReceipt(code.slice(SANDBOX_PREFIX.length));
  } else if (INTENT_ID.test(code) || gatewayRequestId) {
    settleResult = INTENT_ID.test(code)
      ? await settlePaymentIntent(code)
      : await settleGatewayRequest(gatewayRequestId!);

    if (settleResult?.mode === 'sandbox' && settleResult.settlementId) {
      receipt = await loadSandboxReceipt(settleResult.settlementId);
      displayCode = `${SANDBOX_PREFIX}${settleResult.settlementId}`;
    } else if (settleResult?.receiptToken) {
      receipt = await loadReceipt(settleResult.receiptToken);
      displayCode = settleResult.receiptToken;
    }

    // Came back from the gateway with no money recorded — say why.
    if (!receipt) {
      return <PaymentStatus intentId={settleResult?.intentId ?? code} result={settleResult} />;
    }
  } else {
    receipt = await loadReceipt(code);
  }

  if (!receipt) notFound();

  // The QR points at the durable token, never at the intent id: an intent
  // id in a scanned code would re-run settlement on every scan.
  const receiptUrl = `https://shesaconnect.com/receipt/${displayCode}`;
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
