/**
 * Tranzak's notification endpoint — `https://www.shesaconnect.com/tranzak/webhook`,
 * the URL registered in the Tranzak developer dashboard.
 *
 * ─── This route deliberately does almost nothing ───────────────────────
 * It reads two fields out of the body — the transaction's id and the
 * `authKey` — and hands them to `payments/tranzak-settle`. Everything
 * else Tranzak posts is discarded, including the status.
 *
 * That is the whole design. Tranzak's notification carries no signature;
 * verification is a static `authKey` echoed inside the payload, so anyone
 * who has ever seen one body can post a convincing forgery claiming any
 * status they like. By never reading the status, this route cannot pass a
 * forged one along. The Edge Function re-reads the transaction from
 * Tranzak's authenticated API and decides from that.
 *
 * The Fapshi integration this replaces did the opposite — it acted on the
 * posted `{transId, status}` behind a static shared secret and never
 * re-checked with the gateway. That was SEC-04.
 *
 * ─── Why it lives here rather than on the Edge Function ────────────────
 * Because this is the URL already registered with Tranzak, and it is a
 * better one: it does not leak the Supabase project ref and it survives a
 * project migration. The Edge Function is where the Tranzak credentials
 * live, so the settlement has to happen there; this is the doorway.
 */

import { NextResponse, type NextRequest } from 'next/server';

import { serverEnv } from '@shesa/config/env.server';

/** Never cached, never prerendered — it is a POST target. */
export const dynamic = 'force-dynamic';

/**
 * Pull the gateway request id out of a notification.
 *
 * Tranzak puts it at `resourceId` and repeats it at `resource.requestId`;
 * both are accepted so a payload-shape change does not silently stop
 * settling anything.
 */
function readRequestId(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const b = body as Record<string, unknown>;

  if (typeof b.resourceId === 'string' && b.resourceId.length > 0) return b.resourceId;

  const resource = b.resource;
  if (typeof resource === 'object' && resource !== null) {
    const r = resource as Record<string, unknown>;
    if (typeof r.requestId === 'string' && r.requestId.length > 0) return r.requestId;
  }
  return null;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const requestId = readRequestId(body);
  const authKey =
    typeof (body as Record<string, unknown>)?.authKey === 'string'
      ? ((body as Record<string, unknown>).authKey as string)
      : '';

  if (!requestId) {
    console.warn(
      JSON.stringify({
        level: 'warn',
        component: 'web.tranzak.webhook',
        message: 'notification carried no request id',
        eventType: (body as Record<string, unknown>)?.eventType ?? null,
      }),
    );
    // 200 regardless: a gateway that sees an error retries, and there is
    // nothing here worth retrying.
    return NextResponse.json({ received: true }, { status: 200 });
  }

  try {
    const res = await fetch(
      `${serverEnv.SUPABASE_URL.replace(/\/+$/, '')}/functions/v1/payments/tranzak-settle`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          // Satisfies the Edge Function's JWT gate. This route is the only
          // caller; Tranzak never holds a Supabase credential.
          apikey: serverEnv.SUPABASE_SERVICE_ROLE_KEY,
          authorization: `Bearer ${serverEnv.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ requestId, authKey }),
      },
    );

    if (!res.ok) {
      console.error(
        JSON.stringify({
          level: 'error',
          component: 'web.tranzak.webhook',
          message: 'settle call failed',
          requestId,
          status: res.status,
        }),
      );
    }
  } catch (err) {
    console.error(
      JSON.stringify({
        level: 'error',
        component: 'web.tranzak.webhook',
        message: 'settle call threw',
        requestId,
        error: String(err),
      }),
    );
  }

  // Always 200. Settlement is idempotent and the payer's return covers the
  // same ground, so a retry storm costs more than a missed notification.
  return NextResponse.json({ received: true }, { status: 200 });
}
