'use client';

import { Tooltip, TooltipContent, TooltipTrigger, cn } from '@shesa/ui';

export type ExcoTier = 'global' | 'branch';

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
 * Exco rank badge — the small emblem next to a member's name wherever
 * position-holders show up. Two ranks, visually distinct at a glance
 * (police-badge style):
 *
 *   - global (mainstream position): gold crown medallion + 3 pips.
 *     Reads as the top rank.
 *   - branch (branch or autonomous chapter position): steel-blue
 *     shield chevron + 2 pips. Reads as the rank below global.
 *
 * The `batch` tier was retired 2026-07-05 alongside the batch_admin
 * role. Positions still exist for batches in the catalog but they
 * don't produce Exco badges (they surface in a member's role list
 * without the emblem).
 *
 * Hover surfaces the position name + scope label.
 */
export function ExcoBadge({ info, size = 'sm' }: ExcoBadgeProps) {
  const dim = size === 'md' ? 24 : 20;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn('inline-flex shrink-0 items-center justify-center')}
          aria-label={info.positionName ?? 'Exco'}
        >
          {info.tier === 'global' ? <GlobalRank size={dim} /> : <BranchRank size={dim} />}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <div className="flex items-center gap-1.5 font-medium">
          <span
            className={cn(
              'inline-block h-1.5 w-1.5 rounded-full',
              info.tier === 'global' ? 'bg-amber-500' : 'bg-sky-500',
            )}
          />
          {info.tier === 'global' ? 'Global Exco' : 'Branch Exco'}
        </div>
        <div className="mt-0.5 font-medium text-foreground">{info.positionName ?? 'Exco'}</div>
        {info.scopeLabel && <div className="text-muted-foreground">{info.scopeLabel}</div>}
      </TooltipContent>
    </Tooltip>
  );
}

// ─── Rank SVGs ──────────────────────────────────────────────────────
// Two distinct silhouettes so the tier reads at a glance without
// depending on color (respects reduced-color settings + printouts).

function GlobalRank({ size }: { readonly size: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <defs>
        <linearGradient id="globalGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
      </defs>
      {/* Medallion */}
      <circle
        cx="12"
        cy="12"
        r="11"
        fill="url(#globalGradient)"
        stroke="#78350F"
        strokeWidth="0.75"
      />
      {/* Crown */}
      <path
        d="M6 13.5 L7.5 8 L10 11 L12 7 L14 11 L16.5 8 L18 13.5 Z"
        fill="#FFFBEB"
        stroke="#78350F"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
      <rect
        x="6"
        y="14"
        width="12"
        height="1.5"
        rx="0.3"
        fill="#FFFBEB"
        stroke="#78350F"
        strokeWidth="0.4"
      />
      {/* Rank pips (3) */}
      <circle cx="9" cy="17.5" r="0.7" fill="#78350F" />
      <circle cx="12" cy="17.5" r="0.7" fill="#78350F" />
      <circle cx="15" cy="17.5" r="0.7" fill="#78350F" />
    </svg>
  );
}

function BranchRank({ size }: { readonly size: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <defs>
        <linearGradient id="branchGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#1E40AF" />
        </linearGradient>
      </defs>
      {/* Shield silhouette */}
      <path
        d="M12 1.5 L21 4.5 L21 12 C21 17 17 21 12 22.5 C7 21 3 17 3 12 L3 4.5 Z"
        fill="url(#branchGradient)"
        stroke="#1E3A8A"
        strokeWidth="0.75"
        strokeLinejoin="round"
      />
      {/* Chevron mark */}
      <path
        d="M7 12 L12 8 L17 12 L15.5 12.5 L12 10 L8.5 12.5 Z"
        fill="#EFF6FF"
        stroke="#1E3A8A"
        strokeWidth="0.3"
      />
      {/* Rank pips (2) */}
      <circle cx="10" cy="16" r="0.7" fill="#EFF6FF" />
      <circle cx="14" cy="16" r="0.7" fill="#EFF6FF" />
    </svg>
  );
}
