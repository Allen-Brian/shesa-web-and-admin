# Security

Threat model, security decisions, controls, and the data-protection posture.

## What lives (or will live) here

- Threat model per app / data class
- Authorization model in depth (Supabase RLS as primary, Server Action policy checks as second layer)
- Secrets management (Docker Swarm secrets on the Contabo VPS, GitHub Actions secrets in CI)
- Data-protection compliance (Cameroon Law No. 2024/017 authorization, GDPR DPAs)
- Vendor security review notes (Supabase, Contabo, Cloudflare)
- Incident response process

## Anchors already locked

- **Cross-border data transfer** (Cameroon → Frankfurt) requires Cameroonian Personal Data Protection Authority authorization under **Law No. 2024/017**. Owner and deadline tracked separately. See [ADR-0020](../adr/0020-cross-border-data-compliance.md).
- **GDPR DPAs** to be signed with Supabase and Contabo.
- **Sovereignty caveat:** Supabase Inc. is US-incorporated (CLOUD Act / Schrems II) — Frankfurt solves residency, not sovereignty. Revisit for sensitive financial / KYC data later.
- **Supabase service-role key banned from any client bundle** — only ever used inside Next.js Server Actions / Route Handlers / Edge Functions, never shipped to the browser. The browser-side client uses the anon key with RLS enforcing access.
- **`localStorage` banned for auth tokens** — Supabase Auth's default cookie-based session is used for Next apps (httpOnly cookie scoped to the Shesa root domain), giving SSO across all Shesa apps for free. See [ADR-0014](../adr/0014-tokens-in-httponly-cookie-no-localstorage.md).
- **Idempotency keys mandatory** on all payment / critical mutations — MTN MoMo and Orange Money flows must not double-charge on flaky 3G retries. See [ADR-0015](../adr/0015-idempotency-keys-mandatory.md).

## Reporting a vulnerability

See the root `SECURITY.md` (added at repo init).
