/**
 * Pure transfer legality (§2.14, revised 2026-07-03 flip).
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
 * Authorization model (2026-07-03 flip — was source-scoped in Phase 1):
 *   * `canRequestTransfer` — the request is originated at the SOURCE.
 *     Any admin at the source with `membership.transfer` may create the
 *     request. Members may also self-request via Connect (Phase 8).
 *   * `canApproveTransfer` — the request is approved at the DESTINATION.
 *     Only admins at the destination with `membership.transfer` may
 *     approve. Source admins are NOTIFIED but cannot approve or veto.
 *
 * This file describes SHAPE legality (source/dest scope types + non-
 * equality). Authorization is enforced by the Edge Functions' authorize()
 * calls; these predicates are the client-side pre-flight the UI uses to
 * hide/show controls before the round-trip.
 */

import type { ChapterKind, ScopeType } from '../scopes/scope-constants';

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

/**
 * Renamed from `canTransfer` on the 2026-07-03 flip. This checks the
 * legality of REQUESTING a transfer (source-side). Approval is a
 * separate predicate (`canApproveTransfer`) with a different scope.
 */
export function canRequestTransfer(
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

/**
 * @deprecated Renamed to `canRequestTransfer` on the 2026-07-03 flip.
 * Kept as an alias so Phase 1 callers keep compiling; delete in Phase 3
 * once every consumer has migrated.
 */
export const canTransfer = canRequestTransfer;

export interface DestinationApprovalContext {
  /** Destination scope shape (approval is checked here, not at source). */
  destination: TransferScopeShape;
  /** Does the actor hold `membership.transfer` at the destination? */
  actorHasMembershipTransferAtDestination: boolean;
}

/**
 * Pre-flight for the destination-approves flip: the acting admin must
 * (a) be at a destination that CAN legally hold a membership (a
 * geographic scope) and (b) hold `membership.transfer` at that
 * destination. Source-side grants are IRRELEVANT — this is the whole
 * point of the flip.
 *
 * The Edge Function re-checks server-side; this predicate is UI-only
 * for showing/hiding the Approve button.
 */
export function canApproveTransfer(ctx: DestinationApprovalContext): TransferCheckResult {
  if (!isGeographic(ctx.destination)) {
    return {
      allowed: false,
      reason: `destination must be a branch or autonomous chapter (got ${ctx.destination.scopeType}${
        ctx.destination.scopeType === 'chapter' ? `/${ctx.destination.chapterKind ?? 'null'}` : ''
      })`,
    };
  }
  if (!ctx.actorHasMembershipTransferAtDestination) {
    return {
      allowed: false,
      reason: 'actor does not hold membership.transfer at the destination scope',
    };
  }
  return { allowed: true };
}
