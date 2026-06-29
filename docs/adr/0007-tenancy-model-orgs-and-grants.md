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

Each node is a row in `core.org_nodes` with a `node_type` and a `parent_id`. Some node types carry an **autonomy switch** (per the roadmap) — when on, the node manages its own membership / finance independently of its parent.

### Membership

- **Members** belong to one or more org nodes (`core.memberships`). A member is typically in one Branch but may sit in multiple Sectors.
- **Membership lifecycle:** create → invite → claim → active / passive / transfer / exit (per the roadmap's Member Engine).
- **Status history** is append-only in `core.membership_status_history`.

### Roles, flags, positions — scoped to nodes

Three orthogonal kinds of "authority":

- **Functional roles** (Admin, Finance) — granted to a member at a node; they govern the node and everything under it (unless the child has the autonomy switch on).
- **Permission flags** (Editor, Recruiter, Announcer) — granular grants attached to a member at a node.
- **Position badges** (President, Vice President, Secretary, Treasurer, Financial Secretary, PRO, etc.) — represent elected / appointed positions; they confer permission bundles plus appear in the UI.

All three carry a **scope**: `(node_type, node_id)`. Resolution at request time:

```
effective_permissions(member) =
  union of (
    permissions implied by functional roles at any ancestor node (clipped by autonomy),
    permissions of permission flags at any ancestor node,
    permissions of position badges currently active
  )
in_scope_nodes(member) = the set of nodes covered by those grants
```

The policy module ([ADR-0006](0006-casl-for-authorization.md)) and Postgres RLS both consume this resolution.

### Audit

Every grant/revoke is audited (`core.role_history`, `core.position_history`). Expiration is supported on flags and positions.

## Consequences

- One model handles every authority pattern in the roadmap without special cases.
- The hierarchy is reflected at the database level; queries to "everything under Branch X" are straightforward.
- Adding a new node type (e.g. a sub-sector later) is one new `node_type` value, not a schema change.
- Autonomy switch is a per-node opt-out; default is "inherit from parent."
- Exact table shapes are finalized in Phase 1 (Core Domain) — this ADR locks the conceptual model, not the columns.

## Alternatives considered

- **Flat `user.role` column** — rejected: can't express role-at-Branch-X-but-not-Branch-Y.
- **Per-tenant schemas** — rejected: there's one tenant (Mainstream); the tree is org structure, not isolation. And see [ADR-0003](0003-schema-per-domain-single-postgres.md).
- **Separate hierarchy table per type** (Branches, Chapters, Batches as different tables) — rejected: makes "fetch this node's ancestors / descendants" a polymorphic mess. A single `org_nodes` table with a `node_type` discriminator and a `parent_id` keeps recursive CTEs simple.
- **Materialized closure table for the hierarchy** — considered: useful at scale; deferred. Recursive CTEs over `parent_id` are fast enough at Shesa's expected size.
