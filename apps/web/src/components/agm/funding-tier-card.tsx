'use client';

import { motion } from 'framer-motion';

import type { AgmFundingTier } from './agm-content';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

interface Props {
  readonly tier: AgmFundingTier;
  readonly active: boolean;
  readonly index: number;
}

/**
 * Per-tier visual language. Each metal gets its own gradient face + a
 * tinted border so a row of cards reads immediately as a hierarchy:
 * cool bronze at the low end, warm platinum at the top. Cards are
 * display-only now — the tier is derived from the donor's amount so
 * whichever card matches the current amount lights up automatically.
 */
const TIER_PALETTE: Record<AgmFundingTier['key'], TierPalette> = {
  bronze: {
    gradient: 'linear-gradient(135deg, #f6e4d4 0%, #d3925a 60%, #8a4a1e 100%)',
    accent: '#8a4a1e',
    faintBg: 'linear-gradient(160deg, rgba(210,140,72,0.14) 0%, rgba(138,74,30,0.06) 100%)',
    ring: 'rgba(138,74,30,0.35)',
    ink: '#5a2f14',
  },
  silver: {
    gradient: 'linear-gradient(135deg, #f3f4f6 0%, #b8bcc4 55%, #6c7280 100%)',
    accent: '#6c7280',
    faintBg: 'linear-gradient(160deg, rgba(184,188,196,0.16) 0%, rgba(108,114,128,0.06) 100%)',
    ring: 'rgba(108,114,128,0.35)',
    ink: '#3f434c',
  },
  gold: {
    gradient: 'linear-gradient(135deg, #fff2c4 0%, #e6b23a 55%, #96660d 100%)',
    accent: '#c48916',
    faintBg: 'linear-gradient(160deg, rgba(230,178,58,0.16) 0%, rgba(150,102,13,0.07) 100%)',
    ring: 'rgba(196,137,22,0.4)',
    ink: '#6c4708',
  },
  platinum: {
    gradient: 'linear-gradient(135deg, #eef1f6 0%, #b6c4d6 45%, #4a5a72 100%)',
    accent: '#3d4e66',
    faintBg: 'linear-gradient(160deg, rgba(182,196,214,0.18) 0%, rgba(74,90,114,0.07) 100%)',
    ring: 'rgba(61,78,102,0.4)',
    ink: '#2a3548',
  },
};

interface TierPalette {
  readonly gradient: string;
  readonly accent: string;
  readonly faintBg: string;
  readonly ring: string;
  readonly ink: string;
}

/**
 * One tier card. Renders a stacked layout (label / headline amount /
 * range subtitle / caption) with a metallic gradient bar on top and a
 * subtle full-card wash when the current donation amount falls inside
 * the tier's range.
 */
export function FundingTierCard({ tier, active, index }: Props) {
  const palette = TIER_PALETTE[tier.key];
  const rangeLabel = formatRange(tier);
  return (
    <motion.div
      aria-current={active}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.7, delay: index * 0.08, ease }}
      className={
        'group relative flex flex-col items-start gap-3 overflow-hidden rounded-xs border p-6 text-left transition-all duration-500 ' +
        (active ? 'shadow-[0_22px_60px_-25px_rgba(0,0,0,0.35)]' : 'border-black/10 bg-white')
      }
      style={
        active
          ? {
              borderColor: palette.accent,
              background: palette.faintBg,
              boxShadow: `0 22px 60px -25px ${palette.ring}`,
            }
          : undefined
      }
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: palette.gradient }}
      />

      <span
        className="mt-2 font-heading text-[11px] font-medium uppercase tracking-[0.28em]"
        style={{ color: palette.accent }}
      >
        {tier.label}
      </span>

      <div className="flex flex-col leading-none">
        <span
          className="font-heading font-thin tabular-nums"
          style={{
            fontSize: 'clamp(1.75rem, 3vw, 2.5rem)',
            letterSpacing: '-0.02em',
            color: active ? palette.ink : '#111',
          }}
        >
          {tier.amountXaf.toLocaleString()}
        </span>
        <span className="mt-1 text-[11px] uppercase tracking-[0.24em] text-black/50">XAF</span>
      </div>

      <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-black/55">
        {rangeLabel}
      </p>

      <p className="text-[13px] leading-[1.65] text-black/65">{tier.caption}</p>

      <span
        className={
          'mt-2 inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.2em] transition-colors ' +
          (active ? '' : 'text-black/35')
        }
        style={active ? { color: palette.accent } : undefined}
      >
        {active ? 'Your tier' : 'In range'}
        {active && <span aria-hidden>·</span>}
      </span>
    </motion.div>
  );
}

function formatRange(tier: AgmFundingTier): string {
  const fmt = (n: number) => n.toLocaleString();
  if (tier.unbounded) return `${fmt(tier.minAmountXaf)} XAF and above`;
  if (tier.minAmountXaf <= 1) return `Up to ${fmt(tier.amountXaf)} XAF`;
  return `${fmt(tier.minAmountXaf)} - ${fmt(tier.amountXaf)} XAF`;
}
