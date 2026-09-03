import Link from 'next/link';

import { serverEnv } from '@shesa/config/env.server';

export interface SettleResponse {
  readonly outcome?: string;
  /** Present whenever the intent was resolved, including from a requestId. */
  readonly intentId?: string;
  readonly mode?: 'sandbox' | 'live';
  readonly settlementId?: string;
  readonly receiptToken?: string;
  readonly gatewayStatus?: string;
  readonly reason?: string;
  readonly chargeName?: string | null;
  readonly subjectName?: string | null;
  /** Derived server-side from the intent's charge — never from the URL. */
  readonly backHref?: string | null;
}

/**
 * Ask the gateway what happened to an intent, and record it if it settled.
 *
 * This runs when a payer lands on `/receipt/{intentId}` straight back from
 * Tranzak. Settling here rather than waiting for the webhook is the point:
 * a payer standing in front of us is a better signal than a notification
 * we are still waiting on, and the settlement path is idempotent, so doing
 * it twice costs nothing. The webhook remains the backstop for someone who
 * closed the tab on the gateway's page.
 */
export async function settlePaymentIntent(intentId: string): Promise<SettleResponse | null> {
  return await callSettle({ intentId });
}

/**
 * Settle from the gateway's own reference.
 *
 * Tranzak appends `requestId` to the redirect it chooses, and on a real
 * payment it chose an exit we had not planned for. Keying off that
 * parameter means the payer still ends up somewhere useful even when the
 * URL is not the one we asked for.
 */
export async function settleGatewayRequest(requestId: string): Promise<SettleResponse | null> {
  return await callSettle({ requestId });
}

async function callSettle(body: {
  intentId?: string;
  requestId?: string;
}): Promise<SettleResponse | null> {
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
        body: JSON.stringify(body),
        cache: 'no-store',
      },
    );
    return (await res.json().catch(() => null)) as SettleResponse | null;
  } catch (err) {
    console.error(
      JSON.stringify({
        level: 'error',
        component: 'web.receipt.settle',
        message: 'settle call failed',
        ...body,
        error: String(err),
      }),
    );
    return null;
  }
}

/**
 * What the payer sees when they came back from the gateway and there is no
 * receipt to show them.
 *
 * A receipt is the happy path and it renders instead of this. Everything
 * else — still confirming, declined, cancelled, held for review — needs
 * saying in words, because the one thing a payer must never be left with
 * is a page that cannot tell them whether their money moved.
 */
export function PaymentStatus({
  intentId,
  result,
}: {
  readonly intentId: string;
  readonly result: SettleResponse | null;
}) {
  const copy = messageFor(result?.outcome ?? 'unknown', result);

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col justify-center gap-5 px-6 py-20">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{copy.title}</h1>
      {result?.chargeName && (
        <p className="-mt-2 text-sm text-muted-foreground">
          {result.chargeName}
          {result.subjectName ? ` · ${result.subjectName}` : ''}
        </p>
      )}
      <p className="text-base leading-relaxed text-muted-foreground">{copy.body}</p>

      {/* `backHref` is resolved from the intent's charge inside the Edge
          Function. Taking it from the URL would make this an open redirect
          on a page anyone can load. */}
      <div className="flex flex-wrap gap-3 pt-2">
        <Link
          href={result?.backHref ?? '/'}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          {result?.subjectName ? `Back to ${result.subjectName}` : 'Back to the site'}
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
      // Reached only when a settlement somehow has no receipt to show.
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
        }. Your details are recorded either way — we will email you the moment it clears.`,
      };
    case 'failed':
      return {
        title: 'That payment did not go through',
        body: 'Nothing was charged. Your details are still recorded, so you can try again or arrange to pay another way.',
      };
    case 'cancelled':
      return {
        title: 'Payment cancelled',
        body: 'Nothing was charged. Your details are still recorded — you can pay later or arrange another way.',
      };
    case 'mismatch':
      return {
        title: 'We need to check this one by hand',
        body: 'The amount confirmed by the payment provider does not match what was requested, so we have held it for review rather than recording it. The secretariat will contact you.',
      };
    default:
      return {
        title: 'We could not confirm this payment',
        body: 'Your details are recorded. If money left your account, the secretariat will find it and be in touch — nothing is lost.',
      };
  }
}
