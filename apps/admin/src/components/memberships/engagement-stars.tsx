import { Star } from 'lucide-react';

import { cn } from '@shesa/ui';

import { engagementStarCount, formatEngagementTier } from '@shesa/domain/memberships';
import type { EngagementTier } from '@shesa/domain/memberships';

interface EngagementStarsProps {
  readonly tier: EngagementTier | null | undefined;
  readonly size?: 'sm' | 'md';
  readonly showLabel?: boolean;
  readonly className?: string;
}

/**
 * Engagement rendered as 1–5 stars per the 2026-07-05 lock:
 *   1⭐ Dormant · 2⭐ Normal · 3⭐ Engaged · 4⭐ Committed · 5⭐ Pillar
 *
 * The star count comes from the domain helper — never inline the
 * enum → star mapping at the call site.
 */
export function EngagementStars({
  tier,
  size = 'sm',
  showLabel = false,
  className,
}: EngagementStarsProps) {
  if (!tier) {
    return <span className="text-muted-foreground">—</span>;
  }

  const stars = engagementStarCount(tier);
  const dim = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';

  return (
    <span
      className={cn('inline-flex items-center gap-0.5', className)}
      aria-label={`${stars} of 5 stars — ${formatEngagementTier(tier)}`}
      title={formatEngagementTier(tier)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            dim,
            n <= stars ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40',
          )}
        />
      ))}
      {showLabel && (
        <span className="ml-1 text-xs text-muted-foreground">{formatEngagementTier(tier)}</span>
      )}
    </span>
  );
}
