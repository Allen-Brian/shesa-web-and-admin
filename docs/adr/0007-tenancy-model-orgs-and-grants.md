# 0007 — Org hierarchy and scoped membership

- **Status:** accepted
- **Date:** 2026-06-29
- **Deciders:** Lead

## Context

Shesa is a membership organization with a hierarchical structure. A naïve `users.role = 'admin' | 'member'` model can't capture that a "Branch Admin" of Branch X manages everything under that Branch (its Chapters, Batches, Houses, Sectors), but has no authority over Branch Y. The hierarchy also doesn't map cleanly to multi-tenant models — there's one tenant (the Mainstream); the tree is org structure, not isolation.

## Decision

### The hierarchy

```
Mainstream
 └── Branch
      └── Chapter
           └── Batch
                └── House
                     └── Sector
```

- **Mainstream** — the parent organization (single root).
- **Branch** — geographic / regional division.
- **Chapter** — sub-branch grouping.
- **Batch** — cohort within a Chapter (e.g. graduation year).
- **House** — sub-cohort within a Batch.
- **Sector** — functional grouping (cross-cutting; may not always fit in the strict tree).

Each node is a row in **`core.scopes`** with a `scope_type` and a `parent_scope_id`. Some scope types carry an **autonomy switch** (per the roadmap) — when on, the scope manages its own membership / finance independently of its parent.

> _Naming note:_ this ADR previously called the table `core.org_nodes` (`node_type`). The Phase 0 planning session locked the names to `core.scopes` / `scope_type` (matching the Phase 0 spec §7) so the table name reads naturally with the policy module's "scope-aware permission check" language. The domain terms (Branch, Chapter, etc.) and the conceptual model are unchanged.

### Membership

- **Members** belong to one or more scopes (`core.memberships`). A member is typically in one Branch but may sit in multiple Sectors.
- **Membership lifecycle:** create → invite → claim → active / passive / transfer / exit (per the roadmap's Member Engine).
- **Status history** is append-only in `core.membership_status_history`.

### Roles, flags, positions — scoped to scopes

Three orthogonal kinds of "authority":

- **Functional roles** (Admin, Finance) — granted to a member at a scope; they govern the scope and everything under it (unless the child has the autonomy switch on).
- **Permission flags** (Editor, Recruiter, Announcer) — granular grants attached to a member at a scope.
- **Position badges** (President, Vice President, Secretary, Treasurer, Financial Secretary, PRO, etc.) — represent elected / appointed positions; they confer permission bundles plus appear in the UI.

All three carry a **scope reference**: `(scope_type, scope_id)`. Resolution at request time:

```
effective_permissions(member) =
  union of (
    permissions implied by functional roles at any ancestor scope (clipped by autonomy),
    permissions of permission flags at any ancestor scope,
    permissions of position badges currently active
  )
in_scope_set(member) = the set of scopes covered by those grants
```

The policy module ([ADR-0006](0006-casl-for-authorization.md)) and Postgres RLS both consume this resolution.

### Audit

Every grant/revoke is audited centrally (`audit.audit_entries` per spec §11) AND in per-entity history tables (`core.role_history`, `core.position_history`) for queryable timelines. The two are populated together by the security-definer helper that performs the change. Expiration is supported on flags and positions.

## Consequences

- One model handles every authority pattern in the roadmap without special cases.
- The hierarchy is reflected at the database level; queries to "everything under Branch X" are straightforward via recursive CTEs over `parent_scope_id`.
- Adding a new scope type (e.g. a sub-sector later) is one new `scope_type` value, not a schema change.
- Autonomy switch is a per-scope opt-out; default is "inherit from parent."
- Exact table shapes are finalized in E2 (Phase 0 — the `core.scopes` + `core.scope_capabilities` + `core.profiles` migration) and E3 (the RBAC tables) — this ADR locks the conceptual model.

## Alternatives considered

- **Flat `user.role` column** — rejected: can't express role-at-Branch-X-but-not-Branch-Y.
- **Per-tenant schemas** — rejected: there's one tenant (Mainstream); the tree is org structure, not isolation. And see [ADR-0003](0003-schema-per-domain-single-postgres.md).
- **Separate hierarchy table per type** (Branches, Chapters, Batches as different tables) — rejected: makes "fetch this node's ancestors / descendants" a polymorphic mess. A single `core.scopes` table with a `scope_type` discriminator and a `parent_scope_id` keeps recursive CTEs simple.
- **Materialized closure table for the hierarchy** — considered: useful at scale; deferred. Recursive CTEs over `parent_scope_id` are fast enough at Shesa's expected size.
- **`org_nodes` / `node_type` naming** — used in earlier drafts; renamed in Phase 0 planning to `scopes` / `scope_type` so policy code reads cleanly (`policy.can(member, action, { scopeId })`) instead of mixing two vocabularies.

## Phase 1 refinements (non-decision)

Landing while implementing Phase 1 E1.1 — recorded here for readers cold-reading the schema. None reverse the decision.

- **Chapter autonomy is now an enum, not a boolean.** `core.scopes.chapter_kind` (values `autonomous` / `grouping`) replaces the earlier `is_autonomous` boolean for chapter rows. Grouping chapters _tag_ members whose real membership stays at the parent Branch; autonomous chapters hold their own memberships and treasury. Non-chapter rows carry `chapter_kind IS NULL` (CHECK-enforced). The boolean stays for one Phase 1 release so `core.has_permission`'s recursive CTE keeps compiling; a follow-up migration switches the CTE to `chapter_kind = 'autonomous'` and drops the boolean.
- **Sectors / Houses / Batches parent to Mainstream directly.** The tree diagram above shows every level below Chapter, but the actual DB structure is flatter: Sectors, Houses, and Batches are Mainstream-scoped scope rows (parent_scope_id = mainstream), and only Branch → Chapter carries geographic hierarchy. Sectors were always cross-cutting (this ADR called them "may not always fit in the strict tree"); Phase 1 §2.4 locked "Mainstream Admin creates sectors" which formalizes them as global. Batches and Houses are similarly global — a Batch is a cohort year, not a sub-thing-of-a-Chapter.
- **Structured geography on scopes.** `core.scopes` now carries `country`, `region_state`, `city` (text) plus a `metadata` JSONB for opaque extensions (house color, etc.). PostGIS deferred until a query needs it. Applies to any scope; in practice populated for Branches, Chapters, and (Phase 1 §2.6) members.
- **`scope_id IS NULL` on grants means global.** Cross-reference to ADR-0006's Phase 1 refinement: `core.role_assignments.scope_id` widened to nullable to represent the Recruiter role. Every downstream predicate uses `(scope_id IS NULL OR scope_id = X)` form.
