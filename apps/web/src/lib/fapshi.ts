/**
 * Fapshi HTTP client — server-side only (Node runtime).
 *
 * Wraps the tiny surface of the Fapshi REST API we actually use from
 * the AGM 2026 public flows:
 *
 *   * initiatePay      — create a hosted-checkout link + transId
 *   * getPaymentStatus — poll a transId (used by the reconcile edge fn
 *                         mostly; kept here for parity + tests)
 *
 * Auth is two headers, `apiuser` + `apikey`, scoped to a "service" the
 * merchant creates in the Fapshi dashboard. Base URL flips between
 * https://sandbox.fapshi.com and https://live.fapshi.com — set via
 * FAPSHI_BASE_URL so the same code runs in every env.
 *
 * Fapshi's docs are terse but stable — see
 * https://docs.fapshi.com/en/api-reference/endpoint/initiate-pay
 *
 * A Deno-native mirror lives at supabase/functions/_shared/fapshi.ts;
 * change both when the API surface moves.
 */

import { serverEnv } from '@shesa/config/env.server';

const FAPSHI_MIN_AMOUNT_XAF = 100;

export interface FapshiInitiateInput {
  /** Amount in XAF (integer). Fapshi rejects <100 and non-integer values. */
  readonly amount: number;
  /** Payer email (optional but strongly recommended — pre-fills the checkout). */
  readonly email?: string | null;
  /** Where Fapshi should redirect the payer after they finish (success or fail). */
  readonly redirectUrl: string;
  /** Free-form ID we set — echoed back on the webhook. Use our intent_id. */
  readonly externalId?: string | null;
  /** Free-form ID Fapshi files under "userId" — reused for a second correlation key. */
  readonly userId?: string | null;
  /** Short text shown to the payer on the checkout page. */
  readonly message?: string | null;
}

export interface FapshiInitiateResult {
  readonly transId: string;
  readonly link: string;
  readonly dateInitiated?: string;
}

export interface FapshiStatusResult {
  readonly transId: string;
  readonly status: 'CREATED' | 'PENDING' | 'SUCCESSFUL' | 'FAILED' | 'EXPIRED';
  readonly medium?: string;
  readonly amount?: number;
  readonly payerName?: string;
  readonly email?: string;
  readonly financialTransId?: string;
  readonly dateInitiated?: string;
  readonly dateConfirmed?: string;
}

export class FapshiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
    message: string,
  ) {
    super(message);
    this.name = 'FapshiError';
  }
}

interface FapshiEnv {
  readonly baseUrl: string;
  readonly apiUser: string;
  readonly apiKey: string;
}

/**
 * Credentials come from the shared server env schema, which validates
 * their shape at boot. They are optional there — the admin apps load
 * the same schema and have no use for a payment gateway — so presence
 * is asserted here, at the one place that actually needs them. The
 * error names every missing var so a misconfigured deploy is one read
 * of the log away from fixed.
 */
function readEnv(): FapshiEnv {
  const { FAPSHI_BASE_URL: baseUrl, FAPSHI_API_USER: apiUser, FAPSHI_API_KEY: apiKey } = serverEnv;

  const missing = [
    !baseUrl && 'FAPSHI_BASE_URL',
    !apiUser && 'FAPSHI_API_USER',
    !apiKey && 'FAPSHI_API_KEY',
  ].filter(Boolean);

  if (!baseUrl || !apiUser || !apiKey) {
    throw new Error(`Fapshi env is missing: set ${missing.join(', ')}.`);
  }
  return { baseUrl: baseUrl.replace(/\/$/, ''), apiUser, apiKey };
}

async function fapshiFetch<T>(path: string, init: RequestInit): Promise<T> {
  const env = readEnv();
  const url = `${env.baseUrl}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      'content-type': 'application/json',
      apiuser: env.apiUser,
      apikey: env.apiKey,
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  const body = text ? safeJson(text) : null;
  if (!res.ok) {
    const message =
      (isRecord(body) && typeof body.message === 'string' && body.message) ||
      `Fapshi ${res.status} on ${path}`;
    throw new FapshiError(res.status, body, message);
  }
  return body as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/**
 * Create a hosted-checkout charge. Returns the URL to redirect the
 * payer to + Fapshi's transId (which we persist as provider_ref).
 */
export async function initiatePay(input: FapshiInitiateInput): Promise<FapshiInitiateResult> {
  if (!Number.isInteger(input.amount) || input.amount < FAPSHI_MIN_AMOUNT_XAF) {
    throw new Error(
      `Fapshi rejects non-integer or sub-${FAPSHI_MIN_AMOUNT_XAF} XAF amounts (got ${input.amount}).`,
    );
  }
  const body = {
    amount: input.amount,
    email: input.email ?? undefined,
    redirectUrl: input.redirectUrl,
    externalId: input.externalId ?? undefined,
    userId: input.userId ?? undefined,
    message: input.message ?? undefined,
  };
  const res = await fapshiFetch<FapshiInitiateResult>('/initiate-pay', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.transId || !res.link) {
    throw new FapshiError(502, res, 'Fapshi initiate-pay response missing transId or link');
  }
  return res;
}

/** GET /payment-status/{transId} — used by the reconcile sweep. */
export async function getPaymentStatus(transId: string): Promise<FapshiStatusResult> {
  if (!transId) throw new Error('transId is required');
  const res = await fapshiFetch<FapshiStatusResult>(
    `/payment-status/${encodeURIComponent(transId)}`,
    { method: 'GET' },
  );
  return res;
}
