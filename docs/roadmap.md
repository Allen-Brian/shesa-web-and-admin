# Shesa Development Roadmap

> Canonical phased build plan for the Shesa platform. Each phase builds on stable capabilities from the previous one.

---

## Summary

**Project:** Shesa — a multi-app platform built as a monorepo on Supabase/PostgreSQL.

**Apps:** `web`, `exco`, `finance`, `connect`
**Shared packages:** `ui`, `types`, `domain`, `supabase`

**Build sequence logic:** Foundation → Core Domain → Governance (Exco) → Finance (backend then UI) → Public Website/CMS → Notifications → Analytics → **Connect last** (so it can leverage mature identity / finance / notifications instead of duplicating them) → Hardening.

**Key domain concepts:**
- **Org hierarchy:** Mainstream → Branch → Chapter → Batch → House → Sector
- **Member lifecycle:** creation → invite → claim → active / passive / transfer / exit
- **Roles** split into functional roles (Admin, Finance), permission flags (Editor, Recruiter, Announcer), and position badges (President, Treasurer, etc.)
- **Finance entities:** Charge, Obligation, Payment, Ledger, Treasury, Receipt, Expense, Exception
- **Payments** via MTN / Orange mobile money with webhooks
- **Connect** = social layer (Forums, Live Sessions, Polls, Jobs, Achievements) auto-generated from membership

---

## Phase 0 — Foundation & Project Setup

**Objective:** Establish the engineering foundation that every application will share.

### Backend
- Monorepo setup
- Supabase project
- PostgreSQL schemas: `core`, `finance`, `cms`, `connect`
- Authentication
- Shared RBAC framework
- Audit logging framework
- Notification infrastructure
- Queue infrastructure
- Storage buckets
- Environment configuration
- CI/CD
- Testing infrastructure

### Frontend monorepo
```
apps/
    web
    exco
    finance
    connect

packages/
    ui
    types
    domain
    supabase
```

### Deliverables
- Shared authentication
- Shared layouts
- Design system
- Shared UI package
- Shared types
- Shared API client

---

## Phase 1 — Core Domain

Everything depends on this.

### 1. Organization Engine
**Entities:** Scope, Branch, Chapter, Batch, House, Sector

**Hierarchy:** Mainstream → Branch → Chapter → Batch → House → Sector

**Features:** Autonomy switch, Capability profiles, Currency, Geographic data

### 2. Member Engine
Member creation · Account creation · Member import · Excel template · Email invitations · SMS fallback · Claim account · Transfer · Status history · Exit year · Profession · Field

### 3. Membership Engine
Join requests · Approval · Registration fee logic · Active membership · Transfer history · Passive status · Membership validation

### 4. Role & Permission Engine
**Functional roles:** Admin, Finance
**Permission flags:** Editor, Recruiter, Announcer
**Position badges**
**Other:** Role history, Expiration, Audit

### Deliverables
Identity · Members · Organizations · Permissions · Audit. Nothing financial yet.

---

## Phase 2 — Shesa Exco

The organization can now actually operate.

- **Member Management:** Dashboard, Member search, Member profile, Import members, Bulk actions
- **Join Management:** Join requests, Approvals, Registration payments, Transfers
- **Governance:** Assign Admin / Finance / Recruiter / Editor / Announcer
- **Positions:** President, Vice President, Secretary, Treasurer, Financial Secretary, PRO, etc.
- **Events:** Create, Edit, Delete, Calendar
- **Announcements:** Create, Publish, Archive
- **Audit Viewer:** Timeline, Role history, Membership history

**Deliverables:** Entire governance platform operational.

---

## Phase 3 — Finance Core

Largest module. Build independently from UI first.

### Finance Engine entities
Charge · Obligation · Payment · Ledger · Treasury · Receipt · Expense · Exception

### Sub-engines
- **Charge Engine:** Recurring · One-time · Monthly · Yearly · Bi-yearly · Targets (Members, Bodies)
- **Obligation Engine:** Generation · Partial payments · Proration · Status · Arrears
- **Payment Engine:** Payment links · MTN · Orange · Webhook handling · Receipts · Manual cash · Pay on behalf
- **Treasury:** Income · Expense · Balance · Ledger · Running totals
- **Exception Engine:** Years since exit · Batch · Age · House · Individual · Overrides
- **Currency Engine:** Live conversion · Snapshots · Exchange rates · Reporting
- **Reports:** Collections · Arrears · Statements · Treasury · Member statements · Exports
- **Import / Export:** Templates · Excel · CSV

**Deliverables:** Complete accounting system.

---

## Phase 4 — Finance UI

After the finance backend is stable.

**Applications:** Finance Dashboard · Charges · Payments · Treasury · Reports · Exceptions · Settings

Everything should work end-to-end at this point.

---

## Phase 5 — Website + CMS

Only now build the public face.

- **Public Website:** Home, About, Branches, Leadership, Projects, Gallery, Articles, Contact
- **Branch Pages:** Dynamic routing, Sections, Albums, Articles, News
- **CMS:** Drafts, Publishing, Scheduling, Media, Albums, Posts, Sections, Permissions
- **Echoes:** Music, Albums, Streaming, Downloads
- **Stream:** Protected pages, Meeting embeds, Live links, Authentication

**Deliverables:** Entire public website finished.

---

## Phase 6 — Notifications

Now automate communication.

**Notification Engine:** Email · SMS · Push · In-app · Queues · Cron · Templates · Reminder rules · Escalations · Passive member cadence · Provider abstraction

**Deliverables:** Fully automated reminders.

---

## Phase 7 — Analytics & Administration

Admin dashboard · System health · Audit explorer · Metrics · Usage · Payments · Active members · Treasury summaries · Storage · Notification statistics

---

## Phase 8 — Shesa Connect (LAST)

At this point everything Connect depends on exists: members, roles, permissions, branches, finance, CMS, notifications.

1. **Forum Engine** — Auto-generate forums (Branch, Chapter, Batch, House, Sector). Announcements, pinned posts, polls, live sessions, replies, moderation.
2. **Live Sessions** — Open session, timer, realtime messaging, auto close, archive, delete after one year.
3. **Polls** — Create, vote, results, permissions, anonymous/public.
4. **Jobs** — Recruiter workflow, posting, approval, publishing, expiration, search.
5. **Achievements** — Professional, academic, images, attachments (comments/reactions future).
6. **Notifications Integration** — Forum, jobs, achievements, polls, live sessions.
7. **Search** — Jobs, achievements, announcements, polls, forums.
8. **Moderation** — Report, delete, hide, mute, audit, moderator tools.
9. **Realtime** — Supabase Realtime, presence, typing (future), live polls, session countdown.

**Deliverables:** Complete Shesa Connect platform.

---

## Phase 9 — Production Hardening

Performance optimization · Database indexing · Security review · Penetration testing · Accessibility (WCAG) · Responsive testing · Load testing · Disaster recovery validation · Backup and restore testing · Monitoring and alerting · Production deployment · UAT · Documentation and administrator guides

---

## Overall Build Order

| Phase | Module                                                            | Priority                |
| ----- | ----------------------------------------------------------------- | ----------------------- |
| 0     | Foundation & Monorepo                                             | ⭐⭐⭐⭐⭐                   |
| 1     | Core Domain (Identity, Members, Organizations, Permissions)       | ⭐⭐⭐⭐⭐                   |
| 2     | Shesa Exco                                                        | ⭐⭐⭐⭐⭐                   |
| 3     | Finance Backend                                                   | ⭐⭐⭐⭐⭐                   |
| 4     | Finance Application                                               | ⭐⭐⭐⭐⭐                   |
| 5     | Website + CMS                                                     | ⭐⭐⭐⭐                    |
| 6     | Notifications Engine                                              | ⭐⭐⭐⭐                    |
| 7     | Analytics & Platform Administration                               | ⭐⭐⭐                     |
| 8     | **Shesa Connect** (Forums, Jobs, Achievements, Live Sessions)     | ⭐⭐⭐⭐⭐ *(Built Last)*    |
| 9     | Production Hardening & Launch                                     | ⭐⭐⭐⭐⭐                   |

Postponing **Shesa Connect** until the end means its forums, permissions, notifications, jobs, achievements, and live sessions can directly leverage the mature identity, governance, finance, CMS, and notification systems instead of duplicating or later refactoring core functionality.
