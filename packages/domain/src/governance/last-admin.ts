/**
 * Client-side mirror of `core.enforce_last_admin_protection`.
 *
 * Consumed by the Exco UI's Revoke button to disable + tooltip
 * BEFORE the user clicks — the DB trigger is the definitive gate,
 * this is UX-preflight only.
 *
 * Rules (must stay in sync with the migration):
 *   1. Self-revoke: caller equals target user → always blocked.
 *   2. Zero-admin: after revoking this assignment, the target scope
 *      would have zero active admin holders → blocked.
 *
 * "Admin" per §6.1 is {mainstream_admin, branch_admin}. Finance
 * holders don't count. Global grants (scope_id=null) are exempt —
 * Recruiter isn't an admin role.
 *
 * `batch_admin` was retired 2026-07-05.
 */

const ADMIN_ROLE_KEYS = new Set(['mainstream_admin', 'branch_admin']);

export interface AssignmentLike {
  id: string;
  userId: string;
  scopeId: string | null;
  roleKey: string;
  revokedAt: string | null;
  startsAt: string;
  endsAt: string | null;
}

export type RevokeCheckResult =
  { allowed: true } | { allowed: false; reason: 'SELF_REVOKE' | 'LAST_ADMIN'; message: string };

function isAdminRole(roleKey: string): boolean {
  return ADMIN_ROLE_KEYS.has(roleKey);
}

function isActive(assignment: AssignmentLike, now: Date = new Date()): boolean {
  if (assignment.revokedAt) return false;
  if (new Date(assignment.startsAt) > now) return false;
  if (assignment.endsAt && new Date(assignment.endsAt) <= now) return false;
  return true;
}

export function canRevokeAdmin(
  target: AssignmentLike,
  allAssignments: readonly AssignmentLike[],
  callerUserId: string,
  now: Date = new Date(),
): RevokeCheckResult {
  // Global grants are exempt.
  if (target.scopeId === null) return { allowed: true };

  // Not an admin role → not last-admin concern.
  if (!isAdminRole(target.roleKey)) return { allowed: true };

  // Self-revoke first — a scope with two admins can still block a
  // user from revoking themselves.
  if (target.userId === callerUserId) {
    return {
      allowed: false,
      reason: 'SELF_REVOKE',
      message: 'You cannot revoke your own admin role. Ask another admin.',
    };
  }

  // Zero-admin check: count other active admin holders at the same scope.
  const otherActiveAdmins = allAssignments.filter(
    (a) =>
      a.id !== target.id &&
      a.scopeId === target.scopeId &&
      isAdminRole(a.roleKey) &&
      isActive(a, now),
  );

  if (otherActiveAdmins.length === 0) {
    return {
      allowed: false,
      reason: 'LAST_ADMIN',
      message:
        'This is the last active admin at this scope. Grant admin to another user first, then revoke this one.',
    };
  }

  return { allowed: true };
}
