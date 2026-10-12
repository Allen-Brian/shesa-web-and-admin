import type { PermissionKey } from './permission-key';

/**
 * The contract callers use to ask "can this user do X at this scope?".
 *
 * Defined in `@shesa/types` (the root of the type graph) so both the
 * domain layer and the concrete Supabase implementation can reference
 * the same interface without `@shesa/domain` and `@shesa/supabase`
 * needing to depend on each other (they're siblings — see ADR-0010).
 *
 * The concrete impl wired up by apps in E10 calls Postgres functions
 * `core.has_permission` / `core.get_user_permissions` via the Supabase
 * RPC. Tests inject a fake impl that returns canned answers without
 * needing a database.
 */
export interface PermissionChecker {
  /**
   * True iff the user has the given permission at the given scope (or
   * at any non-autonomous ancestor scope per ADR-0007).
   */
  has(userId: string, scopeId: string, permission: PermissionKey): Promise<boolean>;

  /**
   * The distinct set of permission keys the user effectively has at the
   * given scope. Use when checking multiple permissions in a single
   * resolution to avoid N round trips.
   */
  list(userId: string, scopeId: string): Promise<readonly PermissionKey[]>;
}
