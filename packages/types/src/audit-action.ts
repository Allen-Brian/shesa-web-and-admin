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
  'member.invited',
  'member.invite_resent',
  // ─── Phase 3 finance ────────────────────────────────────────────────
  // Verb+object per convention. State nouns ('paid', 'forgiven',
  // 'cancelled') stay in the DB enums; audit actions are the
  // transitions that produce them.
  'charge.created',
  'charge.updated',
  'charge.archived',
  'contribution.approved',
  'contribution.closed',
  'contribution.extended',
  'donation.recorded',
  'payment.recorded',
  'payment.recorded_on_behalf',
  'payment.reversed',
  'obligation.generated',
  'obligation.cancelled',
  'obligation.forgiven',
  'exception.created',
  'exception.applied_individual',
  'expense.recorded',
  'expense.approved',
  'expense.reversed',
  'expense_settings.updated',
  'exchange_rate.set',
  'receipt.generated',
  'receipt.verified',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
