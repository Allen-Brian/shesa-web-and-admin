/**
 * Response security headers, applied by both Next apps (SEC-18).
 *
 * Neither app sent any of these. What each one closes:
 *
 * - **HSTS** — a first request over http:// is a downgrade opportunity;
 *   after this header the browser refuses plaintext for the domain.
 * - **nosniff** — stops a browser from re-interpreting an uploaded file as
 *   HTML or JavaScript because its bytes look like it. Directly relevant
 *   here: nine public Storage buckets accept editor uploads whose
 *   `Content-Type` is browser-declared, not sniffed server-side.
 * - **frame-ancestors / X-Frame-Options** — clickjacking. The admin app
 *   has one-click destructive actions behind a session cookie, which is
 *   exactly the shape that framing exploits.
 * - **Referrer-Policy** — admin URLs carry scope slugs and member ids in
 *   the path; `strict-origin-when-cross-origin` keeps them out of the
 *   Referer sent to third-party hosts.
 * - **Permissions-Policy** — neither app uses camera, microphone or
 *   geolocation, so nothing embedded in a page should be able to ask.
 *
 * `frame-ancestors` is the only CSP directive here on purpose. A full
 * policy needs per-request nonces threaded through the document (Next
 * emits inline bootstrap scripts and styled-jsx), and a CSP that is wrong
 * fails silently in the browser rather than at build time. That work is
 * deliberately separate; `frame-ancestors` needs no nonce and cannot
 * break rendering.
 */

/** @type {ReadonlyArray<{ key: string, value: string }>} */
export const SECURITY_HEADERS = [
  // Two years, subdomains included. Browsers ignore this over plain http,
  // so it is inert in local development.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  // Supersedes X-Frame-Options where both are understood; the older header
  // stays for clients that do not read CSP.
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
];
