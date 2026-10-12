# 0035 — SPA session bridge (`/api/session` on apps/auth)

- **Status:** superseded by ADR-0040
- **Date:** 2026-07-01
- **Deciders:** Lead

## Context

ADR-0014 committed Shesa to putting Supabase Auth tokens in an apex-scoped `httpOnly` cookie — read at `.shesaconnect.com` (or `.shesa.test` locally), invisible to JS, refreshed by each app's middleware. That works cleanly for Next.js apps (`apps/auth`, `apps/web`): middleware runs server-side, reads the cookie, hydrates the request context.

It doesn't work cleanly for the Vite SPAs (`apps/exco`, `apps/finance`, both members-only per phase 0 acceptance). SPAs are static bundles served to the browser; there's no per-request middleware, and by design the cookie is `httpOnly`, so `document.cookie` can't read it. This is why `apps/exco/README.md` and `apps/finance/README.md` both say the app is "not protected yet" — the cross-subdomain SSO mechanism exists, but the SPA can't see the session it produces.

Phase 1 makes the Exco SPA the primary Core Domain UI (members, memberships, roles, positions, imports, audit — spec §8). Every one of those screens needs the authenticated user's identity to:

- gate the route (redirect to `apps/auth` when there's no session),
- render the sidebar (nav sections hidden vs. shown by permission),
- send an `Authorization: Bearer <access_token>` header to Edge Functions (or rely on the cookie being forwarded, per below),
- show "signed in as X" and give the user a way to sign out.

Something has to bridge the httpOnly cookie into JS-accessible session state, and it has to do so without giving up any of ADR-0014's XSS-resistance.

Three shapes were considered (elicited in the Phase 1 planning session):

1. **`/api/session` bridge on apps/auth (this ADR).** A Next.js Route Handler at `apps/auth/api/session` reads the cookie server-side and returns `{ user, expiresAt }` as JSON. The SPA fetches with `credentials: 'include'` and stores the payload in a Zustand store.
2. **Backend-only auth.** SPA never holds a session in JS; every mutation calls an Edge Function which reads the cookie. Route guards and role-aware nav aren't possible.
3. **Migrate exco to Next.js SSR.** Sidesteps the problem entirely at the cost of a bundle-size regression on Cameroonian 3G and abandoning the deliberate SPA choice already encoded in `apps/exco`.

## Decision

Add **`GET /api/session`** to `apps/auth` as a Route Handler:

- Reads the session via `packages/supabase`'s server client (which sees the httpOnly cookie).
- Returns `{ user: { id, email }, expiresAt, accessToken }` as JSON. **No permissions, no service-role data, no refresh token.** Permissions come from a separate `get-my-grants` Edge Function so the identity probe stays cheap and the grants query has its own invalidation lifecycle.
- The **access token** IS in the response body because Edge Functions require an `Authorization: Bearer <jwt>` header, and the SPA has no other way to obtain the JWT (the cookie is httpOnly). The **refresh token** stays in the httpOnly cookie exclusively — see Consequences for the XSS analysis.
- CORS: `Access-Control-Allow-Origin` is set to the request `Origin` **only if** it appears in an explicit hardcoded allowlist (per env — local sibling hostnames, staging siblings, production subdomains). No wildcards; a credentialed `staging-*.shesaconnect.com` would trust any DNS name someone could stand up. `Access-Control-Allow-Credentials: true`, `Vary: Origin`. The allowlist is the canonical `packages/config/src/cors-allowlist.ts`.
- `OPTIONS` handler for the preflight.
- Rate limit: none in Phase 1 (Supabase Auth itself rate-limits token refresh, which is the actual load-bearing operation here). Revisit if abuse patterns surface.

The SPA side is a Zustand `useSessionStore` that fetches `/api/session` on mount, then immediately fetches `get-my-grants` for the cached permission list. See E1.0 in the Phase 1 plan for the store shape.

The httpOnly refresh-token cookie remains the **long-lived credential** and the **source of truth for session identity**. The JSON payload is a _view_ of the current session, refreshed on demand — including a fresh access token that Supabase middleware rotates transparently on each `/api/session` fetch. This partially relaxes ADR-0014's "no tokens in JS" stance (access token is JS-visible), narrowly and deliberately.

## Consequences

**What this makes easy:**

- Vite SPAs can now render authenticated shells: `apps/exco` in Phase 1, `apps/finance` in Phase 3 without a redesign.
- Sidebar and route guards render optimistically from cached grants; the mutation-time `check-permission` Edge Function call remains the authoritative gate, so a stale cache is a UX bug, not a security bug.
- The endpoint is small enough to be reused by any future SPA (a hypothetical mobile web app, a partner integration hitting `/api/session` with a cookie).

**What this makes harder:**

- Two round-trips before first meaningful paint (`/api/session`, then `get-my-grants` sequentially since grants needs the user id). Acceptable at Phase 1's scale; if 3G latency hurts, coalesce into `/api/session?include=grants`. Deferred until measurement.
- The Vite dev server (5173 by default, our ports 3002/3003) must send credentialed requests to the Next app running at 3001. This works with `credentials: 'include'` and the CORS allowlist — but the app can't be under a service worker that strips cookies.
- Every new hostname (a new subdomain, a new preview URL) requires an allowlist edit + redeploy. Explicit trade-off vs. wildcard convenience.

**What this implies:**

- Every SPA feature that shows "who am I" or "what can I do" reads from `useSessionStore`, not directly from `document.cookie` (impossible) or from a `supabase-js` client (which sees no session because the cookie is httpOnly).
- Server Actions and Edge Functions do NOT consume this endpoint — they already see the cookie server-side. It's a SPA-only bridge.
- Testing: the CORS allowlist must include the Playwright browser's Origin. In practice, Playwright runs the same dev server as the app, so the request Origin matches `http://exco.shesa.test:3002` and no test-specific allowlist entry is needed.

**XSS damage-window analysis for the exposed access token:**

An attacker with XSS on any Shesa SPA can read the access token from `useSessionStore` and impersonate the user for the current session. What they **cannot** do:

- Persist the impersonation beyond the access token's TTL. Supabase's default is 1 hour; we don't shorten it in Phase 1 because rotation cost on 3G outweighs the marginal safety gain at this stage. Revisit when we have telemetry.
- Refresh into a new session. The refresh token stays httpOnly — an XSS payload cannot exfiltrate it and cannot use `/api/session` to mint a fresh access token _from a different browser_, because `/api/session` reads the cookie of the calling browser, not an attacker's.
- Escalate to service-role. Nothing in this design ever exposes the service-role key to the browser.

So an XSS on our SPA is a bad day (session hijack for up to 1h), but not a catastrophic day (permanent account takeover). That matches the industry standard for cookie-bridged SPAs. If Phase 3 finance introduces payment endpoints that need tighter bounds, we can shorten access-token TTL or add per-endpoint step-up auth then.

## Alternatives considered

**Backend-only auth (SPA never holds session state).** Simplest — no bridge, no JSON endpoint. But route guards and role-aware sidebars need session-derived state on the client, and there's no way to render "signed in as Ada, showing Branch X actions" without something readable from JS. Rejected because Phase 1's Exco UI is the whole point of Phase 1, and its usability is downstream of this decision.

**Migrate `apps/exco` to Next.js SSR.** Middleware would read the cookie server-side and inject session props into every page — no client bridge required. But it rewrites an app that just shipped, adds a bigger bundle for the exact users who least need SSR benefits (members-only, no SEO), and contradicts the deliberate Vite choice recorded in `apps/exco/README.md`. Also doesn't scale to any other JS runtime we might want later (mobile web, Chrome extension, embedded widget).

**Encode session state into a second, JS-readable cookie.** Read the httpOnly session server-side, then set a separate `session-view` cookie without `httpOnly` containing `{ user_id, email, expiresAt }`. Cheaper than a JSON endpoint per page. But it doubles the XSS attack surface (an XSS payload could exfil the user identity even if it can't exfil the token) and creates two cookies to keep coherent across refresh, logout, expiry. Rejected as an optimization that trades safety for a round-trip we can afford.
