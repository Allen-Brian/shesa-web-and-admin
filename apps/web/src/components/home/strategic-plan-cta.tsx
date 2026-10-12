'use client';

import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';

import { GOALS } from '@/components/strategic-plan/strategic-plan-content';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.85, delay: i * 0.1, ease },
  }),
};

/**
 * The four goals, straight from the plan's own data, so the home page
 * can never drift from `/strategic-plan`. Each card deep-links to that
 * goal's block on the full document.
 */
const goalHref = (index: number) => `/strategic-plan#goal-${index}`;

/**
 * Home-page hook to the SHESA Strategic Plan 2026–2030. Slots between
 * the President's Word (leadership voice) and the AGM CTA (immediate
 * event), reading as "here's the direction we've adopted." The full
 * document lives at /strategic-plan; the page is intentionally
 * off-nav, this and the About-page block are the two anchor points.
 */
export function StrategicPlanCta() {
  return (
    <section className="relative overflow-hidden py-16 text-black md:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 3%, white) 0%, color-mix(in srgb, var(--color-primary) 6%, white) 100%)',
        }}
      />

      <div className="relative mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <div className="grid gap-14 md:grid-cols-12 md:items-center md:gap-12">
          <div className="md:col-span-6">
            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.6 }}
              variants={fadeUp}
              className="font-heading text-sm font-medium uppercase tracking-[0.28em] text-primary"
            >
              Strategic Plan · 2026 – 2030
            </motion.p>
            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              custom={1}
              className="mt-6 font-heading font-thin leading-[1.05] text-black"
              style={{ fontSize: 'clamp(1.85rem, 4vw, 3.5rem)', letterSpacing: '-0.02em' }}
            >
              The direction we&rsquo;ve set for the{' '}
              <span className="italic text-primary">next five years.</span>
            </motion.h2>
            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              custom={2}
              className="mt-6 max-w-lg text-[15px] leading-[1.8] text-black/65"
            >
              A five-year pathway to institutional unity, member value, financial resilience, and
              societal impact, set out in four goals, delivered in three phases.
            </motion.p>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              custom={3}
              className="mt-10"
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

          <motion.ul
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.35 }}
            variants={fadeUp}
            custom={4}
            className="grid grid-cols-2 gap-4 md:col-span-6 md:gap-5"
          >
            {GOALS.map((g, i) => (
              <motion.li
                key={g.index}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.75, delay: 0.1 + i * 0.08, ease }}
              >
                <Link
                  href={goalHref(g.index)}
                  className="group relative flex h-full flex-col overflow-hidden rounded-xs border border-black/10 bg-white p-5 transition-all duration-500 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_18px_40px_-18px_rgba(139,21,51,0.25)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary md:p-6"
                >
                  <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-primary/80" />
                  <p
                    className="font-heading text-2xl font-thin text-primary md:text-3xl"
                    style={{ letterSpacing: '-0.02em' }}
                  >
                    {String(g.index).padStart(2, '0')}
                  </p>
                  <p
                    className="mt-3 font-heading text-[15px] font-medium text-black"
                    style={{ letterSpacing: '-0.005em' }}
                  >
                    {g.title}
                  </p>
                  <p className="mt-1.5 text-[12.5px] leading-[1.6] text-black/60">{g.subtitle}</p>

                  <span className="mt-4 inline-flex items-center gap-2 text-[12px] font-medium text-primary">
                    <span className="underline-offset-4 group-hover:underline">See the goal</span>
                    <span
                      aria-hidden
                      className="transition-transform duration-500 group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </span>
                </Link>
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </div>
    </section>
  );
}
