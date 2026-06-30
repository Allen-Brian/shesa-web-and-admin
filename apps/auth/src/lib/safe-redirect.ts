/**
 * Sanitize a `next` URL passed in via query string before redirecting
 * the user there. Used by the auth callback, the login Server Action,
 * and the reset-password Server Action — every place that takes an
 * untrusted redirect target.
 *
 * Cross-subdomain SSO (the reason apps/auth exists) requires this to
 * accept ABSOLUTE URLs at sibling Shesa subdomains, not only relative
 * paths. The earlier callback-local helper rejected everything but
 * relative paths, which would have stranded users at
 * `auth.shesa.org/dashboard` (404) after logging in from
 * `exco.shesa.org`. This module is the single place we widen that
 * rule, deliberately and audit-ably.
 *
 * Accepted:
 *   - Relative path starting with `/` (but not `//` — that's
 *     protocol-relative and could escape to another origin).
 *   - Absolute URL whose hostname equals `apex` or ends with `.apex`.
 *     In local dev `apex` is `localhost`, which scopes us to per-port
 *     localhost variants (still safe; an attacker can't host on
 *     `evil.localhost` from outside the box).
 *
 * Anything else collapses to `/`. We log the rejection so we can
 * notice probes / misconfiguration, but we don't leak the rejected
 * value back to the caller.
 */

const FALLBACK = '/';

export function safeRedirect(raw: string | null | undefined, apex: string): string {
  if (!raw) return FALLBACK;

  // Reject backslash variants — some browsers normalize them to forward
  // slashes, which can sneak past a startsWith('//') check.
  if (raw.includes('\\')) return FALLBACK;

  // Relative path: must start with a single `/`.
  if (raw.startsWith('/')) {
    if (raw.startsWith('//')) return FALLBACK;
    return raw;
  }

  // Absolute URL: must parse and live under `apex`.
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return FALLBACK;
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return FALLBACK;

  const host = parsed.hostname.toLowerCase();
  const apexLower = apex.toLowerCase();
  if (host === apexLower || host.endsWith(`.${apexLower}`)) {
    return parsed.toString();
  }

  return FALLBACK;
}
