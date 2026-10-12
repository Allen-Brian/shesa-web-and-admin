'use client';

import { motion, type Variants } from 'framer-motion';

import { SPONSOR_META } from './agm-sponsor-content';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.85, delay: i * 0.1, ease },
  }),
};

export function AgmSponsorHero() {
  return (
    <section
      data-nav-dark
      className="relative isolate overflow-hidden bg-black py-28 text-white md:py-36"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(55% 65% at 50% 30%, color-mix(in srgb, var(--color-primary) 22%, transparent) 0%, transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/60 to-transparent"
      />

      <div className="relative mx-auto max-w-6xl px-5 md:px-8 lg:px-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.6 }}
          variants={fadeUp}
          className="flex items-center gap-3"
        >
          <span className="h-px w-10 bg-primary/60" />
          <p
            className="font-heading text-[11px] font-medium uppercase text-white/70"
            style={{ letterSpacing: '0.5em' }}
          >
            {SPONSOR_META.eyebrow}
          </p>
        </motion.div>

        <motion.h1
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          custom={1}
          className="mt-8 font-heading font-thin leading-[1.02] text-white"
          style={{ fontSize: 'clamp(2.25rem, 5.5vw, 4.75rem)', letterSpacing: '-0.02em' }}
        >
          {SPONSOR_META.headline}
        </motion.h1>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          custom={2}
          className="mt-8 max-w-3xl text-[16px] leading-[1.85] text-white/75 md:text-[17px]"
        >
          {SPONSOR_META.subhead}
        </motion.p>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          custom={3}
          className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-3 text-white/70"
        >
          <p className="font-heading text-[13px] font-medium tracking-[0.14em]">
            {SPONSOR_META.dates}
          </p>
          <span className="h-1 w-1 rounded-full bg-white/40" />
          <p className="font-heading text-[13px] font-light tracking-[0.14em]">
            {SPONSOR_META.venue}
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          custom={4}
          className="mt-14 flex flex-col gap-4 sm:flex-row"
        >
          <a
            href="#tiers"
            className="group inline-flex items-center gap-3 rounded-xs bg-primary px-8 py-4 text-sm font-medium tracking-wide text-primary-foreground shadow-[0_20px_60px_-15px_rgba(139,21,51,0.6)] transition-transform duration-500 hover:-translate-y-0.5 md:text-base"
          >
            <span>View partnership tiers</span>
            <span
              aria-hidden
              className="grid h-7 w-7 place-items-center rounded-xs bg-white/20 transition-transform duration-500 group-hover:translate-x-1"
            >
              →
            </span>
          </a>
          <a
            href="#request-deck"
            className="group inline-flex items-center gap-3 rounded-xs border border-white/25 bg-white/3 px-8 py-4 text-sm font-medium tracking-wide text-white backdrop-blur-sm transition-all duration-500 hover:-translate-y-0.5 hover:border-white hover:bg-white hover:text-black md:text-base"
          >
            <span>Request the partnership deck</span>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
