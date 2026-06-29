/**
 * The set of audit-action keys written to `audit.audit_entries`.
 *
 * Phase 0 covers auth + RBAC + permission-denial events (per spec §11).
 * New actions are added here AND in the SQL/Edge-Function call sites
 * that emit them.
 */

export const AUDIT_ACTIONS = [
  'auth.login',
  'auth.logout',
  'auth.password_reset_requested',
  'auth.invite_accepted',
  'role.granted',
  'role.revoked',
  'role.expired',
  'permission.checked_denied',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
