'use client';

import { motion, type Variants } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, delay: i * 0.12, ease },
  }),
};

const revealParent: Variants = {
  hidden: {},
  visible: { transition: { delayChildren: 0.25, staggerChildren: 0.15 } },
};

const revealLine: Variants = {
  hidden: { y: '110%' },
  visible: { y: 0, transition: { duration: 1, ease } },
};

interface SongsHeroProps {
  readonly songCount: number;
  readonly groupCount: number;
}

export function SongsHero({ songCount, groupCount }: SongsHeroProps) {
  const stats = [
    { value: String(songCount), label: 'Songs' },
    { value: String(groupCount), label: 'Groups' },
  ];

  return (
    <section
      data-nav-dark
      className="relative isolate flex min-h-[60svh] w-full items-center overflow-hidden bg-black pb-20 pt-32 text-white md:pt-40"
    >
      <AnimatedBars />
      <AmbientGlow />

      <div className="relative mx-auto flex w-full max-w-350 flex-col items-center px-5 text-center md:px-8 lg:px-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.6 }}
          variants={fadeUp}
          className="flex items-center justify-center gap-4"
        >
          <span className="h-px w-14 bg-primary/60 md:w-20" />
          <span
            aria-hidden
            className="block h-2 w-2 rotate-45 bg-primary"
            style={{
              boxShadow: '0 0 12px 2px color-mix(in srgb, var(--color-primary) 60%, transparent)',
            }}
          />
          <span className="h-px w-14 bg-primary/60 md:w-20" />
        </motion.div>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.6 }}
          variants={fadeUp}
          custom={1}
          className="mt-6 font-heading text-[11px] font-medium uppercase text-white/75 md:text-xs"
          style={{ letterSpacing: '0.5em' }}
        >
          The Songbook
        </motion.p>

        <motion.h1
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={revealParent}
          className="mt-8 font-heading font-thin leading-[1.05] text-white"
          style={{
            fontSize: 'clamp(2.25rem, 5.4vw, 5rem)',
            letterSpacing: '-0.02em',
          }}
        >
          <span className="block overflow-hidden pb-1 md:pb-2">
            <motion.span variants={revealLine} className="block">
              Every note.
            </motion.span>
          </span>
          <span className="block overflow-hidden pb-1 md:pb-2">
            <motion.span variants={revealLine} className="block italic text-primary">
              Every anthem.
            </motion.span>
          </span>
        </motion.h1>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={fadeUp}
          custom={7}
          className="mt-8 max-w-2xl text-[15px] leading-[1.8] text-white/70 md:text-base"
        >
          The anthems, the chapter songs, the cultural pieces, every song we carry, in one place.
          Press play and it stays with you as you scroll.
        </motion.p>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={fadeUp}
          custom={9}
          className="mt-12 grid grid-cols-2 gap-14 md:mt-14 md:gap-20"
        >
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center">
              <span
                className="font-heading font-thin leading-none tracking-tight tabular-nums text-white"
                style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)' }}
              >
                {s.value}
              </span>
              <span className="mt-2 text-[10px] font-medium uppercase tracking-[0.3em] text-white/60">
                {s.label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/**
 * Ambient looping "waveform" bars behind the hero copy. Each bar's
 * height animates with a randomised delay so the whole thing feels
 * alive without any actual audio playing yet.
 */
function AnimatedBars() {
  const bars = Array.from({ length: 44 }, (_, i) => i);
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 flex h-40 items-end justify-center gap-1.5 opacity-30 md:h-56"
    >
      {bars.map((i) => {
        // Deterministic pseudo-random height factor per bar.
        const seed = ((i * 9301 + 49297) % 233280) / 233280;
        return (
          <motion.span
            key={i}
            initial={{ scaleY: 0.15 }}
            animate={{ scaleY: [0.2, 0.75 + seed * 0.5, 0.3, 0.9, 0.25] }}
            transition={{
              duration: 2.6 + seed * 1.2,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: seed * 1.4,
            }}
            className="block w-1 origin-bottom rounded-full bg-primary"
          />
        );
      })}
    </div>
  );
}

function AmbientGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-20"
      style={{
        background:
          'radial-gradient(45% 55% at 50% 45%, color-mix(in srgb, var(--color-primary) 22%, transparent) 0%, transparent 65%), radial-gradient(30% 45% at 12% 90%, color-mix(in srgb, var(--color-primary) 14%, transparent) 0%, transparent 60%), radial-gradient(30% 45% at 88% 90%, color-mix(in srgb, var(--color-primary) 12%, transparent) 0%, transparent 60%)',
      }}
    />
  );
}
