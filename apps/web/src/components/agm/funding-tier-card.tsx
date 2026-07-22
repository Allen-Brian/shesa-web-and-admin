'use client';

import { motion } from 'framer-motion';

import type { AgmFundingTier } from './data';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

interface Props {
  readonly tier: AgmFundingTier;
  readonly active: boolean;
  readonly index: number;
  readonly onSelect: (key: AgmFundingTier['key']) => void;
}

/**
 * One tier card in the funding tier picker. Renders a stacked layout
 * (label / amount / caption) with an accent border on the active card.
 * The active state comes from the parent so the row can single-select
 * across all four cards.
 */
export function FundingTierCard({ tier, active, index, onSelect }: Props) {
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(tier.key)}
      aria-pressed={active}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.7, delay: index * 0.08, ease }}
      className={
        'group relative flex flex-col items-start gap-3 rounded-xs border p-6 text-left transition-all duration-500 ' +
        (active
          ? 'border-primary bg-primary/[0.04] shadow-[0_18px_50px_-25px_rgba(139,21,51,0.5)]'
          : 'border-black/10 bg-white hover:-translate-y-0.5 hover:border-black/30')
      }
    >
      <span
        className={
          'font-heading text-[11px] font-medium uppercase tracking-[0.28em] ' +
          (active ? 'text-primary' : 'text-black/60')
        }
      >
        {tier.label}
      </span>
      <div className="flex flex-col leading-none">
        <span
          className="font-heading font-thin tabular-nums text-black"
          style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', letterSpacing: '-0.02em' }}
        >
          {tier.amountXaf.toLocaleString()}
        </span>
        <span className="mt-1 text-[11px] uppercase tracking-[0.24em] text-black/50">XAF</span>
      </div>
      <p className="text-[13px] leading-[1.65] text-black/60">{tier.caption}</p>
      <span
        className={
          'mt-2 inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.2em] transition-colors ' +
          (active ? 'text-primary' : 'text-black/40 group-hover:text-black/70')
        }
      >
        {active ? 'Selected' : 'Choose'}
        <span aria-hidden>→</span>
      </span>
    </motion.button>
  );
}
