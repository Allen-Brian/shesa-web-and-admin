'use client';

import { motion } from 'framer-motion';

import type { SponsorTier } from './sponsors-content';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

function CheckIcon({
  className,
  style,
}: {
  readonly className?: string;
  readonly style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

const ACCENTS: Record<SponsorTier['accent'], { readonly bar: string; readonly chip: string }> = {
  primary: {
    bar: 'var(--color-primary)',
    chip: 'color-mix(in srgb, var(--color-primary) 12%, white)',
  },
  gold: { bar: '#c9a44a', chip: '#f6efdc' },
  silver: { bar: '#8a8f96', chip: '#eef1f4' },
  bronze: { bar: '#a1704a', chip: '#f5ebde' },
};

interface Props {
  readonly tier: SponsorTier;
  readonly index: number;
}

export function TierCard({ tier, index }: Props) {
  const accent = ACCENTS[tier.accent];
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, delay: index * 0.08, ease }}
      className="group relative flex h-full flex-col overflow-hidden rounded-xs border border-black/8 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-500 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_18px_40px_-12px_rgba(139,21,51,0.16)] md:p-8"
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
        style={{ backgroundColor: accent.bar }}
      />

      <p
        className="inline-flex w-fit items-center rounded-xs px-2.5 py-1 font-heading text-[10.5px] font-medium uppercase tracking-[0.24em]"
        style={{ backgroundColor: accent.chip, color: accent.bar }}
      >
        {tier.name}
      </p>

      <h3
        className="mt-5 font-heading font-thin leading-tight text-black"
        style={{ fontSize: 'clamp(1.5rem, 2.6vw, 2.15rem)', letterSpacing: '-0.02em' }}
      >
        {tier.headline}
      </h3>

      <p className="mt-3 font-heading text-sm font-light tabular-nums text-black/70">
        {tier.amount}
      </p>

      <ul className="mt-6 flex flex-col gap-2.5 text-[13.5px] leading-[1.6] text-black/70">
        {tier.perks.map((p) => (
          <li key={p} className="flex items-start gap-2">
            <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: accent.bar }} />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </motion.article>
  );
}
