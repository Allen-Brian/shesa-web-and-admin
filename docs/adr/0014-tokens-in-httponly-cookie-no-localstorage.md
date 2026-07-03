# 0014 — Auth tokens never in localStorage; refresh in httpOnly cookie

- **Status:** accepted
- **Date:** 2026-06-29
- **Deciders:** Lead

## Context

`localStorage` is readable by any JavaScript on the page — one XSS, one stolen token. Refresh tokens last hours to days, so theft is catastrophic. We also want SSO across Shesa subdomains (web / exco / finance / connect) without each app re-implementing auth.

## Decision

Use **Supabase Auth's cookie-based session** for all Next.js apps via `@supabase/ssr`:

- **Access token + refresh token** stored in **httpOnly, Secure, SameSite cookies** scoped to the Shesa root domain. JavaScript never touches the refresh token.
- Cookies are set and read by Server Actions / middleware via `@supabase/ssr` — never `localStorage`.
- For any plain React (Vite) apps in the stack: same model — configure the Supabase client with cookie-based storage, not the default `localStorage` adapter.
- **`localStorage` for tokens is BANNED.**
- Rotate refresh tokens on use (Supabase does this by default).
- Pairs with **CSRF protection** — Next.js Server Actions get this for free via Next's built-in origin checks; explicit double-submit CSRF token added for any Route Handler exposed to non-Shesa origins.

The shared cookie domain gives **SSO across all Shesa subdomains** (web / exco / finance / connect) for free.

## Consequences

- XSS can no longer steal the refresh token (its primary value).
- Single sign-on across subdomains is mechanical, not a feature to build.
- All apps must live under the same root domain for the shared cookie.
- Logout must purge the TanStack Query cache, the Zustand store, and any persisted/IndexedDB cache — **shared phones and cybercafés are common in Cameroon**; if logout doesn't wipe, the next person sees the previous user's data.
- Supabase Auth handles password reset, OTP, magic links, and refresh-token rotation natively — we don't run that code.

## Alternatives considered

- **`localStorage` for tokens** (Supabase's default `@supabase/supabase-js` browser config) — rejected: XSS exposure.
- **`sessionStorage`** — rejected: still JS-readable.
- **Per-app auth (no SSO)** — rejected: bad UX for members using multiple Shesa apps.

## Phase 2 refinement (non-decision) — even stronger post-pivot

The Phase 2 pivot (ADR-0040) merged the two Vite SPAs into one Next.js `apps/admin` and retired `apps/auth`. Result: **no session token lives in JS at all** — not the refresh token (which this ADR always kept in the httpOnly cookie), and not the access token either (which ADR-0035's SPA session bridge briefly exposed to JS on the SPAs before that bridge was superseded). Server Actions in `apps/admin` run server-side; the cookie is httpOnly; the client bundle can't see either token. ADR-0014's original stance is _stronger_ post-pivot than at Phase 1's launch.

The "per-app auth (no SSO)" alternative this ADR rejected in Phase 0 (before four apps existed) is now the pivot's chosen path — but with the apex-scoped cookie preserved as a future-proofing seam, not for present-day cross-app session sharing. Two Next.js apps, each owning its login page, each reading the same apex cookie server-side if we ever need to share. The "bad UX" concern from the rejected alternative doesn't apply post-pivot because there are only two apps and `apps/web` is public.
