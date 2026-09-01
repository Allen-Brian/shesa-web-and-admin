/**
 * Fapshi HTTP client — Deno (Edge Function) side.
 *
 * Mirror of apps/web/src/lib/fapshi.ts. Deno-run Edge Functions can't
 * reliably import from `packages/*` or `apps/*`, so this file re-implements
 * the tiny fetch surface we need for the webhook + reconcile flows.
 *
 * ─── KEEP IN SYNC WITH apps/web/src/lib/fapshi.ts ────────────────────
 * That module is the canonical Node client for the server actions;
 * this one exists because the webhook + reconcile edge functions can't
 * reach into an app package. When either changes (new endpoint, new
 * field, new env-var name), update both files.
 * ────────────────────────────────────────────────────────────────────
 */

const FAPSHI_MIN_AMOUNT_XAF = 100;

export interface FapshiInitiateInput {
  readonly amount: number;
  readonly email?: string | null;
  readonly redirectUrl: string;
  readonly externalId?: string | null;
  readonly userId?: string | null;
  readonly message?: string | null;
}

export interface FapshiInitiateResult {
  readonly transId: string;
  readonly link: string;
  readonly dateInitiated?: string;
}

export type FapshiStatus = 'CREATED' | 'PENDING' | 'SUCCESSFUL' | 'FAILED' | 'EXPIRED';

export interface FapshiStatusResult {
  readonly transId: string;
  readonly status: FapshiStatus;
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

function readEnv() {
  const baseUrl = Deno.env.get('FAPSHI_BASE_URL');
  const apiUser = Deno.env.get('FAPSHI_API_USER');
  const apiKey = Deno.env.get('FAPSHI_API_KEY');
  if (!baseUrl || !apiUser || !apiKey) {
    throw new Error(
      'Fapshi env is missing: set FAPSHI_BASE_URL, FAPSHI_API_USER, FAPSHI_API_KEY on the Edge Function.',
    );
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

export async function getPaymentStatus(transId: string): Promise<FapshiStatusResult> {
  if (!transId) throw new Error('transId is required');
  return await fapshiFetch<FapshiStatusResult>(`/payment-status/${encodeURIComponent(transId)}`, {
    method: 'GET',
  });
}
