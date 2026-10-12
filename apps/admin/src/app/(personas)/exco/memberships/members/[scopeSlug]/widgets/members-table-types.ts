import type { MembersPageRow } from './members-page';

export type SerialRow = MembersPageRow & { readonly serial: number };

export type MembersConfirmState = null | {
  readonly kind: 'remove';
  readonly targets: readonly SerialRow[];
};

export const ENGAGEMENT_TIERS = ['dormant', 'normal', 'engaged', 'committed', 'pillar'] as const;

export type EngagementTierValue = (typeof ENGAGEMENT_TIERS)[number];
