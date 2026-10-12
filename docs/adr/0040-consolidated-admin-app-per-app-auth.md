# 0040 — Consolidated `apps/admin` (Next.js) + per-app auth

- **Status:** accepted
- **Date:** 2026-07-02
- **Deciders:** Lead
- **Supersedes:** ADR-0035 (SPA session bridge)

## Context

Phase 1 shipped four apps sharing a central `apps/auth` for single sign-on: `apps/auth` (Next.js), `apps/web` (Next.js public + CMS), `apps/exco` (Vite SPA), `apps/finance` (Vite SPA). The two Vite SPAs couldn't read the apex-scoped `httpOnly` Supabase Auth cookie server-side (SPAs are static bundles served to the browser; there's no per-request middleware), so `apps/auth` grew a credentialed cross-origin `/api/session` endpoint (ADR-0035) that returned identity + access token as JSON. The Vite SPAs called it on mount, hydrated a Zustand session store, and sent the access token as a `Bearer` header to every Edge Function call.

That design carried several sharp edges:

1. **A CORS-credentialed cross-origin endpoint returning identity.** The `/api/session` route had to accept credentialed requests from every Shesa subdomain, in every env. The allowlist grew to ~15 entries; every new subdomain required a code change in `packages/config/src/cors-allowlist.ts`.
2. **JS-visible session tokens.** The access token lived in the Zustand store on the SPA. ADR-0035 §Consequences analyzed the XSS damage window (session hijack for up to the access-token TTL) as an accepted trade-off. It was accepted, but it was still a live surface.
3. **Two write paths.** ADR-0033 already put the tension between Server Actions and Edge Functions on the record; the SPA architecture leaned entirely on Edge Functions (SPAs have no server), which meant every mutation was a Deno round-trip.
4. **Cross-subdomain cookie propagation between staging and prod.** The `.shesaconnect.com` apex cookie technically leaked between envs; memory `project_domains.md` records this as a deliberate but ugly trade-off.

Meanwhile:

- `apps/exco` and `apps/finance` were both going to consume the same design system, the same context switcher, the same permission checker over the same scope tree. Splitting them into two apps duplicated the shell.
- The Editor role authors scoped content that belongs to the same scope tree as members / positions / events. Splitting Editor to `apps/web/cms` reintroduced the "one person, two apps, two sidebars for one branch" friction the app merger existed to kill.

## Decision

**Consolidate to two Next.js apps and let each own its own auth.**

- `apps/auth`, `apps/exco`, `apps/finance` → deleted.
- `apps/admin` (Next.js App Router at `admin.shesaconnect.com`) → hosts three personas — **Exco**, **Finance**, **Editor** — inside a role-adaptive shell. Owns its own login / forgot / reset pages. Middleware reads the `httpOnly` cookie server-side natively.
- `apps/web` (Next.js at `shesaconnect.com`) → stays fully public. No auth-gated routes in this pivot. Published content (announcements, eventual CMS pages) renders via SSG/ISR from the shared DB; authoring happens in `apps/admin/(personas)/editor/*`, not in `apps/web/cms`.
- Session cookie stays apex-scoped (`.shesaconnect.com`) so future cross-app sharing is one middleware read away, but nothing in Phase 2 depends on it.

**The pivot is a security simplification, not a topology cleanup:**

- The `/api/session` endpoint dies with `apps/auth`. No CORS-credentialed cross-origin identity endpoint exists anywhere.
- No session token lives in JS. Server Actions in `apps/admin` run server-side; the session cookie is `httpOnly`. An XSS payload on the admin bundle can't exfiltrate what isn't there. The XSS damage window ADR-0035 analyzed becomes structurally impossible.
- CORS allowlist collapses from ~15 entries (5 origins × 3 envs) to ~5 entries (admin's own origin per env). It exists only for the rare client-component-calls-Edge-Function case.
- `supabase/functions/get-my-grants/` retires. Server Components read `core.get_user_grants(uuid)` directly via the server supabase-js client; grant-changing Server Actions call `revalidatePath('/[persona]')` for the re-fetch. One fewer moving part, one fewer thing to keep in sync with grants schema evolution.

**The three-persona shell inside `apps/admin`:**

- Personas: `exco` (governance), `finance` (treasury/contributions/reports), `editor` (scoped content authoring including announcements + Phase 5 CMS pages).
- Role → persona-eligibility: `mainstream_admin` / `branch_admin` / `batch_admin` → Exco; `finance` → Finance; `editor` / `announcer` → Editor; `recruiter` → no admin-app persona.
- URL structure: persona-prefixed route groups (`/exco/*`, `/finance/*`, `/editor/*`) plus `(auth)` for login/reset.
- Persona default resolution: a `core.profiles.preferred_persona` column persists the sticky choice server-side (survives cleared browsers + new devices). If null, a grant-weighted heuristic runs (count active grants per persona; ties break finance > exco > editor to protect finance officers who are only incidentally admins).
- Persona switcher in header dropdown; only rendered when eligible count > 1.
- Sidebar items still permission-gated (via `<PermissionGuard>` from Phase 1) AND scope-capability-gated (an item that needs `scope_capabilities.can_have_treasury` hides at scopes that lack it).

## Consequences

**What this makes easy:**

- Auth becomes boring in the best way. Each app has its own login page; each app's middleware reads its own cookie. No bridge, no CORS gymnastics, no SPA hydration dance.
- The security review surface shrinks. There is no cross-origin credentialed endpoint. There is no JS-side token. The CORS allowlist has one entry per env.
- The design system in `packages/ui` (shadcn Sidebar + AG Grid data-table + TipTap rich editor + everything) integrates cleanly — the pre-placed components already assume Next.js (`'use client'` directives) so they map naturally.
- Server Actions become the default write path for `apps/admin`. Same-origin, no CORS at all.

**What this makes harder:**

- `apps/admin` is a bigger bundle than `apps/exco` alone was. For a members-only admin dashboard on Cameroonian 3G, Next.js SSR still wins on TTI (server renders the first paint; the client hydrates progressively) but the total download over a session is bigger. Accepted trade-off.
- A user working on both governance AND finance switches personas via the dropdown. That's more clicks than "everything on one sidebar" — but it's the whole point of the persona model (Finance is a completely different mental context from Exco; merging their sidebars would be worse UX).
- Deploy adds `apps/admin` and removes three apps. Infra needs a one-time Caddyfile + docker-compose + workflow update (E2.pivot.G).

**What this implies:**

- ADR-0033 gets a **hard rule** appended (see the ADR-0033 refinement note): Server Actions may write directly via supabase-js only for single-row updates the actor already provably controls. Anything touching `core.role_assignments`, `core.registration_status` financial timestamps, `exco.events` contribution settings, `exco.announcements`, or any future `finance.*` schema goes through an Edge Function, always, no exception. The "two write paths" tension was manageable when Vite SPAs had no choice; Next.js Server Actions make the tension load-bearing, so the line has to be drawn now.
- ADR-0035 (SPA session bridge) is superseded. Its body remains as the historical record.
- ADR-0014 (`httpOnly` cookie, no `localStorage`) is _stronger_ post-pivot than at Phase 1 launch — there's no JS session token at all now, not even the access token that ADR-0035 admitted to.

## Alternatives considered

**Keep four apps + retain the SPA session bridge.** Rejected: the bridge is expensive infrastructure that existed only because SPAs couldn't read the cookie. With two Next.js apps, the mechanism is transparent middleware. Every argument for the bridge assumed Vite SPAs; moving admin to Next.js eliminates the argument.

**Keep `apps/exco` and `apps/finance` as Vite, retain the bridge.** Rejected for the same reason plus: the pre-placed shadcn components are `'use client'`-marked, which assumes Next.js. Making them work in Vite is possible but incurs an ongoing tax with no benefit.

**Move `apps/admin` to Next.js but keep `apps/auth` for centralized login.** Rejected as half-measure: `apps/auth` existed to serve as the SSO endpoint for four apps. With only `apps/admin` needing authenticated access (and `apps/web` staying public), letting admin own its login collapses one full app + all its CORS surface.

**Editor persona in `apps/web/cms` instead of `apps/admin/(personas)/editor`.** Rejected on the argument recorded in this ADR's Context: authoring is a scoped governance task and shares the context switcher / scope-capability gates / audit trail / permission checker with the other admin personas. `apps/web` serves published content; it doesn't need to author it. Sharing a database is enough; sharing an app is what the pivot exists to avoid.
