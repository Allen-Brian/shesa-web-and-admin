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

  // members
  'member.read',
  'member.manage',

  // roles
  'role.grant',
  'role.revoke',

  // finance
  'finance.read',
  'finance.write',

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
