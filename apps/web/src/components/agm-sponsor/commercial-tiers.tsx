'use client';

import { motion } from 'framer-motion';

import { COMMERCIAL_TIERS, type CommercialTier } from './agm-sponsor-content';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

type Accent = CommercialTier['accent'];

interface Palette {
  readonly gradient: string;
  readonly ring: string;
  readonly ink: string;
  readonly chip: string;
}

const PALETTE: Record<Accent, Palette> = {
  primary: {
    gradient: 'linear-gradient(135deg, #8B1533 0%, #6A0F27 60%, #4A0A1C 100%)',
    ring: 'ring-1 ring-primary/30',
    ink: 'text-white',
    chip: 'bg-white/15 text-white',
  },
  platinum: {
    gradient: 'linear-gradient(135deg, #E8ECF0 0%, #B8C0CB 45%, #8B95A5 100%)',
    ring: 'ring-1 ring-black/8',
    ink: 'text-black',
    chip: 'bg-black/8 text-black',
  },
  gold: {
    gradient: 'linear-gradient(135deg, #F6D77E 0%, #C89A3B 55%, #8A5F1C 100%)',
    ring: 'ring-1 ring-black/8',
    ink: 'text-black',
    chip: 'bg-black/10 text-black',
  },
  silver: {
    gradient: 'linear-gradient(135deg, #EFF2F5 0%, #C0C8D2 55%, #8790A0 100%)',
    ring: 'ring-1 ring-black/8',
    ink: 'text-black',
    chip: 'bg-black/8 text-black',
  },
  bronze: {
    gradient: 'linear-gradient(135deg, #E8B888 0%, #B87333 55%, #7C4A1D 100%)',
    ring: 'ring-1 ring-black/8',
    ink: 'text-white',
    chip: 'bg-white/15 text-white',
  },
};

/**
 * The five AGM 2026 commercial tiers. Deliberately no prices, the
 * outreach doc calls suggested tier amounts an internal planning
 * position, not a public price list. Cards trade benefits for a
 * "request the deck" CTA.
 */
export function CommercialTiers() {
  return (
    <section
      id="tiers"
      className="relative py-24 text-black md:py-28"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 3%, white) 0%, color-mix(in srgb, var(--color-primary) 5%, white) 100%)',
      }}
    >
      <div className="mx-auto max-w-6xl px-5 md:px-8 lg:px-12">
        <div className="max-w-3xl">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.7, ease }}
            className="font-heading text-[11px] font-medium uppercase tracking-[0.32em] text-primary"
          >
            Commercial tiers
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.85, delay: 0.1, ease }}
            className="mt-5 font-heading font-thin leading-[1.1] text-black"
            style={{ fontSize: 'clamp(1.85rem, 3.6vw, 3rem)', letterSpacing: '-0.02em' }}
          >
            Five ways to sponsor. One conversation.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.85, delay: 0.18, ease }}
            className="mt-5 max-w-2xl text-[15px] leading-[1.8] text-black/65"
          >
            Every tier trades a defined level of commercial support for a matching level of
            visibility, hospitality, and access. Tier amounts are shared in the partnership deck.
            Request it below.
          </motion.p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
          {COMMERCIAL_TIERS.map((tier, i) => {
            const p = PALETTE[tier.accent];
            return (
              <motion.article
                key={tier.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.85, delay: i * 0.08, ease }}
                className={`group relative overflow-hidden rounded-xs p-6 shadow-[0_15px_50px_-20px_rgba(0,0,0,0.25)] md:p-7 ${p.ring}`}
                style={{ background: p.gradient }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex rounded-xs px-2.5 py-1 font-heading text-[10px] font-medium uppercase tracking-[0.22em] ${p.chip}`}
                  >
                    Tier · 0{i + 1}
                  </span>
                  <span
                    className={`font-heading text-[10px] font-medium uppercase tracking-[0.24em] ${p.ink} opacity-60`}
                  >
                    {tier.label}
                  </span>
                </div>

                <h3
                  className={`mt-6 font-heading font-medium leading-[1.15] ${p.ink}`}
                  style={{ fontSize: 'clamp(1.05rem, 1.5vw, 1.25rem)', letterSpacing: '-0.005em' }}
                >
                  {tier.headline}
                </h3>
                <p className={`mt-3 text-[13px] leading-[1.7] ${p.ink} opacity-80`}>
                  {tier.summary}
                </p>

                <ul
                  className={`mt-6 flex flex-col gap-2.5 border-t ${p.ink} border-current/20 pt-4`}
                >
                  {tier.benefits.map((b, idx) => (
                    <li
                      key={idx}
                      className={`grid grid-cols-[16px_1fr] items-baseline gap-2 text-[12.5px] leading-[1.65] ${p.ink} opacity-90`}
                    >
                      <span
                        aria-hidden
                        className="mt-1 h-1.5 w-1.5 rotate-45 bg-current"
                        style={{ marginLeft: 4 }}
                      />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
