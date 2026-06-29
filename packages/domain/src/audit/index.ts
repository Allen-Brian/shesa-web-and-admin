/**
 * Audit domain — typed wrappers around the `audit.log_event(...)`
 * Postgres helper plus the contract apps wire up at the boundary.
 *
 * IMPORTANT: for **role grants and revocations**, the database trigger
 * on `core.role_assignments` writes audit entries automatically. Apps
 * MUST NOT call `audit.log_event('role.granted', ...)` manually — that
 * would produce a duplicate entry. Use this module for the audit actions
 * the database doesn't catch on its own:
 *
 *   - auth.login, auth.logout, auth.password_reset_requested, auth.invite_accepted
 *   - permission.checked_denied
 *   - (future) payment.recorded, member.transferred, etc.
 *
 * Wiring (apps in E10):
 *
 *   import { supabaseAuditLogger } from '@shesa/supabase';  // (added in E10)
 *   import type { AuditLogger } from '@shesa/domain/audit';
 *
 *   const logger: AuditLogger = supabaseAuditLogger(serverClient);
 *   await logger.log({
 *     action: 'auth.login',
 *     entitySchema: 'auth',
 *     entityTable: 'users',
 *     entityId: user.id,
 *     ipAddress: req.headers.get('x-forwarded-for') ?? undefined,
 *   });
 */

export type { AuditAction, AuditLogger, AuditLogEvent } from '@shesa/types';
export { AUDIT_ACTIONS } from '@shesa/types';
