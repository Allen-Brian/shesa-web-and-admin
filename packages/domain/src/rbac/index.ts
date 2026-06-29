/**
 * RBAC domain — policy factory + role/permission key re-exports.
 *
 * The CONTRACT (PermissionChecker interface) lives in `@shesa/types` so
 * both this package and `@shesa/supabase` (the concrete impl) can
 * reference it without creating a sibling-package dep. Apps wire them
 * up at the boundary (E10 Server Actions).
 *
 * Usage in a Server Action:
 *
 *   import { createPolicy } from '@shesa/domain/rbac';
 *   import { supabasePermissionChecker } from '@shesa/supabase';  // E10
 *
 *   const supabase = createServerClient(cookies);
 *   const policy = createPolicy(supabasePermissionChecker(supabase));
 *
 *   if (!(await policy.can(userId, scopeId, 'charge.create'))) {
 *     throw new ForbiddenError('charge.create', { scopeId });
 *   }
 */

import type { PermissionChecker, PermissionKey } from '@shesa/types';

export type { RoleKey, PermissionKey, PermissionChecker } from '@shesa/types';
export { ROLE_KEYS, PERMISSION_KEYS } from '@shesa/types';

/**
 * The handle a Server Action / Edge Function uses to make permission
 * decisions. Wraps a PermissionChecker with the canonical method names
 * the rest of the codebase reads from (`policy.can(...)` matches
 * `if (policy.can(...)) {...}` patterns more naturally than `.has(...)`).
 */
export interface Policy {
  /**
   * True iff the user has the permission at the scope. Equivalent to
   * `checker.has(...)` — separate method name for readability at call
   * sites.
   */
  can(userId: string, scopeId: string, permission: PermissionKey): Promise<boolean>;

  /**
   * The full set of permissions the user has at the scope. Use when an
   * action needs to render UI based on multiple permissions; preferred
   * over N independent `can()` calls.
   */
  permissions(userId: string, scopeId: string): Promise<readonly PermissionKey[]>;
}

export function createPolicy(checker: PermissionChecker): Policy {
  return {
    can: (userId, scopeId, permission) => checker.has(userId, scopeId, permission),
    permissions: (userId, scopeId) => checker.list(userId, scopeId),
  };
}
