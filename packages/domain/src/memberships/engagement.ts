/**
 * Engagement tier — manual admin-set devotion ladder on a membership.
 *
 * Locked 2026-07-03 (see memory/project_phase2_membership_locks.md #1):
 *   dormant < normal < engaged < committed
 * Default `'normal'` at join. Admin-set via `membership.engagement.set`.
 *
 * Orthogonal to `membership_status` — engagement is the admin's
 * judgment of devotion; membership_status is governance standing. The
 * two are DIFFERENT columns for DIFFERENT questions and MUST NEVER be
 * collapsed into one "status." UI copy discipline: the word "passive"
 * only refers to membership_status = 'passive'; the word "dormant"
 * only refers to engagement = 'dormant'.
 *
 * Enum values are LOWERCASE to match every existing enum in the schema
 * (scope_status, membership_status, chapter_kind, membership_join_method).
 * Postgres enums are case-sensitive; deviating would silently break
 * hand-written queries.
 */

export const ENGAGEMENT_TIERS = ['dormant', 'normal', 'engaged', 'committed'] as const;
export type EngagementTier = (typeof ENGAGEMENT_TIERS)[number];

const TIER_INDEX: Record<EngagementTier, number> = {
  dormant: 0,
  normal: 1,
  engaged: 2,
  committed: 3,
};

/**
 * Can the ladder move a member from `current` up to `next`? A promotion
 * is any strictly-higher tier. Returns false for lateral moves (same tier).
 * Demotions go through `canDemoteEngagement` — this is one-directional.
 */
export function canPromoteEngagement(current: EngagementTier, next: EngagementTier): boolean {
  return TIER_INDEX[next] > TIER_INDEX[current];
}

/**
 * Can the ladder move a member from `current` down to `next`?
 * Demotions are always legal; the check exists for symmetry and to
 * let call sites distinguish direction without knowing tier positions.
 */
export function canDemoteEngagement(current: EngagementTier, next: EngagementTier): boolean {
  return TIER_INDEX[next] < TIER_INDEX[current];
}

/**
 * UI display label. Storage always uses the lowercase enum value; UI
 * uses this helper for chip/badge/table copy.
 */
const TIER_LABELS: Record<EngagementTier, string> = {
  dormant: 'Dormant',
  normal: 'Normal',
  engaged: 'Engaged',
  committed: 'Committed',
};

export function formatEngagementTier(tier: EngagementTier): string {
  return TIER_LABELS[tier];
}
