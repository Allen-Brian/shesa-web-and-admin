'use client';

import { motion, type Variants } from 'framer-motion';

import { STRATEGIC_PLAN_META } from './strategic-plan-content';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.85, delay: i * 0.1, ease },
  }),
};

export function StrategicPlanHero() {
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
            Strategic Plan · {STRATEGIC_PLAN_META.period}
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
          {STRATEGIC_PLAN_META.headline}
        </motion.h1>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          custom={2}
          className="mt-8 max-w-2xl text-[16px] leading-[1.75] text-white/75 md:text-[17px]"
        >
          {STRATEGIC_PLAN_META.subhead}
        </motion.p>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          custom={3}
          className="mt-6 max-w-3xl text-[14.5px] leading-[1.8] text-white/55"
        >
          {STRATEGIC_PLAN_META.intro}
        </motion.p>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          custom={4}
          className="mt-14 grid gap-6 border-t border-white/10 pt-10 md:grid-cols-3 md:gap-10"
        >
          <MetaItem label="Period" value={STRATEGIC_PLAN_META.period} />
          <MetaItem label="Edition" value={STRATEGIC_PLAN_META.edition} />
          <MetaItem label="Pillars" value="Four strategic priorities" />
        </motion.div>
      </div>
    </section>
  );
}

function MetaItem({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <p
        className="font-heading text-[10px] font-medium uppercase text-primary"
        style={{ letterSpacing: '0.36em' }}
      >
        {label}
      </p>
      <p className="mt-3 font-heading text-xl font-light text-white md:text-2xl">{value}</p>
    </div>
  );
}
