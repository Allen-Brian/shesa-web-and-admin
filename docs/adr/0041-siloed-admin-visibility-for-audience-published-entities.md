# 0041 — Siloed admin visibility for audience-published entities

- **Status:** accepted
- **Date:** 2026-07-03
- **Deciders:** Lead

## Context

[ADR-0007](0007-tenancy-model-orgs-and-grants.md) locked Shesa's scope hierarchy and its cascade semantics: a role granted at a parent scope grants the implied permissions at every child scope. A Branch admin, by default, can act on the Chapters (and any entity whose ownership sits under that Branch) via the scope-tree traversal in `core.has_permission()`.

That cascade is the correct default for governance entities that BELONG to the tree — members, memberships, roles, positions, registration state. If a Branch admin removes a member of an autonomous Chapter under their Branch, the cascade is what makes that legal. Every RLS policy in `core.*` since Phase 1 has assumed the cascade.

But there is a class of entities that don't want the cascade — **audience-published resources**: events, announcements, and (later) contribution targeting. These entities are addressed OUTWARD to a resolved audience of members rather than inward to a fixed scope subtree. The product spec in [docs/product/entities.md](../product/entities.md) calls for **siloed admin visibility**:

- A Buea Branch admin sees Buea's events and announcements only — not Douala's, not their Chapters', not Mainstream-global ones.
- A Mainstream admin sees Mainstream-organized events / announcements only — not the Branches'.

The reason isn't authority — an admin's _ability_ to publish is scope-limited elsewhere. It's **listing noise and accountability**. A Mainstream admin's Events list showing every Branch's events becomes thousands of unowned rows. A Branch admin editing or archiving a Chapter's event by cascade dissolves the accountability of the chapter admin who created it.

Naïvely applying the ADR-0007 cascade to `exco.events` / `exco.announcements` breaks this. Someone reading `core.has_permission()` from an existing policy and copy-pasting it into the new one will produce wrong behavior. This ADR names the trap.

## Decision

**For `exco.events`, `exco.announcements`, and future audience-published entities, RLS admin-visibility is siloed on `owner_scope_id` — exact match, not scope-tree cascade.**

Concretely:

- Every audience-published table carries an `owner_scope_id` FK to `core.scopes` — the scope under which the entity was created.
- The RLS `SELECT` policy for admin management uses direct exact-match against the caller's admin role assignments:

  ```sql
  USING (
    owner_scope_id IN (
      SELECT ra.scope_id
      FROM core.role_assignments ra
      JOIN core.roles r ON r.id = ra.role_id
      WHERE ra.user_id = auth.uid()
        AND ra.scope_id IS NOT NULL
        AND core.is_admin_role_key(r.key)
        AND ra.starts_at <= NOW()
        AND ra.revoked_at IS NULL
        AND (ra.ends_at IS NULL OR ra.ends_at > NOW())
    )
  )
  ```

  Using the existing `core.is_admin_role_key(text)` helper (introduced in [20260702112344_last_admin_protection_trigger.sql](../../supabase/migrations/20260702112344_last_admin_protection_trigger.sql)) keeps the "what counts as admin" list defined in one place.

  — an admin sees rows whose `owner_scope_id` **exactly matches** a scope they hold an admin role at, not descendants of it.

- **`core.has_permission()` is NOT called in these policies.** Its recursive CTE walks the scope tree, which activates exactly the cascade this decision blocks. Any RLS reviewer sees the direct `owner_scope_id IN (...)` pattern and knows what's happening.

**The audience-resolver lens is unaffected.** Members see events / announcements via the shared audience resolver — "the resolved audience contains me" is scope-blind by design (a Branch can invite globally). That is a separate RLS policy on the same table (a member-view predicate keyed off delivery rows or resolver membership) and is unrelated to the admin cascade decision.

**Applies to:** `exco.events`, `exco.announcements`. Future audience-published entities (contribution targeting, mass-send notifications, moderated Connect posts if they land in Phase 8) inherit this pattern unless a superseding ADR is written.

**Does not apply to:** any entity that isn't audience-published — memberships, positions, role assignments, registration state, branches / chapters / batches, etc. Those keep the ADR-0007 cascade unchanged.

## Consequences

- Audience-published tables carry two orthogonal RLS lenses on the same rows: an admin-management SELECT (siloed) and a member-view SELECT (via the resolver). Both must be authored per-table; a copy-paste from `core.*` policies WILL grant the wrong access.
- Cross-branch oversight (an association leader wanting to see every Branch's events at once) requires an explicit new mechanism — a "global oversight" role, or an admin-app view that aggregates across owners with elevated authorization. Not built now; opened as a follow-up if the need surfaces.
- Cross-branch reporting / analytics stays possible via server-side aggregation with the service-role client (which bypasses RLS) — the pattern already used for existing analytics. Nothing new to build.
- Every audience-published table's RLS ships with a pgTAP file that asserts the deny path **across siblings AND across parent-child**: "Buea admin cannot SELECT Douala's events" AND "Buea admin cannot SELECT St Thomas Chapter's events (where St Thomas is under Buea)". Without both assertions, the siloing is unverified.
- The rule is easy to state ("`owner_scope_id` = your scope, not descendants") but easy to break with a well-meaning refactor. Code review flags any new use of `core.has_permission()` inside `exco.*` RLS as a bug pending justification.

## Alternatives considered

- **Cascade like everything else (default ADR-0007 behavior).** Rejected: creates listing noise for higher scopes and breaks accountability — a Branch admin editing a Chapter's event is a governance regression.
- **Cascade upward only** (a Chapter admin's events are visible to the parent Branch admin, but not vice-versa). Rejected: same listing-noise problem at the Mainstream level, and asymmetric in a way that surprises readers of the RLS.
- **Cascade downward only** (Mainstream sees Branches' events). Rejected: dissolves accountability of the branch admin and re-invites the "who owns this event when everyone sees it" confusion.
- **No RLS silo; enforce in Server Actions / Edge Functions only.** Rejected: violates the two-layer defense from [ADR-0006](0006-casl-for-authorization.md). A future direct supabase-js read (from a report, an internal tool) would bypass the constraint.
- **A separate visibility ACL table.** Rejected as premature: the `owner_scope_id` + exact-match rule captures the current requirement in one column and one policy. Add an ACL table only if a future case needs cross-scope sharing that isn't served by explicit roles or the audience resolver.
