/**
 * Shared scope-shape validation for the org Edge Functions.
 *
 * Phase 1 §3.1 layers three kinds of invariant on `core.scopes`:
 *
 *   - **Parent/type shape** — mainstream has no parent; branch parents to
 *     mainstream; chapter parents to a branch; batch/house/network all
 *     parent to mainstream. Enforced here so the DB CHECK doesn't have
 *     to (the CHECK only asserts "mainstream OR parent NOT NULL"; the
 *     narrower "network parents to mainstream" lives at the app layer
 *     because it depends on a foreign row's scope_type).
 *   - **Kind/type presence** — chapter rows carry chapter_kind; batch
 *     rows carry entry_year. DB CHECK enforces these, but front-loading
 *     the check gives a friendly 422 instead of a raw check_violation.
 *   - **Sector's role** — Phase 1 §2.4 says "Mainstream Admin creates
 *     networks" — enforced in create-network by rejecting any other
 *     parent scope_type.
 *
 * The validators return either { ok: true } or { ok: false, message }
 * so call sites can shape a validationError envelope with the message.
 */

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.47.10';

import type { Database } from '../_types/database.ts';

type ScopeType = 'mainstream' | 'branch' | 'chapter' | 'batch' | 'house' | 'network';
type ChapterKind = 'autonomous' | 'grouping';

export interface ParentInfo {
  id: string;
  scope_type: ScopeType;
  chapter_kind: ChapterKind | null;
}

export type ValidationResult = { ok: true } | { ok: false; message: string; field?: string };

/**
 * Fetch a parent scope's shape given its id. Uses the caller's RLS
 * client (not service-role) — the caller must be able to read the
 * parent to reference it; if not, we surface as a NOT_FOUND at the
 * call site.
 */
export async function loadParent(
  client: SupabaseClient<Database>,
  parentId: string,
): Promise<ParentInfo | null> {
  const { data } = await client
    .from('scopes' as never)
    .select('id, scope_type, chapter_kind')
    .eq('id', parentId)
    .maybeSingle();
  return (data as ParentInfo | null) ?? null;
}

/**
 * Given the (scope_type, parent, chapter_kind, entry_year) tuple the
 * caller wants to create, assert every Phase 1 §3.1 invariant.
 *
 * `parent` may be null; the validator confirms that's allowed for
 * `scope_type = 'mainstream'` and rejects it otherwise.
 */
export function validateCreateShape(args: {
  scopeType: ScopeType;
  parent: ParentInfo | null;
  chapterKind?: ChapterKind | null;
  entryYear?: number | null;
}): ValidationResult {
  const { scopeType, parent, chapterKind, entryYear } = args;

  // Parent presence.
  if (scopeType === 'mainstream') {
    if (parent) {
      return { ok: false, message: 'mainstream scope must have no parent', field: 'parentScopeId' };
    }
  } else {
    if (!parent) {
      return { ok: false, message: `${scopeType} requires a parent`, field: 'parentScopeId' };
    }
  }

  // Parent type constraints per scope kind.
  if (parent) {
    switch (scopeType) {
      case 'branch':
        if (parent.scope_type !== 'mainstream') {
          return {
            ok: false,
            message: 'branch must parent to mainstream',
            field: 'parentScopeId',
          };
        }
        break;
      case 'chapter':
        if (parent.scope_type !== 'branch') {
          return {
            ok: false,
            message: 'chapter must parent to a branch',
            field: 'parentScopeId',
          };
        }
        break;
      case 'batch':
      case 'house':
      case 'network':
        if (parent.scope_type !== 'mainstream') {
          return {
            ok: false,
            message: `${scopeType} must parent to mainstream`,
            field: 'parentScopeId',
          };
        }
        break;
    }
  }

  // Chapter-kind presence.
  if (scopeType === 'chapter') {
    if (!chapterKind) {
      return {
        ok: false,
        message: 'chapter requires chapterKind (autonomous | grouping)',
        field: 'chapterKind',
      };
    }
  } else if (chapterKind) {
    return {
      ok: false,
      message: 'chapterKind only applies to chapter scopes',
      field: 'chapterKind',
    };
  }

  // Batch entry-year presence + range.
  if (scopeType === 'batch') {
    if (entryYear == null) {
      return { ok: false, message: 'batch requires entryYear', field: 'entryYear' };
    }
    if (entryYear < 1953 || entryYear > 2100) {
      return {
        ok: false,
        message: 'entryYear out of plausible range (1953..2100)',
        field: 'entryYear',
      };
    }
  } else if (entryYear != null) {
    return { ok: false, message: 'entryYear only applies to batch scopes', field: 'entryYear' };
  }

  return { ok: true };
}
