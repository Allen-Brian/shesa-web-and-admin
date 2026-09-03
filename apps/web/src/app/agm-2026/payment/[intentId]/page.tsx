import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { serverEnv } from '@shesa/config/env.server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Confirming your payment — SHESA AGM 2026',
  robots: { index: false, follow: false },
};

interface SettleResponse {
  readonly outcome?: string;
  readonly mode?: 'sandbox' | 'live';
  readonly settlementId?: string;
  readonly receiptToken?: string;
  readonly gatewayStatus?: string;
  readonly reason?: string;
}

/**
 * Where Tranzak returns the payer's browser after checkout.
 *
 * ─── Why this page verifies rather than waits ──────────────────────────
 * The obvious design is to send the payer straight to their receipt. It
 * does not work: the receipt is keyed on a token minted by the
 * `payments_generate_receipt` trigger, which only fires once the payment
 * row exists — and at the moment the browser comes back, the webhook that
 * would have created it may not have arrived. Pointing `returnUrl` at a
 * receipt would be a race we lose often.
 *
 * So this page settles rather than polls. A payer standing in front of us
 * is a better signal than a notification we are waiting on, and the
 * settlement path is idempotent, so doing it here costs nothing if the
 * webhook already did it. The webhook stays as the backstop for someone
 * who closed the tab on Tranzak's page.
 *
 * Whatever the outcome, this page redirects: to the receipt when the
 * money arrived, to the registration confirmation when it did not.
 */
export default async function AgmPaymentReturnPage({
  params,
}: {
  params: Promise<{ intentId: string }>;
}) {
  const { intentId } = await params;

  let result: SettleResponse | null = null;

  try {
    const res = await fetch(
      `${serverEnv.SUPABASE_URL.replace(/\/+$/, '')}/functions/v1/payments/tranzak-settle`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          apikey: serverEnv.SUPABASE_SERVICE_ROLE_KEY,
          authorization: `Bearer ${serverEnv.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ intentId }),
        cache: 'no-store',
      },
    );
    result = (await res.json().catch(() => null)) as SettleResponse | null;
  } catch (err) {
    console.error(
      JSON.stringify({
        level: 'error',
        component: 'web.agm.paymentReturn',
        message: 'settle call failed',
        intentId,
        error: String(err),
      }),
    );
  }

  const outcome = result?.outcome ?? 'unknown';

  // Paid. Sandbox settlements have no receipt token — they mint no
  // receipt by design — so they are addressed by their settlement id.
  if (outcome === 'settled' || outcome === 'already-settled') {
    if (result?.mode === 'sandbox' && result.settlementId) {
      redirect(`/agm-2026/receipt/sandbox-${result.settlementId}`);
    }
    if (result?.receiptToken) {
      redirect(`/agm-2026/receipt/${result.receiptToken}`);
    }
  }

  // Everything else gets a page rather than a redirect, because the payer
  // needs to be told something specific.
  const copy = messageFor(outcome, result);

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col justify-center gap-5 px-6 py-20">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{copy.title}</h1>
      <p className="text-base leading-relaxed text-muted-foreground">{copy.body}</p>

      <div className="flex flex-wrap gap-3 pt-2">
        <Link
          href="/agm-2026"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Back to AGM 2026
        </Link>
      </div>

      <p className="pt-4 text-xs text-muted-foreground">
        Reference <span className="font-mono">{intentId}</span> — quote this if you contact the
        secretariat.
      </p>
    </main>
  );
}

function messageFor(
  outcome: string,
  result: SettleResponse | null,
): { title: string; body: string } {
  switch (outcome) {
    case 'settled':
    case 'already-settled':
      // Reached only when a live settlement somehow has no receipt token.
      return {
        title: 'Payment received',
        body: 'Thank you — your payment has been recorded. Your receipt is being prepared; the secretariat will send it to you shortly.',
      };
    case 'pending':
      return {
        title: 'Still confirming your payment',
        body: `Your bank or mobile money provider has not finished confirming this yet${
          result?.gatewayStatus
            ? ` (${result.gatewayStatus.replaceAll('_', ' ').toLowerCase()})`
            : ''
        }. Your registration is recorded either way — we will email you the moment the payment clears.`,
      };
    case 'failed':
      return {
        title: 'That payment did not go through',
        body: 'Nothing was charged. Your registration is still recorded, so you can try again from the AGM page or pay on arrival.',
      };
    case 'cancelled':
      return {
        title: 'Payment cancelled',
        body: 'Nothing was charged. Your registration is still recorded — you can pay later or on arrival.',
      };
    case 'mismatch':
      return {
        title: 'We need to check this one by hand',
        body: 'The amount confirmed by the payment provider does not match what was requested, so we have held it for review rather than recording it. The secretariat will contact you.',
      };
    default:
      return {
        title: 'We could not confirm this payment',
        body: 'Your registration is recorded. If money left your account, the secretariat will find it and be in touch — nothing is lost.',
      };
  }
}
