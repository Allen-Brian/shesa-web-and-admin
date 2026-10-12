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
 * **Status: types only, no wiring.** This module re-exports the `AuditLogger`
 * contract and nothing else. The implementation it was written for —
 * `supabaseAuditLogger` from `@shesa/supabase` — was never built, and this
 * comment used to show a usage example calling it, which read as a working
 * integration rather than an intention. Nothing imports this module today.
 *
 * What does write audit rows: the `core.role_assignments` trigger, and
 * `supabase/functions/_shared/audit.ts` for the Edge Functions that call
 * `audit.log_event` directly (roles/grant-role). The app-side events listed
 * above — logins, denied permission checks — are not being recorded.
 */

export type { AuditAction, AuditLogger, AuditLogEvent } from '@shesa/types';
export { AUDIT_ACTIONS } from '@shesa/types';
