'use client';

import { Crown, Shield } from 'lucide-react';

import { Tooltip, TooltipContent, TooltipTrigger, cn } from '@shesa/ui';

export type ExcoTier = 'global' | 'local';

export interface ExcoBadgeInfo {
  readonly tier: ExcoTier;
  /** e.g. "President" / "Financial Secretary". Falls back to just "Exco" when absent. */
  readonly positionName?: string | null;
  /** e.g. "Shesa Buea" / "Shesa Mainstream" — surfaces in the tooltip. */
  readonly scopeLabel?: string | null;
}

interface ExcoBadgeProps {
  readonly info: ExcoBadgeInfo;
  readonly size?: 'sm' | 'md';
}

/**
 * The Exco badge — the small emblem that sits next to a member's name
 * everywhere a position-holder is displayed. Two tiers per the 2026-07-03
 * governance spec:
 *   - global: mainstream position holder (Crown, gold)
 *   - local:  branch / chapter / autonomous-batch position holder
 *             (Shield, burgundy — matches the app primary)
 *
 * Hover shows the position name + scope label as an accessible tooltip.
 */
export function ExcoBadge({ info, size = 'sm' }: ExcoBadgeProps) {
  const Icon = info.tier === 'global' ? Crown : Shield;
  const sizeCls = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-flex items-center justify-center rounded-full',
            info.tier === 'global'
              ? 'bg-amber-400/20 text-amber-600 dark:text-amber-300'
              : 'bg-primary/15 text-primary',
            size === 'sm' ? 'h-5 w-5' : 'h-6 w-6',
          )}
          aria-label={info.positionName ?? 'Exco'}
        >
          <Icon className={sizeCls} />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <div className="font-medium">{info.positionName ?? 'Exco'}</div>
        {info.scopeLabel && <div className="text-muted-foreground">{info.scopeLabel}</div>}
      </TooltipContent>
    </Tooltip>
  );
}
