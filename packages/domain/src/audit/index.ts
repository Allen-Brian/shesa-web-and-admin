/**
 * Audit domain — typed wrappers around `audit.log_event(...)` and the
 * shape of per-entity history rows.
 *
 * E1 stub. Filled in during E4 (audit subsystem). The typed audit-action
 * keys are already in `@shesa/types`; re-exporting so callers
 * `import { AuditAction } from '@shesa/domain/audit'` without reaching
 * across packages.
 */

export type { AuditAction } from '@shesa/types';
export { AUDIT_ACTIONS } from '@shesa/types';
