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

/**
 * Bridge on the AGM 2026 landing that separates the alumni funding
 * path (individual gifts) from the organisation partnership path
 * (institutional / diplomatic / corporate / media). Directs
 * organisations off to /agm-2026/sponsor without cluttering the
 * alumni-facing sections above it.
 */
export function SponsorBridge() {
  return (
    <section
      className="relative overflow-hidden border-t border-black/10 bg-black py-20 text-white md:py-24"
      data-nav-dark
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(55% 65% at 50% 40%, color-mix(in srgb, var(--color-primary) 18%, transparent) 0%, transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-5xl px-5 md:px-8">
        <div className="grid gap-8 md:grid-cols-12 md:items-center md:gap-10">
          <div className="md:col-span-8">
            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.6 }}
              variants={fadeUp}
              className="font-heading text-[11px] font-medium uppercase text-white/70"
              style={{ letterSpacing: '0.5em' }}
            >
              For organisations
            </motion.p>
            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              custom={1}
              className="mt-6 font-heading font-thin leading-[1.1] text-white"
              style={{ fontSize: 'clamp(1.6rem, 3.2vw, 2.5rem)', letterSpacing: '-0.02em' }}
            >
              Ministries, missions, and brands partner{' '}
              <span className="italic text-primary">this way.</span>
            </motion.h2>
            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              custom={2}
              className="mt-5 max-w-2xl text-[14.5px] leading-[1.8] text-white/70"
            >
              Government offices, embassies, corporate partners, and media houses have their own
              engagement paths, protocol invitations, bilateral MoUs, commercial tiers, or
              accreditation exchange. See the full route.
            </motion.p>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={3}
            className="md:col-span-4 md:justify-self-end"
          >
            <Link
              href="/agm-2026/sponsor"
              className="group inline-flex items-center gap-3 rounded-xs bg-primary px-8 py-4 text-sm font-medium tracking-wide text-primary-foreground shadow-[0_20px_60px_-15px_rgba(139,21,51,0.6)] transition-transform duration-500 hover:-translate-y-0.5 md:text-base"
            >
              <span>Partnership options</span>
              <span
                aria-hidden
                className="grid h-7 w-7 place-items-center rounded-xs bg-white/20 transition-transform duration-500 group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
