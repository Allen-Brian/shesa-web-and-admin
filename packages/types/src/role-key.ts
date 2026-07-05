/**
 * The set of functional + position-derived role keys Shesa seeds.
 *
 * These are the keys the `core.roles` table is seeded with in E3.
 * Stronger typing than `string` so misspellings fail at the type level
 * (`policy.can(member, 'role.grant', ...)` etc.).
 *
 * Note: position badges (President, Treasurer, etc.) imply permission
 * bundles too but are tracked separately in `core.positions` — they
 * are NOT in this enum.
 *
 * `batch_admin` was retired 2026-07-05 — batches are now a cluster-only
 * filter dimension, not a permission-bearing scope.
 */

export const ROLE_KEYS = [
  'mainstream_admin',
  'branch_admin',
  'finance',
  'editor',
  'recruiter',
  'announcer',
] as const;

export type RoleKey = (typeof ROLE_KEYS)[number];
