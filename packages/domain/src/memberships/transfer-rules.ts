/**
 * Pure transfer legality (§2.14).
 *
 * Allowed transfers:
 *   branch              → branch
 *   branch              → autonomous chapter
 *   autonomous chapter  → branch
 *   autonomous chapter  → autonomous chapter
 *
 * Disallowed:
 *   * anything → grouping chapter (grouping chapters can't hold memberships)
 *   * anything → non-geographic scope (batch / house / network)
 *   * source = destination
 *
 * This function doesn't check authorization — that's `membership.transfer`
 * at the source scope, enforced by the Edge Function's authorize() call.
 * It also doesn't check whether the source is actually the member's
 * current active membership — that's a DB lookup at approval time.
 */

import type { ChapterKind, ScopeType } from '../scopes/constants';

export interface TransferScopeShape {
  scopeId: string;
  scopeType: ScopeType;
  chapterKind?: ChapterKind | null;
}

export type TransferCheckResult = { allowed: true } | { allowed: false; reason: string };

function isGeographic(scope: TransferScopeShape): boolean {
  if (scope.scopeType === 'branch') return true;
  if (scope.scopeType === 'chapter') return scope.chapterKind === 'autonomous';
  return false;
}

export function canTransfer(
  source: TransferScopeShape,
  destination: TransferScopeShape,
): TransferCheckResult {
  if (source.scopeId === destination.scopeId) {
    return { allowed: false, reason: 'source and destination are the same scope' };
  }
  if (!isGeographic(source)) {
    return {
      allowed: false,
      reason: `source must be a branch or autonomous chapter (got ${source.scopeType}${
        source.scopeType === 'chapter' ? `/${source.chapterKind ?? 'null'}` : ''
      })`,
    };
  }
  if (!isGeographic(destination)) {
    return {
      allowed: false,
      reason: `destination must be a branch or autonomous chapter (got ${destination.scopeType}${
        destination.scopeType === 'chapter' ? `/${destination.chapterKind ?? 'null'}` : ''
      })`,
    };
  }
  return { allowed: true };
}
