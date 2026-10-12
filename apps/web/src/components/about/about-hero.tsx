'use client';

import Image from 'next/image';
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

export function AboutHero() {
  return (
    <section
      data-nav-dark
      className="relative isolate flex min-h-[80svh] w-full items-center overflow-hidden bg-black pb-16 pt-32 text-white md:pt-40"
    >
      <BackdropImage />
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
          About SHESA
        </motion.p>

        <motion.h1
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={revealParent}
          className="mt-8 font-heading font-thin leading-[1.05] text-white"
          style={{
            fontSize: 'clamp(2.25rem, 5.6vw, 5.25rem)',
            letterSpacing: '-0.02em',
          }}
        >
          <span className="block overflow-hidden pb-1 md:pb-2">
            <motion.span variants={revealLine} className="block">
              The story of a school.
            </motion.span>
          </span>
          <span className="block overflow-hidden pb-1 md:pb-2">
            <motion.span variants={revealLine} className="block italic text-primary">
              And its brotherhood.
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
          From a hillside in Mankon in 1962, Sacred Heart College has forged a brotherhood that
          outlasts every graduation. This is who we are, where we came from, and where we're heading
          , together.
        </motion.p>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={fadeUp}
          custom={9}
          className="mt-10 font-script text-primary"
          style={{
            fontSize: 'clamp(1.5rem, 2.4vw, 2.25rem)',
            lineHeight: 1,
            textShadow: '0 4px 30px rgba(139,21,51,0.5)',
          }}
        >
          Viriliter age.
        </motion.p>
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
        className="object-cover opacity-25"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0.9) 100%)',
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
          'radial-gradient(45% 55% at 50% 40%, color-mix(in srgb, var(--color-primary) 20%, transparent) 0%, transparent 65%), radial-gradient(30% 45% at 12% 90%, color-mix(in srgb, var(--color-primary) 14%, transparent) 0%, transparent 60%), radial-gradient(30% 45% at 88% 90%, color-mix(in srgb, var(--color-primary) 12%, transparent) 0%, transparent 60%)',
      }}
    />
  );
}
