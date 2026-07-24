'use client';

import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.85, delay: i * 0.1, ease },
  }),
};

const phases = [
  { key: 'I', title: 'Foundation', years: '2026 – 2027' },
  { key: 'II', title: 'Expansion', years: '2027 – 2028' },
  { key: 'III', title: 'Consolidation', years: '2029 – 2030' },
] as const;

/**
 * About-page bridge between the Vision block (dark, aspirational) and
 * the site footer. Reads as "here is the concrete pathway", the plan
 * we've adopted to move from vision to measurable contribution.
 */
export function StrategicPlanCta() {
  return (
    <section className="relative overflow-hidden py-24 text-black md:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 4%, white) 0%, color-mix(in srgb, var(--color-primary) 7%, white) 100%)',
        }}
      />

      <div className="relative mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl text-center">
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.6 }}
            variants={fadeUp}
            className="font-heading text-[11px] font-medium uppercase tracking-[0.4em] text-primary md:text-xs"
          >
            How we get there
          </motion.p>

          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={1}
            className="mt-6 font-heading font-thin leading-[1.05] text-black"
            style={{ fontSize: 'clamp(1.85rem, 4vw, 3.25rem)', letterSpacing: '-0.02em' }}
          >
            Vision needs a plan. Ours runs{' '}
            <span className="italic text-primary">2026 to 2030.</span>
          </motion.h2>

          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={2}
            className="mx-auto mt-6 max-w-2xl text-[15px] leading-[1.8] text-black/65"
          >
            Four pillars, three phases, one direction. The SHESA Strategic Plan turns the Vision on
            the previous page into a concrete pathway, with owners, timelines, and measurable
            outcomes.
          </motion.p>
        </div>

        <motion.ul
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.35 }}
          variants={fadeUp}
          custom={3}
          className="mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3 md:gap-5"
        >
          {phases.map((p, i) => (
            <motion.li
              key={p.key}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.75, delay: 0.1 + i * 0.08, ease }}
              className="relative overflow-hidden rounded-xs border border-black/10 bg-white p-6 text-left"
            >
              <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-primary/80" />
              <p
                className="font-heading text-2xl font-thin text-primary md:text-[1.75rem]"
                style={{ letterSpacing: '-0.02em' }}
              >
                Phase {p.key}
              </p>
              <p
                className="mt-2 font-heading text-[15px] font-medium text-black"
                style={{ letterSpacing: '-0.005em' }}
              >
                {p.title}
              </p>
              <p className="mt-1 text-[12.5px] font-medium tracking-[0.14em] text-black/50">
                {p.years}
              </p>
            </motion.li>
          ))}
        </motion.ul>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={fadeUp}
          custom={5}
          className="mt-14 flex justify-center"
        >
          <Link
            href="/strategic-plan"
            className="group inline-flex items-center gap-3 rounded-xs bg-primary px-8 py-4 text-sm font-medium tracking-wide text-primary-foreground shadow-[0_20px_60px_-15px_rgba(139,21,51,0.5)] transition-transform duration-500 hover:-translate-y-0.5 md:px-10 md:py-5"
          >
            <span>Read the Strategic Plan</span>
            <span
              aria-hidden
              className="grid h-7 w-7 place-items-center rounded-xs bg-white/20 transition-transform duration-500 group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
