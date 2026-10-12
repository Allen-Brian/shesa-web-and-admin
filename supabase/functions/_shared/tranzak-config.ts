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
 *   2. **A key must belong to the mode it is used in.** Tranzak stamps the
 *      environment onto the key itself — `SAND_…` and `PROD_…` — so this
 *      is checked positively in both directions rather than inferred from
 *      one prefix. The sandbox half is the one that matters most: a live
 *      key running in sandbox mode charges a real person real money during
 *      what everyone believes is a test.
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
 * Who carries the gateway's cut. 100 = the payer.
 *
 * Tranzak defaults to 0, which takes the fee out of the amount requested:
 * ask for 20 000 and 19 500 arrives. For a priced item that is simply
 * wrong — a 20 000 ticket is 20 000 owed to the organisation, and a
 * silent 2.5% shortfall on every transaction is the kind of gap that only
 * surfaces at reconciliation months later.
 *
 * The payer sees the fee added at checkout before they confirm, so nothing
 * is hidden from them.
 *
 * Worth revisiting per charge one day: an organisation may prefer to
 * absorb the fee on donations, where the payer chose the figure and being
 * charged 10 250 for a 10 000 gift reads oddly.
 */
export const PAYER_CARRIES_FEE_PERCENT = 100;

/**
 * Fixed per mode, deliberately not an environment variable.
 * https://docs.developer.tranzak.me/ — "All Tranzak API endpoints must be
 * accessed via HTTPS."
 */
const BASE_URL: Record<TranzakMode, string> = {
  sandbox: 'https://sandbox.dsapi.tranzak.me',
  live: 'https://dsapi.tranzak.me',
};

/**
 * Tranzak prefixes application keys with their environment. Verified
 * against a real sandbox key on 2026-09-03 (`SAND_…`); the production
 * prefix is from the API documentation's example.
 */
const KEY_PREFIX: Record<TranzakMode, string> = {
  sandbox: 'SAND_',
  live: 'PROD_',
};

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
  /**
   * Origin the payer's BROWSER returns to once they have paid.
   *
   * Only the origin, because the path varies per transaction and belongs
   * in code — `/agm-2026/confirmation/{reference}` today, the receipt page
   * once a settlement exists.
   *
   * The origin is pinned here rather than taken from the caller for one
   * reason: Tranzak redirects to whatever `returnUrl` we send, with no
   * allow-list of its own. The public AGM path is reachable anonymously,
   * so a caller-supplied URL is an open redirect — a payer completes a
   * real payment and lands on an attacker's "that failed, try again" page.
   * (`members/send-invite` does accept a caller `redirectTo`, but only
   * because Supabase Auth validates it against `uri_allow_list`. Tranzak
   * offers no equivalent.)
   */
  readonly returnUrlBase: string;
  /**
   * Where Tranzak POSTs when a request reaches a terminal state — the
   * `callbackUrl` field on `request/create`. A per-transaction field, and
   * separate from the dashboard's global webhook config.
   *
   * Defaults to this project's own Edge Function, derived rather than
   * configured so it cannot drift or point at the wrong project. Override
   * with TRANZAK_CALLBACK_URL only if the notification has to reach us by
   * some other route.
   *
   * Wherever it points has to be able to re-read the transaction from
   * Tranzak's API before settling, which means holding these credentials.
   * `apps/web` deliberately does not, so it cannot be the destination.
   */
  readonly callbackUrl: string;
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
  // Trailing dots as well as slashes. `https://www.shesaconnect.com.` is a
  // valid fully-qualified name and curl follows it happily, but browsers
  // can reject it on the TLS name match — so a stray full stop typed into
  // the secret becomes a payer stranded on a certificate error after
  // paying. Cheap to normalise, expensive to debug.
  const returnUrlBase = required('TRANZAK_RETURN_URL_BASE').replace(/[./]+$/, '');

  // Our own webhook endpoint. SUPABASE_URL is injected into every Edge
  // Function by the runtime, so the default is always right for whichever
  // project this is running in.
  const callbackUrl =
    Deno.env.get('TRANZAK_CALLBACK_URL')?.trim() ||
    `${required('SUPABASE_URL').replace(/\/+$/, '')}/functions/v1/payments/tranzak-webhook`;

  // Rule 2, asserted positively in both directions rather than inferred
  // from one prefix. The sandbox case is the dangerous one — a live key
  // here charges a real payer during a test run.
  const expected = KEY_PREFIX[mode];
  if (!appKey.startsWith(expected)) {
    const wrongMode = mode === 'sandbox' ? 'live' : 'sandbox';
    const consequence =
      mode === 'sandbox'
        ? 'a live key in sandbox mode charges real payers'
        : 'a sandbox key in live mode takes payments that never settle';
    throw new Error(
      `${prefix}_APP_KEY does not start with "${expected}", so it is not a ${mode} key ` +
        `— it looks like a ${wrongMode} one. Refusing to start: ${consequence}.`,
    );
  }

  return {
    mode,
    baseUrl: BASE_URL[mode],
    appId,
    appKey,
    webhookAuthKey,
    returnUrlBase,
    callbackUrl,
  };
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
