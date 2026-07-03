// Shared role catalog + suggested-role mapping used by the governance
// dialogs at every geographic scope (branch, autonomous chapter, and any
// future geographic scope that ships governance). Kept in one place so a
// change in role vocabulary (e.g. splitting `branch_admin` into a
// `chapter_admin` variant) rewrites all callers at once.

export const GOVERNANCE_ROLE_OPTIONS = [
  { key: 'branch_admin', label: 'Admin' },
  { key: 'finance', label: 'Finance' },
] as const;

/**
 * Position → role suggestion the assign dialog defaults to. The officer can
 * still override or turn the toggle off. Positions not listed here get no
 * suggestion (toggle starts off).
 */
export const SUGGESTED_ROLE_BY_POSITION: Record<string, string | undefined> = {
  President: 'branch_admin',
  'Vice President': 'branch_admin',
  'Financial Secretary': 'finance',
  Treasurer: 'finance',
};
