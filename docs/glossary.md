# Glossary

The single definitive page for Shesa's domain language. When the four apps, the shared packages, and design all use the same word for the same thing, whole classes of bugs and meetings disappear.

Add a new term here **before** introducing it in code, an ADR, or a PR. Every entry has a strict shape; see [`standards/documentation.md`](standards/documentation.md) §5.

---

## A

### Achievement

**A professional or academic accomplishment recorded against a Member's profile in Shesa Connect.**

Members log achievements (degrees, certifications, promotions, awards) with images and attachments. Other members may eventually react and comment (future feature).

**What it is NOT:** a Position. A Position is an elected/appointed role within the org; an Achievement is the member's personal record.

**In code:** lives in the `connect` schema. Phase 8.

### Announcement

**A message published by an Announcer to a defined audience scope (a Branch, a Chapter, the whole Mainstream).**

Announcements are created in Shesa Exco and delivered through Connect forums and the notification engine.

**What it is NOT:** a Forum post. Announcements push to recipients; forum posts wait to be read.

**In code:** `cms.announcements` and `connect.forum_posts` (announcements are pinned forum posts at the relevant scope).

### Autonomy switch

**A per-Scope flag that lets a node manage its own membership and finance independently of its parent.**

When a Branch turns autonomy on, its finance configuration (charges, currency, treasury) is its own, and parent-level admins lose write authority over those domains for that subtree.

**What it is NOT:** a permission. Autonomy is a structural property of the node; permissions still flow through roles and flags.

**In code:** boolean on `core.scopes`; consulted by the policy module and RLS.

---

## B

### Batch

**A cohort grouping within a Chapter — typically members who joined or graduated in the same year.**

A Chapter has many Batches; a Batch contains Members and may contain Houses.

**What it is NOT:** a Branch or Chapter (those are higher in the hierarchy). Not a Sector (Sectors are functional, not cohort-based).

**In code:** `core.scopes` row with `scope_type = 'batch'`.

### Branch

**The top-level geographic / regional division under Mainstream.**

Shesa's hierarchy starts with Mainstream → Branch → Chapter → Batch → House → Sector. A Branch typically corresponds to a city or region.

**What it is NOT:** a Chapter (a finer subdivision within a Branch). Not a Sector (Sectors cut across the hierarchy).

**In code:** `core.scopes` row with `scope_type = 'branch'`.

---

## C

### Chapter

**A subdivision within a Branch — typically a sub-region, campus, or organizational unit.**

A Branch contains many Chapters; a Chapter contains Batches.

**What it is NOT:** a Batch (Batches are cohorts inside Chapters). Not a Branch.

**In code:** `core.scopes` row with `scope_type = 'chapter'`.

### Charge

**A financial obligation defined at a Scope level that becomes a Member-level Obligation when applied.**

Charges can be recurring (monthly, yearly, bi-yearly) or one-time. They target either individual Members or organizational bodies (a whole Chapter, all Members of a Batch). When generated, a Charge produces one Obligation per target Member.

**What it is NOT:** an Obligation (the Member-specific instance). Not a Payment (which fulfills an Obligation).

**In code:** `finance.charges`. The Charge Engine generates Obligations via a recurring job. Phase 3.

### Claim (account)

**The action a Member takes to activate an invited account — confirming their identity and setting a password / OTP method.**

Member creation flow: an Admin creates the Member record → an email invitation is sent (SMS fallback) → the Member opens the invite link and claims the account, after which the Member's `auth.users` row is linked to their Shesa Membership.

**What it is NOT:** Account creation (the admin's action). Not Join request (which is a Member-initiated request to enter the org).

**In code:** Supabase Auth invite + recovery flow; backed by `core.memberships` and `auth.users`.

---

## D

### Domain event

**A past-tense, namespaced fact emitted by a domain that other domains can react to.**

Examples: `member.transferred`, `charge.generated`, `payment.recorded`. Domain events are how Shesa's schemas communicate asynchronously without directly accessing each other's tables.

**What it is NOT:** a command (which uses the imperative — "transfer this member"). Events are facts about something that already happened.

**In code:** written to a domain's `<domain>.outbox` table inside the business transaction; consumed by Edge Functions (now) or a Node worker (later). See [ADR-0008](adr/0008-transactional-outbox.md).

---

## E

### Echoes

**Shesa's music section in the public web app — albums, streaming, and downloads.**

A CMS-managed area for sharing music produced by the org / community.

**What it is NOT:** Stream (which is for live meetings and protected video).

**In code:** managed via the `cms` schema. Phase 5.

### Edge Function

**A Deno function deployed to Supabase's edge runtime, used for webhooks and lightweight background work.**

In Shesa: receives MTN MoMo and Orange Money webhooks, runs daily scheduled tasks invoked by pg_cron, processes Database Webhook events from the outbox.

**What it is NOT:** a Server Action (which is a Next.js construct, invoked by the app). Not a worker container (which is the future Tier B for heavy jobs).

**In code:** `supabase/functions/<name>/index.ts`. See [ADR-0032](adr/0032-hybrid-background-jobs.md).

### Exception

**A finance rule that overrides a Charge for specific Members or Scopes.**

Exceptions are defined by criteria — years since exit, batch, age, House, or named individual — and modify or waive the Obligation that would otherwise be generated.

**What it is NOT:** a permission (it's a finance rule, not an authorization concept). Not a one-off Payment adjustment (those are recorded as separate ledger entries).

**In code:** `finance.exceptions`. Phase 3.

### Exco

**Short for Executive Committee — the governance body of a Scope.**

The `apps/exco` application is the dashboard used by executive committees to manage their members, governance, positions, events, and announcements.

**What it is NOT:** the Finance app (which is separate, even though Finance officers sit on the Exco). Not the public website.

**In code:** the `apps/exco` Next.js / React app.

---

## H

### House

**A sub-cohort within a Batch.**

Optional grouping below the Batch level. Used by some Branches; not all hierarchies populate this level.

**What it is NOT:** a Sector (Houses are nested under Batches; Sectors cut across the tree).

**In code:** `core.scopes` row with `scope_type = 'house'`.

---

## I

### Idempotency key

**A UUID the client generates once per user action and reuses across all retries, so a Server Action can run twice on the wire without taking effect twice.**

For Mobile Money payments over flaky Cameroonian 3G, a timed-out request that actually succeeded server-side must not double-charge when the client retries.

**What it is NOT:** a `traceId`. Each retry gets a new `traceId` for observability; the idempotency key is the _same_ across all retries of one user action.

**In code:** generated client-side per critical mutation; the server dedupes via `core.idempotency_keys`. See [ADR-0015](adr/0015-idempotency-keys-mandatory.md).

### Invitation

**An email (or SMS fallback) sent to a newly-created Member, containing a link to Claim the account.**

Sent by Shesa Exco via Supabase Auth's invite flow when an Admin imports or creates Members.

**What it is NOT:** a Join request (which originates from the prospective Member, not from an Admin).

**In code:** Supabase Auth `inviteUserByEmail` + a row in `core.invitations` tracking expiry and status.

---

## J

### Job

**A position vacancy posted by a Recruiter on Shesa Connect.**

Members search and view; Recruiters create, get approval, publish, and let postings expire.

**What it is NOT:** a Position (which is an internal role inside the org, not a vacancy posting). Not an Achievement.

**In code:** `connect.jobs`. Phase 8.

### Join request

**A request initiated by a prospective Member to join a Branch / Chapter.**

Approved by an Admin in Shesa Exco; on approval, the Registration fee Obligation is generated.

**What it is NOT:** an Invitation (which goes the other direction — Admin invites). Not a Claim (which activates an already-created account).

**In code:** `core.join_requests` → approval flow generates a `core.memberships` row + the registration `finance.obligation`.

---

## L

### Ledger

**The chronological record of every finance entry — Charges accrued, Payments received, Expenses paid out.**

The Ledger is the auditable source for treasury balances and Member statements.

**What it is NOT:** the Treasury (which is the running balance and inflows/outflows summary). Not a Receipt (which is one item from the ledger formatted for a Member).

**In code:** `finance.ledger_entries`. Phase 3.

### Live session

**A real-time chat session within a Forum in Shesa Connect, with a timer that auto-closes the session.**

Used for moderated discussions or events. Sessions are archived after closure and deleted after one year.

**What it is NOT:** a video call or meeting. For video, see Stream.

**In code:** `connect.live_sessions`. Phase 8.

---

## M

### Mainstream

**The single root of the Org hierarchy — the parent organization that contains all Branches.**

Shesa has exactly one Mainstream node.

**What it is NOT:** a Branch (Mainstream sits one level above Branches).

**In code:** `core.scopes` row with `scope_type = 'mainstream'`, `parent_id IS NULL`.

### Member

**An individual person who belongs to one or more Scopes in Shesa.**

Members have a profile, a Status, optional Positions, and a finance record. The Member lifecycle is: create → invite → claim → active / passive / transfer / exit.

**What it is NOT:** a Position (a Position is held by a Member). Not a `auth.users` row alone (an unclaimed Member exists in `core.memberships` before any `auth.users` row is linked).

**In code:** `core.members` profile + `core.memberships` (one row per Scope the Member belongs to) + a linked `auth.users.id`.

### Membership

**The Member's belonging to a specific Scope, with a Status (active / passive / transferred / exited).**

A Member typically has one active Branch membership, may have multiple Sector memberships, and accrues a status history over time.

**What it is NOT:** the Member (the person). Not a Role (a Role is an authority granted on top of a Membership).

**In code:** `core.memberships` (member_id, scope_id, status, valid_from, valid_to).

### Mobile Money

**Cameroon's dominant mobile payment system. The two major providers are MTN Mobile Money (MoMo) and Orange Money.**

Registration fees, monthly dues, one-off Charges — most Shesa monetary flows route through Mobile Money. Network reliability is uneven, which is the reason for [Idempotency keys](#idempotency-key).

**What it is NOT:** a credit-card system. Integration is via Mobile-Money provider APIs (MTN MoMo API, Orange Money API), not card processors.

**In code:** integrated in `finance` via Edge Function webhook receivers. Phase 3.

---

## O

### Obligation

**A Member-specific financial debt instance generated from a Charge.**

When a Charge runs (monthly recurring, one-time apply, etc.), it produces one Obligation per target Member. Obligations have a status (pending / partial / fulfilled / waived) and a balance.

**What it is NOT:** a Charge (the definition). Not a Payment (which fulfills an Obligation).

**In code:** `finance.obligations`. Generated by the Obligation Engine. Phase 3.

### Scope

**A node in Shesa's hierarchy — Mainstream, Branch, Chapter, Batch, House, or Sector.**

The umbrella concept that lets the policy module say "this Member is an admin of this node and everything under it."

**What it is NOT:** a Member. Members belong TO Scopes; they are not nodes themselves.

**In code:** `core.scopes` (one table for all node types, with a `scope_type` discriminator).

### Outbox

**A table per domain (`finance.outbox`, `core.outbox`, etc.) that holds Domain events written in the same transaction as the business change, awaiting dispatch.**

The relay (an Edge Function for now) reads dispatched-pending rows and runs the side effects.

**What it is NOT:** a queue (it's a durable log; the queue is whatever the relay enqueues into next — currently nothing, just direct dispatch).

**In code:** `<domain>.outbox`. See [ADR-0008](adr/0008-transactional-outbox.md).

---

## P

### Payment

**A monetary inflow recorded against one or more Obligations.**

Payments arrive via Mobile Money webhooks (most common), manual cash entries (recorded by a Financial Secretary), or pay-on-behalf (one Member paying for another).

**What it is NOT:** an Obligation (which is what's owed; a Payment is what was paid). Not a Receipt (which is the document issued for a Payment).

**In code:** `finance.payments`. Phase 3.

### Permission

**An action a Member can take on a resource — e.g. `member.read`, `charge.create`, `forum.post.publish`.**

Permissions are the atomic unit of authorization in Shesa. Server Action code asks `policy.can(member, 'charge.create', { branchId })`, never `if (role === 'admin')`.

**What it is NOT:** a Role (a Role is a named bundle of Permissions). Not a Position (Positions also imply Permissions but are visible UI badges in addition).

**In code:** evaluated by `packages/domain/policy/`. See [ADR-0006](adr/0006-casl-for-authorization.md).

### Permission flag

**A granular permission grant attached to a Member at a Scope — e.g. Editor, Recruiter, Announcer.**

Flags are narrower than functional Roles: a Member can be a Recruiter for Branch X without being an Admin.

**What it is NOT:** a Functional role (Admin, Finance — broader). Not a Position (which is publicly visible).

**In code:** `core.permission_flags` (member_id, flag, scope_id).

### Position

**An elected or appointed role inside a Scope — President, Vice President, Secretary, Treasurer, Financial Secretary, PRO, etc.**

A Position confers a bundle of Permissions plus a visible badge on the Member's profile. Positions have terms and expire.

**What it is NOT:** a Permission flag (Positions are publicly visible; flags are quieter grants). Not a functional Role (which is broader and not tied to elected office).

**In code:** `core.positions` (member_id, position_type, scope_id, valid_from, valid_to).

---

## R

### Receipt

**A document issued to a Member acknowledging a Payment.**

Receipts cite the Payment, the Obligations fulfilled, the date, and the issuing Scope.

**What it is NOT:** a Payment (which is the financial fact). Not a Ledger entry (which is the internal accounting record).

**In code:** `finance.receipts`. Generated by an Edge Function after a Payment is recorded. Phase 3.

### Recruiter

**A Member with the Recruiter Permission flag — authorized to post Jobs in Shesa Connect.**

Jobs posted by a Recruiter go through an approval step before publishing.

**What it is NOT:** an Admin (an Admin is a broader Functional role).

**In code:** a Permission flag in `core.permission_flags`. Jobs surface in `connect.jobs`.

### Resource

**The thing a Permission acts on — a Member, a Charge, a Forum post, a Branch, etc.**

The policy module evaluates `(action, resource)` pairs. Resources are typed and scoped to Scopes.

**What it is NOT:** a generic "anything." Resources are explicit types known to the policy module.

**In code:** registered with `packages/domain/policy/`.

### Role (functional)

**A broad named permission group, currently Admin or Finance.**

A Functional role grants its bundle of Permissions at a specific Scope (and everything under it, unless autonomy intervenes).

**What it is NOT:** a Permission flag (narrower) or a Position (visible badge).

**In code:** `core.role_grants` (member_id, role, scope_id).

---

## S

### Sector

**A functional grouping that cuts across the strict tree — e.g. "Tech Sector," "Welfare Sector."**

A Member may belong to multiple Sectors regardless of their Branch / Chapter / Batch path.

**What it is NOT:** a House or Batch (those are cohort-based, nested in Chapters / Batches).

**In code:** `core.scopes` row with `scope_type = 'sector'`. Membership in a Sector is just another `core.memberships` row.

### Server Action

**A Next.js function marked `'use server'` that runs on the server and is callable from client components — Shesa's main pattern for mutations.**

Server Actions wrap supabase-js, hold idempotency keys, call the policy module, and return the standardized error envelope.

**What it is NOT:** an Edge Function (which runs on Supabase's Deno edge). Not a Route Handler (a slightly different Next idiom for HTTP-shaped endpoints).

**In code:** `apps/*/app/.../actions.ts`. See [ADR-0030](adr/0030-supabase-as-baas-with-server-actions.md).

### Status (membership)

**Where a Member sits in their lifecycle: active, passive, transferred, exited.**

Status drives notification cadence (passive Members get re-engagement reminders), finance (exited Members typically don't accrue new Charges), and visibility.

**What it is NOT:** a Role or Position. Status is about the Member's relationship to the org over time, not their authority.

**In code:** column on `core.memberships`; append-only `core.membership_status_history`.

### Stream

**The protected video / meeting area in the public web app — embedded meetings, live links, authenticated access.**

Used for online events, sometimes Member-only.

**What it is NOT:** Echoes (music) or Live sessions (text chat). Stream is for video.

**In code:** managed via the `cms` schema. Phase 5.

---

## T

### Transfer

**A Member moving from one Branch (or Chapter / Batch) to another.**

A transfer ends the old Membership and opens a new one, preserving the Status history and any pending finance Obligations (which migrate or are settled per policy).

**What it is NOT:** exit (transfer keeps the Member active; exit ends Membership). Not a Status change alone — transfer specifically moves nodes.

**In code:** Server Action that closes the old `core.memberships` row and opens a new one; emits `member.transferred` event.

### Treasury

**A Scope's running balance and inflow / outflow summary.**

The Treasury aggregates Ledger entries: total Income, total Expenses, current Balance, by period.

**What it is NOT:** the Ledger (the chronological record). Not an Obligation (Treasury is org-level; Obligations are Member-level).

**In code:** computed from `finance.ledger_entries`. Cached views in `finance.treasury_snapshots` for fast reads. Phase 3.

---

## End notes

When you coin a new term in a Server Action, schema, or ADR, **add it here first** — and link this glossary from the doc where the term first appears.
