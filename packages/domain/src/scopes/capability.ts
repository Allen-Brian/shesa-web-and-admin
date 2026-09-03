/**
 * Pure capability resolution for a scope.
 *
 * The DB has `core.scope_capabilities` per row for explicit overrides,
 * but the *default* set of capabilities is a pure function of
 * `scope_type` + `chapter_kind`. This function is that default —
 * consumed by the Exco UI to disable actions that a scope can't
 * perform (e.g. hide "Create binding due" on grouping chapters).
 *
 * The DB's row wins over these defaults; call sites are expected to
 * `Object.assign(defaults, overrideRow)` when a `scope_capabilities`
 * row exists. This function is the safe fallback for scopes that
 * haven't had capabilities configured yet — a common state during
 * initial onboarding.
 */

import type { ChapterKind, ScopeType } from './scope-constants';

export interface ScopeCapabilities {
  canManageMembers: boolean;
  canHaveTreasury: boolean;
  canCreateBindingDues: boolean;
  canHaveWebsitePage: boolean;
  canHaveForum: boolean;
  canLabelActivePassive: boolean;
}

interface ScopeShape {
  scopeType: ScopeType;
  chapterKind?: ChapterKind | null;
}

const NONE: ScopeCapabilities = {
  canManageMembers: false,
  canHaveTreasury: false,
  canCreateBindingDues: false,
  canHaveWebsitePage: false,
  canHaveForum: false,
  canLabelActivePassive: false,
};

const FULL: ScopeCapabilities = {
  canManageMembers: true,
  canHaveTreasury: true,
  canCreateBindingDues: true,
  canHaveWebsitePage: true,
  canHaveForum: true,
  canLabelActivePassive: true,
};

export function resolveScopeCapabilities(scope: ScopeShape): ScopeCapabilities {
  switch (scope.scopeType) {
    case 'mainstream':
    case 'branch':
      // Full authority: members, treasury, dues, pages, forums, passive tag.
      return { ...FULL };

    case 'chapter':
      // Autonomous chapters look like small branches; grouping chapters
      // are read-mostly tag-carriers — they can't hold memberships or
      // run treasury of their own.
      if (scope.chapterKind === 'autonomous') return { ...FULL };
      return {
        ...NONE,
        canHaveWebsitePage: true,
        canHaveForum: true,
      };

    case 'batch':
      // Batches carry members-as-attribute and a discussion forum, no
      // treasury (money moves through the geographic scope).
      return {
        ...NONE,
        canManageMembers: true,
        canHaveWebsitePage: true,
        canHaveForum: true,
      };

    case 'house':
      // Houses are affinity groupings with a page + forum, no member
      // management (Branch owns that) and no money.
      return {
        ...NONE,
        canHaveWebsitePage: true,
        canHaveForum: true,
      };

    case 'network':
      // Networks are labels, not org units. No capabilities of their own.
      return { ...NONE };

    default: {
      // Exhaustive check — a new scope_type without a case is a
      // compile-time error, not a runtime silent-return.
      const unreachable: never = scope.scopeType;
      return unreachable;
    }
  }
}
