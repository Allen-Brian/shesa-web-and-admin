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
