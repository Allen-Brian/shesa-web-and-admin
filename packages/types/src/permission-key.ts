/**
 * The full permission catalog Shesa seeds (per spec §8.2).
 *
 * Format: `resource.action`. The policy module + RLS policies switch on
 * these strings; this literal union ensures every checker call is typed.
 *
 * Add a new permission HERE first, then in the SQL seed in E3.
 * commitlint won't catch a typo here, but the policy module's
 * `can(member, key, ...)` signature will.
 */

export const PERMISSION_KEYS = [
  // scopes
  'scope.read',
  'scope.manage',
  // Phase 1 E1.1 — org-management grain
  'scope.create',
  'scope.update',
  'scope.change_autonomy',

  // members
  'member.read',
  'member.manage',
  // Phase 1 E1.2 — member-engine grain
  'member.create',
  'member.update',
  // Phase 1 E1.3 — Excel import
  'member.import',
  // Phase 1 E1.4 — membership lifecycle
  'membership.approve',
  'membership.reject',
  'membership.transfer',
  'membership.mark_passive',
  'registration.mark_paid',
  // Phase 1 E1.5 — finish §4.1
  'scope.manage_capabilities',
  'member.export',
  // Phase 1 E1.6 — positions
  'position.assign',
  'position.remove',

  // Phase 2 — Exco governance flows
  'registration.waive',
  'event.create',
  'event.update',
  'event.publish',
  'event.cancel',
  'event.archive',
  'event.contribution.review',
  'announcement.create',
  'announcement.update',
  'announcement.publish',
  'announcement.archive',
  'member.bulk_action',
  'command.search',
  'admin_notification.read',

  // roles
  'role.grant',
  'role.revoke',

  // finance — coarse keys, kept for the seeded Finance role
  'finance.read',
  'finance.write',

  /* ── finance, fine-grained (Phase 3) ────────────────────────────────
   * These 28 keys were added by MIGRATIONS rather than the seed, so
   * until 2026-09-02 they existed in core.permissions but not here —
   * every `has_permission(..., 'payment.record')` call site was passing
   * an untyped string, and a typo would have failed closed at runtime
   * rather than at build time. The catalogue now lives entirely in
   * supabase/seed.sql and these two lists agree.
   * ------------------------------------------------------------------ */
  'treasury.read',
  'finance.report',
  'finance.export',

  'charge.create',
  'charge.update',
  'charge.archive',

  'contribution.approve',
  'contribution.extend',

  'obligation.cancel',
  'obligation.forgive',

  'payment.record',
  'payment.record_on_behalf',
  'payment.reverse',

  'expense.record',
  'expense.approve',
  'expense.reverse',
  'expense_settings.manage',

  'exception.create',
  'exception.apply_individual',

  'donation.record',
  'ticket.purchase',
  'receipt.generate',
  'reconciliation.record',
  'exchange_rate.set',
  'group.manage',

  'registration.pay_on_behalf',
  'membership.remove',
  'membership.engagement.set',

  // cms
  'cms.edit',

  // connect
  'connect.announce',
  'connect.poll',
  'connect.job.approve',

  // audit
  'audit.read',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];
