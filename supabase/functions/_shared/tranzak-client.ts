/**
 * Tranzak HTTP client — token, create, and the authenticated status read.
 *
 * Written against responses captured from the live sandbox on 2026-09-03,
 * not from the documentation alone. Two places where they differ are
 * called out below.
 *
 * ─── The one thing to understand before changing anything here ─────────
 * `fetchRequestDetails` is the only trustworthy statement about whether a
 * payment happened.
 *
 * Tranzak's webhook carries no signature and no signing header — the
 * documented mechanism is an `authKey` echoed inside the JSON body. Anyone
 * who has ever seen one webhook body can forge any number of them, so a
 * webhook is a hint that something may have changed, never an instruction
 * to settle. `details` requires a bearer token (a request without one gets
 * 401 — verified), which is precisely what makes it the source of truth.
 *
 * That distinction is not theoretical here. The Fapshi integration this
 * replaces acted on the posted `{transId, status}` behind a static shared
 * secret and never re-checked with the gateway; that was SEC-04.
 */

import { resolveTranzakConfig, type TranzakConfig, type TranzakMode } from './tranzak-config.ts';

/** Status values a request or transaction can carry. */
export type TranzakStatus =
  | 'PENDING'
  | 'PAYMENT_IN_PROGRESS'
  | 'PAYER_REDIRECT_REQUIRED'
  | 'SUCCESSFUL'
  | 'FAILED'
  | 'CANCELLED'
  | 'CANCELLED_BY_PAYER';

/** The only status that means money moved. Everything else is not-yet or never. */
export const SETTLED: TranzakStatus = 'SUCCESSFUL';

/** Statuses from which no further change is possible. */
const TERMINAL: ReadonlySet<string> = new Set<TranzakStatus>([
  'SUCCESSFUL',
  'FAILED',
  'CANCELLED',
  'CANCELLED_BY_PAYER',
]);

export function isTerminal(status: string): boolean {
  return TERMINAL.has(status);
}

/** The `resource` / `data` object Tranzak returns for a payment request. */
export interface TranzakRequest {
  readonly requestId: string;
  readonly amount: number;
  readonly currencyCode: string;
  readonly description?: string | null;
  readonly status: string;
  readonly transactionStatus?: string | null;
  readonly mchTransactionRef?: string | null;
  readonly transactionId?: string | null;
  readonly mobileWalletNumber?: string | null;
  readonly createdAt?: string | null;
  readonly transactionTime?: string | null;
  readonly payer?: {
    readonly name?: string | null;
    readonly email?: string | null;
    readonly accountId?: string | null;
    readonly paymentMethod?: string | null;
    readonly netAmountPaid?: number | null;
  } | null;
  readonly merchant?: {
    readonly amount?: number | null;
    readonly currencyCode?: string | null;
    readonly fee?: number | null;
    readonly netAmountReceived?: number | null;
  } | null;
  readonly links?: {
    readonly returnUrl?: string | null;
    readonly cancelUrl?: string | null;
    readonly paymentAuthUrl?: string | null;
  } | null;
}

export class TranzakError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
    readonly body?: unknown,
    /**
     * The gateway's own sentence, when it gave one. Worth carrying
     * separately so it can be shown to an operator without the HTTP
     * scaffolding around it.
     */
    readonly gatewayMessage?: string | null,
  ) {
    super(message);
    this.name = 'TranzakError';
  }
}

/* ══════════════════════════════════════════════════════════════════════
 * Token
 * ══════════════════════════════════════════════════════════════════════ */

interface CachedToken {
  readonly token: string;
  /** Epoch ms after which the token is re-fetched. */
  readonly refreshAfter: number;
  /** Which credentials minted it — a mode flip must not reuse a token. */
  readonly mode: TranzakMode;
}

let cached: CachedToken | null = null;

/**
 * Tranzak's guidance is to hold a token for about three quarters of its
 * life rather than until it expires, so a request in flight when the clock
 * runs out does not fail. `expiresIn` is 7200s in the sandbox, giving a
 * 90-minute cache.
 *
 * The cache is module scope, so it survives only as long as a warm Edge
 * Function instance — which is exactly the intent. Nothing is persisted.
 */
const TOKEN_LIFETIME_FRACTION = 0.75;

async function getToken(config: TranzakConfig, now: number): Promise<string> {
  if (cached && cached.mode === config.mode && now < cached.refreshAfter) {
    return cached.token;
  }

  const res = await fetch(`${config.baseUrl}/auth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ appId: config.appId, appKey: config.appKey }),
  });

  const body = (await res.json().catch(() => null)) as {
    success?: boolean;
    data?: { token?: string; expiresIn?: number };
  } | null;

  if (!res.ok || !body?.success || !body.data?.token) {
    // Deliberately does not include the response body: an auth failure can
    // echo back parts of the credentials, and this line goes to a log.
    throw new TranzakError(
      `Tranzak auth failed in ${config.mode} mode (HTTP ${res.status}).`,
      res.status,
    );
  }

  const expiresIn = typeof body.data.expiresIn === 'number' ? body.data.expiresIn : 3600;
  cached = {
    token: body.data.token,
    refreshAfter: now + expiresIn * 1000 * TOKEN_LIFETIME_FRACTION,
    mode: config.mode,
  };
  return cached.token;
}

/** Drop the cached token. For tests, and for retrying a 401 once. */
export function clearTokenCache(): void {
  cached = null;
}

async function call<T>(
  config: TranzakConfig,
  path: string,
  init: { method: 'GET' | 'POST'; body?: unknown },
  now: number,
): Promise<T> {
  const send = async (token: string) =>
    await fetch(`${config.baseUrl}${path}`, {
      method: init.method,
      headers: {
        authorization: `Bearer ${token}`,
        ...(init.body ? { 'content-type': 'application/json' } : {}),
      },
      ...(init.body ? { body: JSON.stringify(init.body) } : {}),
    });

  let res = await send(await getToken(config, now));

  // A cached token can expire between the check and the call. One retry on
  // 401 with a fresh token; a second 401 is a real failure.
  if (res.status === 401) {
    clearTokenCache();
    res = await send(await getToken(config, now));
  }

  const body = (await res.json().catch(() => null)) as {
    success?: boolean;
    data?: T;
    message?: string;
    errorMsg?: string;
    errorCode?: number;
  } | null;

  if (!res.ok || !body?.success || body.data === undefined) {
    // Tranzak puts the human-readable reason in `errorMsg`, not `message`,
    // and returns HTTP 200 while doing it. Reading only `message` threw
    // away the one sentence that explains the failure: an account-level
    // restriction on the live API reached operators as a bare 500.
    const detail = body?.errorMsg ?? body?.message ?? null;
    throw new TranzakError(
      `Tranzak ${init.method} ${path} failed (HTTP ${res.status})${detail ? `: ${detail}` : ''}`,
      res.status,
      body,
      detail,
    );
  }

  return body.data;
}

/* ══════════════════════════════════════════════════════════════════════
 * Operations
 * ══════════════════════════════════════════════════════════════════════ */

export interface CreateRequestInput {
  readonly amount: number;
  readonly currencyCode: string;
  readonly description: string;
  /**
   * Our `finance.payment_intents.id`.
   *
   * Tranzak requires this to be unique per request for 30 days and uses it
   * to reject duplicates, so passing the intent id buys gateway-side
   * idempotency for free: a retried initiate cannot open a second payment
   * request for the same intent.
   */
  readonly mchTransactionRef: string;
  /** Where the payer's browser lands afterwards. */
  readonly returnUrl: string;
  readonly cancelUrl?: string;
  /**
   * Where Tranzak POSTs when the request reaches a terminal state.
   *
   * Sent per transaction rather than relying on the dashboard's global
   * webhook, so a request always carries its own notification target and
   * a dashboard change cannot silently redirect settlements elsewhere.
   */
  readonly callbackUrl?: string;
  /**
   * How much of the gateway's fee the payer carries, 0–100.
   *
   * At 0 — Tranzak's default — the fee comes out of what we asked for: a
   * 20 000 charge settles 19 500 into the merchant account. That is wrong
   * for a ticket priced at 20 000, because the organisation is owed 20 000
   * and quietly receives less. At 100 the fee is added on top and the full
   * amount arrives.
   *
   * `amount` stays the figure we asked for either way, so reconciliation
   * is unaffected — verified against the sandbox.
   */
  readonly payerFeePercentage?: number;
}

/**
 * Open a hosted-checkout payment request.
 *
 * Returns `links.paymentAuthUrl`, which is the URL the payer is sent to.
 * Note the sandbox serves it from a different host and shape than the
 * documentation shows (`sandbox.pay.tranzak.me/?rid=…` rather than
 * `pay.tranzak.me/flow/…`), so it is used as returned and never rebuilt.
 */
export async function createPaymentRequest(
  input: CreateRequestInput,
  config: TranzakConfig = resolveTranzakConfig(),
  now: number = Date.now(),
): Promise<TranzakRequest> {
  return await call<TranzakRequest>(
    config,
    '/xp021/v1/request/create',
    { method: 'POST', body: input },
    now,
  );
}

/**
 * Read a request's current state from Tranzak.
 *
 * This is the call that decides whether a payment settled. Never settle on
 * a webhook body — see the note at the top of this file.
 */
export async function fetchRequestDetails(
  requestId: string,
  config: TranzakConfig = resolveTranzakConfig(),
  now: number = Date.now(),
): Promise<TranzakRequest> {
  const qs = new URLSearchParams({ requestId });
  return await call<TranzakRequest>(
    config,
    `/xp021/v1/request/details?${qs.toString()}`,
    { method: 'GET' },
    now,
  );
}

/* ══════════════════════════════════════════════════════════════════════
 * Reconciliation
 * ══════════════════════════════════════════════════════════════════════ */

export interface ReconcileResult {
  readonly ok: boolean;
  readonly reason?: string;
}

/**
 * Does what the gateway says it settled match what we asked for?
 *
 * `finalize_fapshi_intent` inserted our *expected* amount and never
 * compared it to what actually settled (SEC-16). A silent mismatch in a
 * ledger is worse than a loud failure, so this refuses rather than
 * rounding.
 *
 * The comparison is on the gross `amount`, not on `merchant.netAmountReceived`
 * — the payer is charged the gross and the gateway's fee is deducted after,
 * so netting them would reject every correct transaction.
 */
export function reconcile(
  expected: { amount: number; currency: string },
  actual: TranzakRequest,
): ReconcileResult {
  if ((actual.currencyCode ?? '').toUpperCase() !== expected.currency.toUpperCase()) {
    return {
      ok: false,
      reason: `currency mismatch: expected ${expected.currency}, gateway settled ${actual.currencyCode}`,
    };
  }
  // XAF has no minor unit, but the field is a JSON number and other
  // currencies could arrive fractional, so compare with a tolerance rather
  // than on identity.
  if (Math.abs(actual.amount - expected.amount) > 0.005) {
    return {
      ok: false,
      reason: `amount mismatch: expected ${expected.amount}, gateway settled ${actual.amount}`,
    };
  }
  return { ok: true };
}
