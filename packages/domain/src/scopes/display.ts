/**
 * Scope display-name resolution.
 *
 * Phase 2 §1 + §2.1 rule: the database `scope_type = 'mainstream'`
 * renders as **"Shesa Global"** in every UI surface. Every other scope
 * type uses its `name` column verbatim.
 *
 * Consumers: `<ContextSwitcher>`, breadcrumbs, dashboard header, audit
 * filter labels, form scope pickers. Anywhere a scope name would
 * otherwise say "Mainstream".
 */

import type { ScopeType } from './scope-constants';

export const SHESA_GLOBAL_LABEL = 'Shesa Global';

interface ScopeLike {
  scope_type?: ScopeType | null;
  scopeType?: ScopeType | null;
  name?: string | null;
}

export function resolveScopeDisplayName(scope: ScopeLike | null | undefined): string {
  if (!scope) return '';
  const type = scope.scope_type ?? scope.scopeType ?? null;
  if (type === 'mainstream') return SHESA_GLOBAL_LABEL;
  return scope.name ?? '';
}
