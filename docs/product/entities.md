# Shesa — Entity & Pages Specification

> Feature-level product spec for the Shesa Exco domain: what each entity is, what its pages look like, and how it behaves. Sits between the [ADRs](../adr/) (decisions, the _why_) and the code (implementation, the _what_). Updated in the same PR as any code that changes user-facing behavior.

---

## Purpose & scope

This document is the working reference for the Shesa Exco domain's entities and their admin pages. It captures **what a Branch is, what an Announcement does, how the Audience selector works** — the product layer that migration files, ESLint rules, and ADRs alone don't cover.

**In scope for v1:** the Exco surface — Country/Region · Houses · Networks · Branches · Chapters · Batches · Memberships (+ profile) · Events · Announcements, plus the shared Audience/Publishing engine and cross-cutting rules.

**Out of scope (added when their phase opens):** finance flows (Phase 3), CMS entities (Phase 5), Connect (Phase 8), Notifications templates (Phase 6).

---

## How to read this doc

Each entity is marked one of:

- **Built ✓** — schema + Edge Functions + admin UI shipped. Links go to the actual files.
- **Design only — Phase N** — locked in design, not yet coded. Proposed data model + views.

Sections marked **Product intent (TODO)** are built entities whose older-thread design conversations haven't landed here yet — the code shape is captured, the product intent needs the user to drop the design content.

Cross-references:

- Domain terms → [../glossary.md](../glossary.md)
- Decisions (the "why") → [../adr/](../adr/)
- Conventions (the "how") → [../standards/](../standards/)
- Curated ERD → [../data-model/](../data-model/)
- Phased build plan → [../roadmap.md](../roadmap.md)

---

## Cross-cutting rules

Rules that apply across multiple entities. Each is called out inline where it manifests, and gathered here for reference.

### Remove vs. archive (soft-delete only)

Nothing in the Exco domain is hard-deleted. Every entity carries an archive lifecycle state (or equivalent — `left` on memberships, `archived` on scopes, `unpublished` on events/announcements). Reasons: history preservation, membership continuity, audit trail integrity per [ADR-0007](../adr/0007-tenancy-model-orgs-and-grants.md) and audit invariants per [ADR-0034](../adr/0034-pgtap-database-tests.md).

**Product intent (TODO):** the older-thread design conversation locked specifics — when the archive action is visible vs. hidden, what the "restore" flow is, whether archived entities appear in filters, and how archived rows interact with audience resolution. Paste that here.

### Engagement tiers

**Product intent (TODO):** the older-thread design conversation defined member engagement tiers (active / passive / etc.) with specific behaviors around notifications, targeting eligibility, and re-engagement cadence. Paste the locked design here.

Related built code:

- Membership status enum: [supabase/migrations/20260701213947_create_core_memberships.sql](../../supabase/migrations/20260701213947_create_core_memberships.sql)
- Passive rules helper: [packages/domain/src/memberships/passive-rules.ts](../../packages/domain/src/memberships/passive-rules.ts)
- Deceased cascade: [supabase/migrations/20260701214406_deceased_cascade_and_extend_member_rls.sql](../../supabase/migrations/20260701214406_deceased_cascade_and_extend_member_rls.sql)

### Registration boolean

**Product intent (TODO):** the older-thread design conversation defined the registration-fee boolean logic on branches / autonomous chapters and its interaction with membership approval. Paste the locked design here.

Related built code:

- `registration_fee_*` columns on [core.branches](../../supabase/migrations/20260703120000_create_core_branches.sql) and [core.chapters](../../supabase/migrations/20260703120100_create_core_chapters.sql)
- Registration state derivation: [packages/domain/src/registration/state.ts](../../packages/domain/src/registration/state.ts)

---

## Shared Audience & Publishing engine

**Status:** Design only — Phase 2 (target)
**Depends on:** [notifications.notification_deliveries](../../supabase/migrations/20260630144042_init_notifications_schema.sql) (built), scope hierarchy per [ADR-0007](../adr/0007-tenancy-model-orgs-and-grants.md) (built), Edge Function entity-router pattern (built — see e.g. [supabase/functions/branches/](../../supabase/functions/branches/))
**Consumers:** Announcements (all delivery), Events (reminders + change-notifications), and later Contributions targeting.

### The primitive

**One publishing primitive: an addressed, rich-text message delivered per-recipient with read state.** It's reached two ways — as a standalone Announcement or as a reminder auto-emitted by an Event — but there is one implementation of "who gets it, how it's delivered, when it's read."

### Audience selector (five-group AND-across, OR-within)

Five filter groups — **Membership · Location · Houses · Networks · Batches**. Each is either "All" or a specific selection, with first-5-then-search UI for large lists.

**Combination rule (locked):**

- **OR within a group** — selecting House A and House B matches members in either.
- **AND across groups** — selecting Houses A/B and Location Douala matches members in (A or B) AND in Douala.
- **"All" drops out of the AND** — no constraint on that dimension.

Resolved audience = intersection of the five groups.

**Any scope admin can target globally.** A Branch admin can set Membership = Global (a Buea branch inviting the entire association is legitimate). Targeting breadth is a _choice_, not a permission limit. The only permission guard is that the admin must control the _creating_ scope; who they _invite_ is unrestricted.

**UI rendering:**

- List rows and detail views show the audience as human chips: `"St Thomas · Legal · Douala"`, or a single `"All members"` for plain broadcasts.
- Truncation rule: first 2 chips + `+N more` (tooltip or detail view has the full breakdown).

### Audience resolver + count endpoint

One server-side function takes an `AudienceDefinition` and returns the matching member set. Same function powers both the resolved delivery list and the live count preview shown to admins.

**Two endpoints** (per the entity-router pattern):

- `supabase.functions.invoke('audience/resolve')` — full member ID list; used when publishing.
- `supabase.functions.invoke('audience/count')` — `SELECT COUNT(*)` only; used for the live "reaches ~N members" preview. Cheap so the preview stays snappy on 3G.

**Package layout:**

- `packages/domain/audience/` — Zod schema for `AudienceDefinition`, chip-rendering helper, resolver contract (type interface).
- `supabase/functions/audience/{resolve,count}.ts` — actual queries; `index.ts` router dispatches per action.

### Publishing lifecycle

**Draft → Scheduled → Published → Unpublished / Archived**

- **Draft** — saved; visible only to creating admins.
- **Scheduled** — publish scheduled for a future time; audience frozen at schedule, re-resolved at publish (in case the audience population moved).
- **Published** — audience resolved, delivery rows created, visible to matched recipients.
- **Unpublished / Archived** — soft-remove; disappears from recipient inboxes; kept for audit.

Every state transition is audited via [audit.log_event](../../supabase/functions/_shared/audit.ts).

### Per-recipient delivery + read state

Publishing creates **one row per matched member** in `notifications.notification_deliveries`, each carrying its own `read_at`. This is an inbox model, not a broadcast feed:

- The message sits in the member's inbox until they read it.
- Reading marks it read **for that user only**; it stays unread for everyone else.
- The delivery rows enable **read analytics** shown to the admin: "142 of 300 recipients have read this," per publication.

Because delivery is per-recipient, no separate "broadcast" table exists — the publish object is the source (Event or Announcement row), and the deliveries are its fan-out.

### Channels

- **In-app** — always on. The delivery row is the inbox entry.
- **Email** — toggle at publish. Delivery row notes email attempted; provider is Resend for now.
- **Forum** — toggle at publish. Delivery row notes forum post created (Phase 8 wire-up; toggle is recorded now so the mechanic is ready).
- **SMS** — stubbed via [supabase/functions/notifications/send-sms-stub.ts](../../supabase/functions/notifications/send-sms-stub.ts); real Twilio / Termii integration lands with Phase 6.

---

## Entities

### Country / Region

**Status:** Built ✓ (as a shared attribute, not a first-class entity)

**Code:**

- Currency map: [apps/admin/src/lib/country-currency.ts](../../apps/admin/src/lib/country-currency.ts) — ISO-2 → ISO-4217 for 30+ countries; fallback XAF
- Picker UI: [apps/admin/src/components/geography/country-region-picker.tsx](../../apps/admin/src/components/geography/country-region-picker.tsx) — driven by `country-state-city` npm data
- Storage: `country_code` + `region_state` + `city` on `core.scopes` (per ADR-0007 Phase 1 refinement), mirrored on [core.branches](../../supabase/migrations/20260703120000_create_core_branches.sql) and [core.chapters](../../supabase/migrations/20260703120100_create_core_chapters.sql) detail rows

**Purpose:** Country/Region isn't a table — it's a set of attributes attached to scopes (and later members) that drive currency selection, geography display, and location-based audience targeting.

**Product intent (TODO):** the older-thread design conversation locked which fields are required at which level, what happens on country change (currency migration?), and validation rules. Paste that here.

---

### Houses

**Status:** Built ✓ — view-only in Phase 2

**Code:**

- Migration: [supabase/migrations/20260702200500_create_core_houses.sql](../../supabase/migrations/20260702200500_create_core_houses.sql) — 1:1 detail on `core.scopes`
- Admin route: [apps/admin/src/app/(personas)/exco/clusters/houses/](<../../apps/admin/src/app/(personas)/exco/clusters/houses/>) — list + detail (`[id]/page.tsx`) with `widgets/header.tsx`, `widgets/roster.tsx`, `widgets/list-view.tsx`
- No Edge Functions folder (no mutations in Phase 2)

**Purpose:** A fixed four-set of Houses. Members carry `house_scope_id` on their profile; Houses do NOT hold `core.memberships` rows (they aren't geographic bodies). Used for audience targeting and cohort display on member profiles.

**Data model:** `core.houses` — `scope_id` PK, `color`, `color_hex`, `sort_order`, `metadata` JSONB. Four rows, seeded.

**Admin pages:**

- **List** — the 4 houses with the shared list-view widget.
- **Detail** — header card + roster (members currently in this house).

**Lifecycle & rules:** view-only in Phase 2. No create / update / delete admin actions.

**Product intent (TODO):** the older-thread design conversation locked why 4 houses specifically, what the roster shows, and whether members can switch. Paste that here.

---

### Networks

**Status:** Built ✓ (renamed from "Sectors" — see [supabase/migrations/20260702200000_rename_sector_to_network.sql](../../supabase/migrations/20260702200000_rename_sector_to_network.sql))

**Code:**

- Migration: [supabase/migrations/20260702200600_create_core_networks.sql](../../supabase/migrations/20260702200600_create_core_networks.sql) — 1:1 detail on `core.scopes`; `create_network` + `update_network` RPCs
- Edge Functions: [supabase/functions/networks/](../../supabase/functions/networks/) — `create-network.ts`, `update-network.ts`
- Admin route: [apps/admin/src/app/(personas)/exco/clusters/networks/](<../../apps/admin/src/app/(personas)/exco/clusters/networks/>) — list, detail (`[id]/page.tsx`), form + form-dialog widgets

**Purpose:** Global attribute-based groupings (Legal, Tech, Medical, …) that cut across the geographic hierarchy. Members carry `network_scope_id`; no membership row is created against a Network. Used for audience targeting and professional-connect features.

**Data model:** `core.networks` — `scope_id` PK, `short_name` (case-insensitive unique), `icon`, `color_hex`, `sort_order`.

**Admin pages:**

- **List** — network cards with icon + color; create dialog inline.
- **Detail** — header, roster.

**Lifecycle & rules:** Mainstream Admin creates and updates. Networks parent to Mainstream directly (see [ADR-0007 §Phase 1 refinements](../adr/0007-tenancy-model-orgs-and-grants.md)).

**Product intent (TODO):** the older-thread design conversation locked how members join a network, whether a member can hold multiple, and the interaction with the Recruiter permission flag. Paste that here.

---

### Branches

**Status:** Built ✓

**Code:**

- Migration: [supabase/migrations/20260703120000_create_core_branches.sql](../../supabase/migrations/20260703120000_create_core_branches.sql) — 1:1 detail; `create_branch` + `update_branch` RPCs (SECURITY DEFINER)
- Edge Functions: [supabase/functions/branches/](../../supabase/functions/branches/) — `create-branch.ts`, `update-branch.ts`
- Admin route: [apps/admin/src/app/(personas)/exco/clusters/branches/](<../../apps/admin/src/app/(personas)/exco/clusters/branches/>) — list, detail (`[id]/page.tsx`), nested chapter detail (`[id]/chapters/[chapterId]/`); `actions.ts`, `chapter-actions.ts`, `governance-actions.ts`
- Governance widgets: assign-position-dialog, grant-role-dialog, governance-tab

**Purpose:** The top-level geographic body under Mainstream. A Branch has its own currency (via country_code), region/city, registration fee configuration, contact info, and holds memberships directly.

**Data model:** `core.branches` — `scope_id` PK; `country_code` (ISO-2), `region_state`, `city`, `registration_fee_amount`, `registration_fee_currency`, `contact_email`, `contact_phone`. See [ADR-0007](../adr/0007-tenancy-model-orgs-and-grants.md) for the scope-tree context.

**Admin pages:**

- **List** — branch cards with location + registration state.
- **Detail** — header, governance tab (roles, positions), chapters nested list.
- **Chapter detail (nested)** — full chapter detail rendered inside the branch route.
- **Create / Edit** — branch form (dialog on create, page-embedded on edit).

**Lifecycle & rules:** Mainstream Admin creates; Branch Admin governs their own branch. Registration boolean and last-admin-protection trigger apply (see cross-cutting rules).

**Product intent (TODO):** the older-thread design conversation locked branch autonomy semantics, what "engagement tier" means at branch level, the create-branch checklist, and the demote / archive path. Paste that here.

---

### Chapters

**Status:** Built ✓

**Code:**

- Migration: [supabase/migrations/20260703120100_create_core_chapters.sql](../../supabase/migrations/20260703120100_create_core_chapters.sql) — 1:1 detail; `create_chapter`, `update_chapter`, `change_chapter_autonomy` RPCs
- Edge Functions: [supabase/functions/chapters/](../../supabase/functions/chapters/) — `create-chapter.ts`, `update-chapter.ts`, `set-chapter-autonomy.ts`
- Admin route: nested under Branches — [apps/admin/src/app/(personas)/exco/clusters/branches/[id]/chapters/[chapterId]/](<../../apps/admin/src/app/(personas)/exco/clusters/branches/>) — page.tsx + detail-view widget

**Purpose:** Sub-branch grouping. Two kinds, determined by `core.scopes.chapter_kind` (enum: `autonomous` / `grouping`) — see [ADR-0007 §Phase 1 refinements](../adr/0007-tenancy-model-orgs-and-grants.md):

- **Autonomous chapters** hold their own memberships, treasury, registration; effectively a mini-branch.
- **Grouping chapters** _tag_ members whose real membership stays at the parent Branch — a display convenience, no independent finances.

**Data model:** `core.chapters` — `scope_id` PK, geography + registration + contact fields (only meaningful for autonomous chapters). Chapter kind lives on `core.scopes.chapter_kind` with a CHECK: chapters must have a kind, non-chapters must have `chapter_kind IS NULL`.

**Admin pages:**

- **List** — nested under Branch detail.
- **Detail (nested)** — header, roster (for autonomous), governance, autonomy toggle guarded by `change_chapter_autonomy`.
- **Create / Edit** — chapter form (dialog on create).

**Lifecycle & rules:**

- Branch Admin creates chapters within their branch.
- Autonomy demote (`autonomous` → `grouping`) is guarded — see `change_chapter_autonomy` in the migration; it validates no active memberships / open registrations before demoting.

**Product intent (TODO):** the older-thread design conversation locked the transfer rules between autonomous and grouping chapters ([packages/domain/src/memberships/transfer-rules.ts](../../packages/domain/src/memberships/transfer-rules.ts)), the passive rule on autonomous chapters ([packages/domain/src/memberships/passive-rules.ts](../../packages/domain/src/memberships/passive-rules.ts)), and the promotion path from grouping to autonomous. Paste that here.

---

### Batches

**Status:** Built ✓

**Code:**

- Migration: [supabase/migrations/20260703220000_create_core_batches.sql](../../supabase/migrations/20260703220000_create_core_batches.sql) — 1:1 detail
- Edge Functions: [supabase/functions/batches/](../../supabase/functions/batches/) — `create-batch.ts`, `update-batch.ts`
- Admin route: [apps/admin/src/app/(personas)/exco/clusters/batches/](<../../apps/admin/src/app/(personas)/exco/clusters/batches/>) — list, detail (`[id]/page.tsx`), form + form-dialog + detail-view widgets

**Purpose:** Global cohort groupings — one row per graduating year. Members carry `batch_scope_id` on their profile; Batches do NOT hold `core.memberships` (attribute-based, like Houses/Networks). Batches parent to Mainstream directly.

**Data model:** `core.batches` — `scope_id` PK; `ordinal` (nullable INT — "53rd Batch"), `nickname`, `contact_email`, `contact_phone`. `entry_year` lives on `core.scopes`.

**Display names:**

- Year form: "2012 Batch" (stored as `core.scopes.name`)
- Ordinal form: "53rd Batch" (computed in the UI from `ordinal`)

The school's history has ~7 years without a graduating batch (started 1946, first batch graduated 1953, 2012 = 53rd batch), so `ordinal` is not derivable from `entry_year` — it's manually assigned. Seeded batches ship without an ordinal; admins fill it in on demand.

**Admin pages:**

- **List** — batches by year descending.
- **Detail** — header, roster.
- **Create / Edit** — form dialog.

**Lifecycle & rules:** Mainstream Admin creates. `create_next_year_batch` scope RPC exists ([supabase/functions/scopes/](../../supabase/functions/scopes/)) for the annual roll-forward.

**Product intent (TODO):** the older-thread design conversation locked the "Batch of X" nickname conventions, when ordinal is assigned, and whether a Batch admin exists. Paste that here.

---

### Memberships (+ profile)

**Status:** Built ✓

**Code:**

- Migration: [supabase/migrations/20260701213947_create_core_memberships.sql](../../supabase/migrations/20260701213947_create_core_memberships.sql) — table + status enum + `perform_transfer` RPC
- Related migrations: [core_member_accounts](../../supabase/migrations/20260701204848_create_core_member_accounts.sql), [membership_related](../../supabase/migrations/20260701214211_create_core_membership_related.sql), [deceased_cascade](../../supabase/migrations/20260701214406_deceased_cascade_and_extend_member_rls.sql)
- RLS: [supabase/migrations/20260701214936_rls_memberships.sql](../../supabase/migrations/20260701214936_rls_memberships.sql)
- Edge Functions: [supabase/functions/memberships/](../../supabase/functions/memberships/) — `request-join-body`, `request-transfer`, `approve-join-request`, `approve-transfer`, `reject-join-request`
- Domain rules: [packages/domain/src/memberships/transfer-rules.ts](../../packages/domain/src/memberships/transfer-rules.ts), [passive-rules.ts](../../packages/domain/src/memberships/passive-rules.ts)
- Persona: [supabase/migrations/20260702142653_add_profiles_preferred_persona.sql](../../supabase/migrations/20260702142653_add_profiles_preferred_persona.sql) — `core.profiles.preferred_persona` (enum: exco / finance / editor, nullable)

**Purpose:** A Membership is one member's belonging to a specific geographic scope (Branch or autonomous Chapter). Non-geographic scopes (Batch, House, Network) do NOT hold membership rows — those are attribute-based on the member profile.

**Data model:** `core.memberships` — `id` PK, `member_id`, `scope_id`, `membership_status` enum (`pending` → `approved` → `active` / `passive` / `transferred` / `left` / `rejected`), `join_method`, `valid_from`, `valid_to`.

**Lifecycle:**

```
join_request  →  pending
pending       →  approved (admin) or rejected
approved      →  active
active        ⇄  passive       (per passive-rules.ts)
active        →  transferred   (per transfer-rules.ts, via perform_transfer RPC)
active        →  left          (exit)
active        →  deceased      (triggers cascade)
```

**Transfer rules** ([transfer-rules.ts](../../packages/domain/src/memberships/transfer-rules.ts)):

- **Allowed:** Branch ↔ Branch, Branch ↔ autonomous Chapter, autonomous Chapter ↔ autonomous Chapter.
- **Blocked:** anything → grouping Chapter, anything → non-geographic (batch / house / network), same scope.

**Passive rules** ([passive-rules.ts](../../packages/domain/src/memberships/passive-rules.ts)): only geographic memberships (Branch or autonomous Chapter) can be marked passive. Only the scope's own admin can mark passive (Finance can recommend but not set).

**Persona (profile side):** `core.profiles.preferred_persona` is the server-side sticky choice for the admin app (exco / finance / editor). Written on persona switch via Server Action; read on login. See [ADR-0040](../adr/0040-consolidated-admin-app-per-app-auth.md).

**Product intent (TODO):** the older-thread design conversation locked the engagement-tier mapping, the profile fields shown on the member card, the deceased flow triggers, and the visual treatment of pending / passive members in lists. Paste that here.

---

### Events

**Status:** Design only — Phase 2

**Depends on:** the shared Audience & Publishing engine (design-only, above), `notifications.notification_deliveries` (built), Finance approval gate for contributions (proxied via `pending_finance_approval` state — Phase 3 will formalize).

**Location in codebase (target):**

- Migration: `supabase/migrations/<ts>_create_exco_events.sql`
- Edge Functions: `supabase/functions/events/{create,update,publish,unpublish,archive,duplicate,email}.ts`
- Admin route: `apps/admin/src/app/(personas)/exco/events/` following the widgets pattern
- Domain: `packages/domain/events/` (Zod schemas, event-type enum, timeline-ring helper)

#### Data model (proposed)

`exco.events` — the event row:

- `id` UUID PK
- `owner_scope_id` FK to `core.scopes` — the scope under which the event was created (drives siloed admin visibility; see rules below)
- `name` TEXT NOT NULL
- `description` TEXT (rich text)
- `advert_image_urls` TEXT[] — first is hero/cover
- `types` `exco.event_type[]` — multi-tag (Sports, Meeting, Fundraiser, …); enum below
- `start_at`, `end_at` TIMESTAMPTZ — stored UTC
- `timezone` TEXT — IANA tz string, event-local; renders in viewer's local time
- `venue_name`, `venue_address`, `venue_map_url` TEXT — physical
- `online_url` TEXT — online (Zoom / Meet / YouTube / custom)
- `mode` derived (`physical` / `online` / `hybrid`) from which venue/online fields are populated
- `audience_definition` JSONB — the five-group audience shape from the shared engine
- `rsvp_enabled` BOOLEAN — **locked at creation** (cannot toggle post-publish; see rules)
- `contribution_charge_id` FK to `finance.charges` (nullable) — Finance-gated
- `reminder_cadence` `exco.reminder_cadence` (nullable: `weekly` / `biweekly` / `monthly`)
- `reminder_start_at` TIMESTAMPTZ (nullable — defaults to publish date)
- `reminder_custom_message` TEXT (nullable — optional single custom message reused for every reminder)
- `status` `exco.event_status` (`draft` / `scheduled` / `published` / `unpublished` / `archived`)
- `created_by`, `updated_by` FK to `auth.users`
- `created_at`, `updated_at`, `published_at` TIMESTAMPTZ

Ancillary:

- `exco.event_program_items` — `event_id`, `time`, `title`, `detail`, `sort_order` (structured time-ordered agenda)
- `exco.event_rsvps` — `event_id`, `member_id`, `response` (`interested` / `going`), `pledge_amount` (nullable), `created_at`

#### Event types (enum `exco.event_type` — multi-tag)

- `sports`
- `entertainment`
- `meeting`
- `mentorship`
- `assembly` — AGM / EGM (formal, distinct from meeting)
- `networking` — professional connect, ties to Networks
- `fundraiser` — hooks the contribution engine
- `community_service` — outreach, volunteer work
- `cultural` — traditional celebrations
- `training` — workshops, skill-building
- `ceremony` — graduations, funerals, weddings (culturally weighted in CMR)
- `celebration` — anniversaries, milestones
- `conference` — larger structured events
- `other` — catch-all

Multi-tag storage as `exco.event_type[]`. Filter chip UI uses ANY-of semantics: `types && ARRAY['fundraiser','sports']::exco.event_type[]`.

#### Admin pages

**List view** — top-level tabs: **List · Calendar · Reports** (Reports is a Phase 7 stub for now).

Stat cards: **Total · Drafts · Published · Upcoming · Past**.

Table columns (default visible):

| Column    | Content                                                                                                        |
| --------- | -------------------------------------------------------------------------------------------------------------- |
| Checkbox  | Bulk actions (publish, archive)                                                                                |
| No        | Sortable index                                                                                                 |
| Cover     | First advert image thumbnail; Mode icon (physical / online / hybrid) overlaid                                  |
| Name      | Event name                                                                                                     |
| Timeline  | Progress ring — empty for upcoming ("in 5 days"), partial for live ("day 2/3"), full for past ("ended 2d ago") |
| Time      | Start in viewer's local tz ("Fri 10 Apr, 5:00 PM")                                                             |
| Type      | Small tag; multiple tags shown as first + `+N` if width-limited                                                |
| Audience  | Chip summary ("St Thomas · Legal · +2 more")                                                                   |
| Status    | Draft / Published / Live / Past                                                                                |
| Organizer | Creator avatar + name                                                                                          |
| Actions   | Edit / Publish / Duplicate / Email audience / Archive                                                          |

Hidden behind a column toggle by default: Updated, Created.

**Calendar view** — Mon–Sun month grid; multi-day events **span cells** (a 3-day retreat renders as one continuous bar across three cells — three separate cards would be misleading). Cards show name + status badge (Draft / Upcoming / Live / Past). Month arrows, "Today" jump, click a card → detail.

Not a shadcn drop-in: shadcn's Calendar is a single-select day picker, not a month event grid. Cheapest path is a hand-rolled month grid on `date-fns` (already in [packages/ui](../../packages/ui/) deps), reusing shadcn Card + Badge + Popover for cells.

**Create / Edit** — two-column layout inspired by the "New Post" reference:

Left column (content):

- Title as H1
- Description via TipTap rich editor (already in [packages/ui/src/rich-editor/](../../packages/ui/src/rich-editor/))
- Advert images uploader (drag-reorder; first is hero)
- Program (structured time-ordered rows; add / remove / reorder)

Right sidebar (collapsible sections):

- **Publication** — status (Draft / Published), auto-filled Organizer, top-right action buttons
- **Schedule & Venue** — start / end date-time picker, timezone, venue fields, online URL, mode auto-derived
- **Categorization** — Event Type multi-select (from the enum above), tags (free-form, later)
- **Audience** — the shared five-group selector + live "reaches ~N members" count
- **RSVP** — enable toggle (locked at creation; see rules)
- **Contribution** — enable → name (defaults to event name), deadline; row lands in `pending_finance_approval` state until Finance signs off
- **Reminders** — cadence (weekly / biweekly / monthly), start (defaults to publish date), optional custom message

Top-right actions: **Save Draft** · **Schedule** (opens date picker) · **Publish**. Duplicate lives on the list row actions.

**Detail view** — "what was selected, beautifully":

- Hero cover + name + date/time in viewer's local tz
- Venue / online join button
- Rich description
- Program rendered as a **timeline**
- Advert gallery
- **Add to calendar** — Google / Apple / Outlook / ICS export
- **Contribution CTA** ("Contribute — deadline X") when present
- **RSVP control** (Interested / Going + optional pledge) when enabled at creation
- Read-analytics panel for the admin (deliveries + read counts, per reminder)

#### Lifecycle & rules

**Locked-at-creation options.** RSVP enabled / disabled and Contribution linkage are set **at event creation** and cannot be toggled post-publish. Rationale: users act on both (marking Interested, paying) — silently disabling them after publish orphans that action.

**Scope-visibility (event admin lens) — SILOED, NOT INHERITED.**

Formalized in [ADR-0041](../adr/0041-siloed-admin-visibility-for-audience-published-entities.md). This inverts the usual RBAC cascade from [ADR-0007](../adr/0007-tenancy-model-orgs-and-grants.md). Elsewhere in the model, a Branch admin sees under-Branch entities (Chapter members, etc.) via scope inheritance. **Events specifically do NOT cascade:**

- A Buea Branch admin sees Buea's events only. Not Douala's. Not Mainstream-global events. Not Buea's chapters' events.
- A Mainstream admin sees Mainstream-organized events only. NOT Branch events.

Anyone extending events RLS later must NOT add scope-tree traversal to the admin visibility policy. Members still see events via the **audience resolver** (published + matched to them) — that's a separate lens on the same table, and IS scope-blind on purpose.

**Edit after publish** — allowed. Material changes trigger a change-notification to the resolved audience:

- **Material (trigger notification):** date/time, venue/mode, contribution deadline, RSVP toggle off (already published — orphans users).
- **Cosmetic (no notification):** description, images, program, event type.

**Reminders** — the cadence generator is a pg_cron job that, per active published event, checks whether a reminder is due (cadence + start + not-past-event-date) and emits a reminder-announcement through the shared publish path. Reminders auto-stop at the event date.

**Recurring events** are separate from reminder cadence. A monthly meeting = a new event instance each month (recurrence); reminders happen _within_ one event's run-up (cadence). Two settings, deliberately not conflated.

**Permissions:**

- Create / edit / publish within scopes you administer.
- Targeting reach is unrestricted — Branch admins can target globally.
- Contribution creation respects the Finance-approval gate (Phase 3 formalizes).
- Archive (soft-delete) only.
- All create / publish / edit / email / archive actions audited via [audit.log_event](../../supabase/functions/_shared/audit.ts).

---

### Announcements

**Status:** Design only — Phase 2

**Depends on:** the shared Audience & Publishing engine, `notifications.notification_deliveries` (built).

**Location in codebase (target):**

- Migration: `supabase/migrations/<ts>_create_exco_announcements.sql`
- Edge Functions: `supabase/functions/announcements/{create,update,publish,unpublish,archive}.ts`
- Admin route: `apps/admin/src/app/(personas)/exco/announcements/`
- Domain: reuse `packages/domain/audience/` (no announcement-specific rules beyond content shape)

#### The model in one line

An Announcement is a **standalone use of the shared publishing primitive**: title + rich body, resolved audience, per-recipient delivery with read state. Everything about targeting, delivery, and read analytics is the shared engine — the only Announcement-specific concern is the content shape and an optional expiry.

Events also emit announcements (as reminders, via the reminder engine). Same row shape, same delivery path — reminders just have `source_event_id` set.

#### Data model (proposed)

`exco.announcements`:

- `id` UUID PK
- `owner_scope_id` FK to `core.scopes`
- `title` TEXT NOT NULL
- `body` TEXT (rich text)
- `audience_definition` JSONB — the shared five-group shape
- `channels` `exco.announcement_channel[]` — subset of `{in_app, email, forum}`; in-app implicit-always but stored explicit for clarity
- `expires_at` TIMESTAMPTZ (nullable) — auto-archives / drops from inboxes after; null = stays until manually archived
- `status` — `draft` / `scheduled` / `published` / `unpublished` / `archived` (same shape as events)
- `source_event_id` FK to `exco.events` (nullable) — set for reminders emitted by the reminder engine; null for standalone announcements
- `created_by`, `updated_by`, `created_at`, `updated_at`, `published_at`

#### Admin pages

**List view.**

Stat cards: **Total · Drafts · Scheduled · Published · Expired**.

Table columns:

- Title
- Audience summary (chips — same rendering as events)
- Channels (icons: 📥 in-app, ✉ email, 💬 forum — user's preference for whether we use emoji or text-label chips; my read: text-label chips to match the rest of the doc-set)
- Status (Draft / Scheduled / Published / Expired)
- Published date
- Expiry (or "—")
- **Read rate** (e.g. "47%") — from the aggregate over `notification_deliveries.read_at`
- Actions (edit / publish / unpublish / duplicate / archive)

Comprehensive filter dialog (status, date range, channels, audience dimensions) with active filters as chips — same UX pattern as Events.

**Detail view.**

- The rendered announcement (title, body, poster if any, published date, expiry).
- **Read-analytics panel** for the admin: how many recipients, how many read, breakdown by channel and by audience segment ("Douala: 32/40 read, Buea: 15/50 read").

**Create / Edit.** Deliberately light — Announcements are content + audience + channels, nothing more:

Left column: Title, rich-text Body (TipTap).

Right sidebar:

- **Publication** — status, top-right action buttons
- **Audience** — shared five-group selector + live count
- **Channels** — checkboxes for in-app (always ticked, disabled), email, forum
- **Expiry** — optional date-time picker

Top-right actions: **Save Draft** · **Schedule** · **Publish** · **Publish & Add New**.

#### Lifecycle & rules

- **Draft** (creators only) → **Scheduled** (audience resolved at publish time) → **Published** (fan out) → **Unpublished / Archived** (soft-remove).
- **No cadence / reminders** — a standalone announcement is a single delivery. The reminder engine belongs to events only. Announcements are the _primitive_ the reminder engine uses.
- **Scope-visibility (admin lens)** — same siloed rule as events (per [ADR-0041](../adr/0041-siloed-admin-visibility-for-audience-published-entities.md)): a Branch admin sees their own scope's announcements only, not other branches' or global.
- Every state transition audited.

---

## Change log

| Date       | Version | What changed                                                                                                                                                                                                                                                                                                                                                                         |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-07-03 | v1      | Initial compile. Fresh-from-thread specs for Events + Announcements + shared Audience/Publishing engine. As-built structural specs (with TODO stubs for older-thread product intent) for Country/Region, Houses, Networks, Branches, Chapters, Batches, Memberships (+ profile). Cross-cutting rules named (remove/archive, engagement tiers, registration boolean) with TODO stubs. |
| 2026-07-03 | v1.1    | Cross-linked [ADR-0041](../adr/0041-siloed-admin-visibility-for-audience-published-entities.md) from the Events and Announcements scope-visibility rules.                                                                                                                                                                                                                            |
