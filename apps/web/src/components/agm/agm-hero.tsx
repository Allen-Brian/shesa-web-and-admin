'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';

import { AGM_META } from './agm-content';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const revealParent: Variants = {
  hidden: {},
  visible: { transition: { delayChildren: 0.3, staggerChildren: 0.15 } },
};
const revealLine: Variants = {
  hidden: { y: '110%' },
  visible: { y: 0, transition: { duration: 1, ease } },
};
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, delay: i * 0.14, ease },
  }),
};

export function AgmHero() {
  return (
    <section
      data-nav-dark
      className="relative isolate flex min-h-[92svh] w-full items-center overflow-hidden bg-black pb-20 pt-32 text-white md:pt-40"
    >
      <BackdropImage />
      <AmbientGlow />
      <FloatingBadges />

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
          AGM · {AGM_META.edition}
        </motion.p>

        <motion.h1
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={revealParent}
          className="mt-8 font-heading font-thin leading-[1.02] text-white"
          style={{ fontSize: 'clamp(2.5rem, 6.5vw, 6.5rem)', letterSpacing: '-0.025em' }}
        >
          <span className="block overflow-hidden pb-1 md:pb-2">
            <motion.span variants={revealLine} className="block">
              The Yaoundé
            </motion.span>
          </span>
          <span className="block overflow-hidden pb-1 md:pb-2">
            <motion.span variants={revealLine} className="block italic text-primary">
              Assembly.
            </motion.span>
          </span>
        </motion.h1>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={fadeUp}
          custom={7}
          className="mt-8 max-w-2xl text-[16px] leading-[1.8] text-white/75 md:text-lg"
        >
          {AGM_META.tagline}
        </motion.p>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={fadeUp}
          custom={8}
          className="mt-10 grid grid-cols-2 gap-8 sm:flex sm:items-baseline sm:gap-12"
        >
          <div className="text-left">
            <p className="font-heading text-[10px] font-medium uppercase tracking-[0.28em] text-white/50">
              When
            </p>
            <p className="mt-1 font-heading text-sm font-light text-white md:text-base">
              {AGM_META.dates}
            </p>
          </div>
          <div className="text-left">
            <p className="font-heading text-[10px] font-medium uppercase tracking-[0.28em] text-white/50">
              Where
            </p>
            <p className="mt-1 font-heading text-sm font-light text-white md:text-base">
              {AGM_META.venue}
            </p>
          </div>
          <div className="text-left">
            <p className="font-heading text-[10px] font-medium uppercase tracking-[0.28em] text-white/50">
              Status
            </p>
            <p className="mt-1 font-heading text-sm font-light text-primary md:text-base">
              {AGM_META.registrationOpens}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={fadeUp}
          custom={9}
          className="mt-12 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            href="#register"
            className="group inline-flex items-center gap-3 rounded-xs bg-primary px-8 py-4 text-sm font-medium tracking-wide text-white transition-all duration-500 hover:-translate-y-0.5 hover:bg-white hover:text-primary"
          >
            Register &amp; get your ticket
            <span
              aria-hidden
              className="grid h-6 w-6 place-items-center rounded-xs bg-white/15 transition-transform group-hover:translate-x-1 group-hover:bg-primary/10"
            >
              →
            </span>
          </Link>
          <Link
            href="#programme"
            className="inline-flex items-center gap-2 rounded-xs border border-white/20 bg-white/5 px-6 py-4 text-sm font-medium tracking-wide text-white transition-colors hover:border-white/60"
          >
            See the programme
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

function BackdropImage() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-20 overflow-hidden">
      <Image
        src="/hero_three.jpg"
        alt=""
        fill
        priority
        quality={45}
        sizes="100vw"
        className="object-cover opacity-40"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.92) 100%)',
        }}
      />
    </div>
  );
}

function AmbientGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10"
      style={{
        background:
          'radial-gradient(50% 60% at 50% 35%, color-mix(in srgb, var(--color-primary) 26%, transparent) 0%, transparent 65%), radial-gradient(30% 45% at 12% 90%, color-mix(in srgb, var(--color-primary) 18%, transparent) 0%, transparent 60%), radial-gradient(30% 45% at 88% 90%, color-mix(in srgb, var(--color-primary) 16%, transparent) 0%, transparent 60%)',
      }}
    />
  );
}

/**
 * Two very subtle floating badges above the crest and below the CTA.
 * They orbit slowly on Y with a long duration so the page feels
 * "alive" without stealing focus.
 */
function FloatingBadges() {
  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute left-6 top-[40%] hidden md:block"
        animate={{ y: [-10, 10, -10] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span
          className="block h-24 w-24 rounded-full border border-primary/40"
          style={{
            boxShadow: '0 0 40px -8px color-mix(in srgb, var(--color-primary) 60%, transparent)',
          }}
        />
      </motion.div>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute right-8 top-[55%] hidden md:block"
        animate={{ y: [10, -10, 10] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="block h-32 w-32 rounded-full border border-white/15" />
      </motion.div>
    </>
  );
}
