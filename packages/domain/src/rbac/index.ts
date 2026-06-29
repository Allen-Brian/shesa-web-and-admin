/**
 * RBAC domain — policy module + role/permission helpers.
 *
 * E1 stub. Filled in during E3 (RBAC schema + permission checker) — the
 * policy module here will wrap the Postgres `core.has_permission(...)`
 * function via `@shesa/supabase`, and mirror the role/permission keys
 * already typed in `@shesa/types`.
 *
 * Re-exporting the typed keys here so callers can `import { RoleKey,
 * PermissionKey } from '@shesa/domain/rbac'` without reaching into
 * `@shesa/types` directly.
 */

export type { RoleKey, PermissionKey } from '@shesa/types';
export { ROLE_KEYS, PERMISSION_KEYS } from '@shesa/types';
