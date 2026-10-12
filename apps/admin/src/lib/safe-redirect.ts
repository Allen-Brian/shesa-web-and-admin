/**
 * Sanitize a `next` URL passed in via query string before redirecting
 * the user there. Used by the auth callback, the sign-in Server Action,
 * and the reset-password Server Action — every place that takes an
 * untrusted redirect target.
 *
 * Post-pivot (ADR-0040): admin no longer serves as the SSO gate for
 * sibling SPAs, but the apex-scoped cookie mechanism (ADR-0014) still
 * makes cross-subdomain redirects a valid use case — e.g. after
 * logging in on admin, redirecting to a marketing page on web that
 * uses the same session cookie for a "signed in as X" affordance.
 * Same-apex absolute URLs are therefore accepted.
 *
 * Accepted:
 *   - Relative path starting with `/` (but not `//` — that's
 *     protocol-relative and could escape to another origin).
 *   - Absolute URL whose hostname equals `apex` or ends with `.apex`.
 *     In local dev `apex` is `shesa.test`, which scopes us to
 *     `*.shesa.test` (still safe; an attacker can't host on
 *     `evil.shesa.test` from outside the box).
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
