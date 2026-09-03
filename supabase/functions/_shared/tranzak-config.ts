/**
 * Tranzak credentials, and the guard that stops the wrong ones being used.
 *
 * Both credential sets live in the Edge Function environment at once and
 * `TRANZAK_MODE` selects between them. That is convenient — it lets a
 * sandbox transaction run against the production deployment while only
 * sandbox details exist — and it puts live keys in the same process as the
 * test path. This module is what makes that safe.
 *
 * Three rules, in order of how badly each one fails:
 *
 *   1. **The base URL is not configurable.** It is derived from the mode.
 *      Sandbox credentials cannot be pointed at the live host because
 *      there is no setting that would let them.
 *
 *   2. **A live key cannot run in sandbox mode.** This is the one that
 *      charges a real person real money during a test. Tranzak's live
 *      application keys are prefixed `PROD_`; a key carrying that prefix
 *      while the mode says sandbox is a mis-paste, and boot fails.
 *
 *   3. **The mode must be stated.** No default. Defaulting to `live`
 *      collects money nobody meant to collect; defaulting to `sandbox`
 *      silently fails to collect money someone did. Neither is a safe
 *      guess, so refuse to guess.
 *
 * The credentials never reach `packages/config` and so never reach either
 * Next app — only `TRANZAK_MODE` does, for labelling a test transaction in
 * the UI. An Edge Function is the only thing that needs to hold them.
 */

export type TranzakMode = 'sandbox' | 'live';

/**
 * Fixed per mode, deliberately not an environment variable.
 * https://docs.developer.tranzak.me/ — "All Tranzak API endpoints must be
 * accessed via HTTPS."
 */
const BASE_URL: Record<TranzakMode, string> = {
  sandbox: 'https://sandbox.dsapi.tranzak.me',
  live: 'https://dsapi.tranzak.me',
};

/** Prefix Tranzak puts on production application keys. */
const LIVE_KEY_PREFIX = 'PROD_';

export interface TranzakConfig {
  readonly mode: TranzakMode;
  readonly baseUrl: string;
  readonly appId: string;
  readonly appKey: string;
  /**
   * The value Tranzak echoes back in a webhook body as `authKey`.
   *
   * Worth being blunt about what this is: a static shared secret carried
   * in the payload, not a signature over it. Tranzak documents no
   * signature header and no HMAC. Anyone who has ever seen one webhook
   * body — a log line, a proxy, a support ticket — can forge any number
   * of them. It is a first-pass filter and nothing more; settlement must
   * always re-read the transaction from the API before acting.
   */
  readonly webhookAuthKey: string;
}

function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value || value.trim().length === 0) {
    throw new Error(`${name} is not set. Tranzak cannot be reached without it.`);
  }
  return value.trim();
}

/**
 * Resolve the credential set for the configured mode, or throw.
 *
 * Throwing is the point. Every failure here is a misconfiguration that
 * would otherwise be discovered by a payer.
 */
export function resolveTranzakConfig(): TranzakConfig {
  const raw = Deno.env.get('TRANZAK_MODE')?.trim();

  if (raw !== 'sandbox' && raw !== 'live') {
    throw new Error(
      `TRANZAK_MODE must be "sandbox" or "live"; got ${raw ? `"${raw}"` : 'nothing'}. ` +
        'There is no default: guessing "live" collects money nobody authorised, ' +
        'and guessing "sandbox" silently fails to collect money someone did.',
    );
  }
  const mode: TranzakMode = raw;

  const prefix = mode === 'live' ? 'TRANZAK_LIVE' : 'TRANZAK_SANDBOX';
  const appId = required(`${prefix}_APP_ID`);
  const appKey = required(`${prefix}_APP_KEY`);
  const webhookAuthKey = required(`${prefix}_WEBHOOK_AUTH_KEY`);

  // Rule 2, in both directions. The sandbox case is the dangerous one —
  // a live key here charges a real payer during a test run.
  const looksLive = appKey.startsWith(LIVE_KEY_PREFIX);
  if (mode === 'sandbox' && looksLive) {
    throw new Error(
      `TRANZAK_SANDBOX_APP_KEY carries the ${LIVE_KEY_PREFIX} prefix Tranzak puts on ` +
        'production keys. Running a live key in sandbox mode charges real payers. ' +
        'Refusing to start.',
    );
  }
  if (mode === 'live' && !looksLive) {
    throw new Error(
      `TRANZAK_LIVE_APP_KEY does not carry the ${LIVE_KEY_PREFIX} prefix Tranzak puts on ` +
        'production keys, so it is probably a sandbox key. A sandbox key in live mode ' +
        'takes payments that never settle. Refusing to start.',
    );
  }

  return { mode, baseUrl: BASE_URL[mode], appId, appKey, webhookAuthKey };
}

/**
 * Constant-time comparison for the webhook's `authKey`.
 *
 * Length is compared first and returns early, which leaks the length —
 * acceptable, since the length of a configured secret is not the secret.
 * The digest step is what removes the character-by-character timing signal
 * that a naive `===` on two strings would give an attacker probing for the
 * key one byte at a time.
 */
export async function authKeyMatches(received: string, expected: string): Promise<boolean> {
  if (received.length !== expected.length) return false;
  const encode = (s: string) => new TextEncoder().encode(s);
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', encode(received)),
    crypto.subtle.digest('SHA-256', encode(expected)),
  ]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i += 1) diff |= x[i]! ^ y[i]!;
  return diff === 0;
}
