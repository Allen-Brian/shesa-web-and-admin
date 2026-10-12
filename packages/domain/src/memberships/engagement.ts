/**
 * Engagement tier — manual admin-set devotion ladder on a membership.
 *
 * Locked 2026-07-03 (see memory/project_phase2_membership_locks.md #1),
 * extended 2026-07-05 with `pillar` (5⭐):
 *   dormant < normal < engaged < committed < pillar
 * Default `'normal'` at join. Admin-set via `membership.engagement.set`.
 *
 * UI renders the ladder as stars: 1⭐ dormant, 2⭐ normal, 3⭐ engaged,
 * 4⭐ committed, 5⭐ pillar.
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

export const ENGAGEMENT_TIERS = ['dormant', 'normal', 'engaged', 'committed', 'pillar'] as const;
export type EngagementTier = (typeof ENGAGEMENT_TIERS)[number];

const TIER_INDEX: Record<EngagementTier, number> = {
  dormant: 0,
  normal: 1,
  engaged: 2,
  committed: 3,
  pillar: 4,
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
  pillar: 'Pillar',
};

export function formatEngagementTier(tier: EngagementTier): string {
  return TIER_LABELS[tier];
}

/**
 * Star rating for a tier — 1..5. Used by the star badge in tables and
 * the member profile. Storage stays as the enum string.
 */
const TIER_STARS: Record<EngagementTier, 1 | 2 | 3 | 4 | 5> = {
  dormant: 1,
  normal: 2,
  engaged: 3,
  committed: 4,
  pillar: 5,
};

export function engagementStarCount(tier: EngagementTier): 1 | 2 | 3 | 4 | 5 {
  return TIER_STARS[tier];
}
