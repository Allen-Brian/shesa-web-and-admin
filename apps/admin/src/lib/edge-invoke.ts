/**
 * Small helper for unwrapping `supabase.functions.invoke` errors.
 *
 * supabase-js throws several error shapes we care about:
 *
 *   - **FunctionsHttpError** — the Edge Function ran and returned a
 *     non-2xx status. `error.context` is a `Response` whose JSON body
 *     carries our error envelope (`{ error: { message } }` or `{ message }`).
 *
 *   - **FunctionsFetchError / FunctionsRelayError** — the request never
 *     reached the Edge Function (network, DNS, or gateway failure).
 *     `error.context` is the underlying `TypeError: fetch failed`, whose
 *     `.cause` typically has `code: ENOTFOUND` / `ECONNREFUSED` and a
 *     message like `getaddrinfo ENOTFOUND host.docker.internal` or, on
 *     Node/undici with certain resolvers, the literal string `name
 *     resolution failed`.
 *
 * We walk the `.cause` / `.context` chain collecting every message +
 * code we can find, then classify: network failure vs plain error. This
 * catches the DNS symptom regardless of which runtime surfaced it
 * (undici, Deno, Bun, node-fetch) and rewrites it into a message that
 * points at the actual cause ("Is Supabase running?").
 */

interface InvokeErrorLike {
  readonly name?: string;
  readonly message?: string;
  readonly code?: string;
  readonly context?: unknown;
  readonly cause?: unknown;
  readonly hostname?: string;
}

const NETWORK_ERROR_NAMES = new Set(['FunctionsFetchError', 'FunctionsRelayError']);

const DNS_CODES = new Set([
  'ENOTFOUND',
  'EAI_AGAIN',
  'EAI_NONAME',
  'EAI_NODATA',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
]);

/**
 * Substrings we treat as evidence of a network / DNS failure anywhere
 * in the error chain. Matched case-insensitively. Kept broad on
 * purpose — better to over-classify a network failure with a helpful
 * hint than to leak raw runtime strings.
 */
const NETWORK_ERROR_PHRASES = [
  'fetch failed',
  'name resolution failed', // undici DNS failure phrasing
  'name not resolved',
  'nodename nor servname', // macOS getaddrinfo
  'getaddrinfo',
  'econnrefused',
  'econnreset',
  'etimedout',
  'network error',
  'networkerror',
  'unable to resolve',
];

export async function extractInvokeMessage(error: unknown, fallback: string): Promise<string> {
  const err = error as InvokeErrorLike;
  const ctx = err.context;

  // ── Case 1: HTTP error — Response context with a JSON error body ──
  if (isResponseLike(ctx)) {
    const message = await readErrorFromResponse(ctx as Response);
    if (message) return message;
  }

  // ── Case 2: Network / fetch failure — request never reached the function ──
  const signals = collectSignals(error);
  if (looksLikeNetworkFailure(err, signals)) {
    return describeNetworkFailure(signals);
  }

  // ── Case 3: Anything else — surface the message, else caller's label ──
  return err.message ?? fallback;
}

function isResponseLike(ctx: unknown): ctx is Response {
  return (
    typeof ctx === 'object' &&
    ctx !== null &&
    'clone' in ctx &&
    typeof (ctx as { clone?: unknown }).clone === 'function'
  );
}

async function readErrorFromResponse(response: Response): Promise<string | null> {
  const cloned = response.clone();
  try {
    const parsed = (await cloned.json()) as {
      message?: string;
      error?: { message?: string };
    } | null;
    if (parsed?.error?.message) return parsed.error.message;
    if (parsed?.message) return parsed.message;
  } catch {
    try {
      const text = await response.clone().text();
      if (text.trim().length > 0) return text.slice(0, 240);
    } catch {
      // fall through
    }
  }
  return null;
}

interface ErrorSignals {
  readonly names: readonly string[];
  readonly messages: readonly string[];
  readonly codes: readonly string[];
  readonly hostnames: readonly string[];
}

/**
 * Walk `.cause` and `.context` chains up to a small depth, collecting
 * every name / message / code / hostname we see. Bounded so a cyclic
 * chain can't hang the classifier.
 */
function collectSignals(root: unknown): ErrorSignals {
  const names: string[] = [];
  const messages: string[] = [];
  const codes: string[] = [];
  const hostnames: string[] = [];
  const seen = new WeakSet<object>();

  const walk = (node: unknown, depth: number) => {
    if (!node || typeof node !== 'object' || depth > 5) return;
    if (seen.has(node as object)) return;
    seen.add(node as object);
    const n = node as InvokeErrorLike;
    if (n.name) names.push(String(n.name));
    if (n.message) messages.push(String(n.message));
    if (n.code) codes.push(String(n.code));
    if (n.hostname) hostnames.push(String(n.hostname));
    walk(n.cause, depth + 1);
    walk(n.context, depth + 1);
  };

  walk(root, 0);
  return { names, messages, codes, hostnames };
}

function looksLikeNetworkFailure(err: InvokeErrorLike, signals: ErrorSignals): boolean {
  for (const name of signals.names) {
    if (NETWORK_ERROR_NAMES.has(name)) return true;
  }
  for (const code of signals.codes) {
    if (
      DNS_CODES.has(code) ||
      code === 'ECONNREFUSED' ||
      code === 'ETIMEDOUT' ||
      code === 'ECONNRESET'
    ) {
      return true;
    }
  }
  const combined = signals.messages.join(' | ').toLowerCase();
  for (const phrase of NETWORK_ERROR_PHRASES) {
    if (combined.includes(phrase)) return true;
  }
  // Some runtimes surface just the raw wrapper — the fallback error is
  // still useful evidence.
  if (err.name && NETWORK_ERROR_NAMES.has(err.name)) return true;
  return false;
}

function describeNetworkFailure(signals: ErrorSignals): string {
  const dnsCode = signals.codes.find((c) => DNS_CODES.has(c));
  const hostname = signals.hostnames[0];
  const hasDnsMessage = signals.messages.some((m) => {
    const lower = m.toLowerCase();
    return (
      lower.includes('name resolution') ||
      lower.includes('nodename nor servname') ||
      lower.includes('getaddrinfo') ||
      lower.includes('unable to resolve')
    );
  });

  if (dnsCode || hasDnsMessage) {
    return hostname
      ? `Couldn't reach the Edge Function service — ${hostname} did not resolve. Check that Supabase is running and reachable.`
      : "Couldn't reach the Edge Function service — the hostname did not resolve. Check that Supabase is running and reachable.";
  }
  if (signals.codes.includes('ECONNREFUSED')) {
    return 'The Edge Function service refused the connection. Is Supabase running locally?';
  }
  if (signals.codes.includes('ETIMEDOUT') || signals.codes.includes('ECONNRESET')) {
    return 'The Edge Function request timed out. Check your connection or retry.';
  }
  return 'The Edge Function service is unreachable. Check that Supabase is running.';
}

/**
 * `supabase.functions.invoke` returns { data, error }. On success, some
 * of our functions return { scopeId } directly, others nest it under
 * `.data`. Handle both.
 */
export function extractScopeId(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as { data?: { scopeId?: unknown }; scopeId?: unknown };
  const nested = record.data?.scopeId;
  const flat = record.scopeId;
  return typeof nested === 'string' ? nested : typeof flat === 'string' ? flat : null;
}
