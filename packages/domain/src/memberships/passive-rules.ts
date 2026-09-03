/**
 * Pure passive-toggle legality (§2.16).
 *
 * The rule: only an Admin of a Branch or Autonomous Chapter can mark a
 * member passive. Finance may recommend, but cannot set. This helper
 * doesn't do the permission check itself — the Edge Function calls
 * `has_permission(user, membership.scope_id, 'membership.mark_passive')`
 * for the *actor* side.
 *
 * What this function does check: whether the target membership is
 * SHAPED such that passive is even a meaningful state — geographic
 * (branch or autonomous chapter) memberships only.
 *
 * The DB trigger `memberships_passive_shape_check` enforces the same
 * shape; this fn exists so the SPA can gray-out the "Mark passive"
 * button before submitting rather than relying on a round-trip 400.
 */

import type { ChapterKind, ScopeType } from '../scopes/scope-constants';

export interface MembershipShape {
  scopeType: ScopeType;
  chapterKind?: ChapterKind | null;
}

export type PassiveCheckResult = { allowed: true } | { allowed: false; reason: string };

export function canMarkPassive(membership: MembershipShape): PassiveCheckResult {
  if (membership.scopeType === 'branch') return { allowed: true };
  if (membership.scopeType === 'chapter' && membership.chapterKind === 'autonomous') {
    return { allowed: true };
  }
  return {
    allowed: false,
    reason: `passive status is only valid on geographic memberships (branch or autonomous chapter; got ${membership.scopeType}${
      membership.scopeType === 'chapter' ? `/${membership.chapterKind ?? 'null'}` : ''
    })`,
  };
}
