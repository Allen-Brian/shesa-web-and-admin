'use client';

import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { Building2, Handshake, Megaphone } from 'lucide-react';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.9, delay: i * 0.1, ease },
  }),
};

const pillars = [
  {
    icon: Handshake,
    title: 'Institutional partners',
    body: 'Government bodies and development agencies whose mandate overlaps ours.',
  },
  {
    icon: Building2,
    title: 'Corporate sponsors',
    body: 'Companies aligned with our alumni community and its reach.',
  },
  {
    icon: Megaphone,
    title: 'Media & platform allies',
    body: 'Newsrooms and platforms who amplify what we build together.',
  },
] as const;

/**
 * Partnership CTA. Companion to StrategicPlanCta + AgmCta, lives
 * between the AGM CTA and the Events strip. Off-ramp for
 * organisations who arrive on the home page and would rather see the
 * partnership pitch than the alumni ticket / donation flow.
 */
export function PartnershipCta() {
  return (
    <section
      data-nav-dark
      className="relative isolate overflow-hidden bg-black py-24 text-white md:py-28"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(60% 65% at 50% 35%, color-mix(in srgb, var(--color-primary) 20%, transparent) 0%, transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/60 to-transparent"
      />

      <div className="relative mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <div className="grid gap-14 md:grid-cols-12 md:items-center md:gap-12">
          <div className="md:col-span-6">
            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.5 }}
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
              className="mt-6 font-heading font-thin leading-[1.05] text-white"
              style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', letterSpacing: '-0.02em' }}
            >
              Partner with an alumni network built to{' '}
              <span className="italic text-primary">move things.</span>
            </motion.h2>
            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              custom={2}
              className="mt-6 max-w-lg text-[15px] leading-[1.8] text-white/70"
            >
              Five decades, eleven branches, chapters in Europe, North America, and across the
              continent. See where your organisation fits and request the partnership deck.
            </motion.p>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              custom={3}
              className="mt-10 flex flex-wrap items-center gap-4"
            >
              <Link
                href="/agm-2026/sponsor"
                className="group inline-flex items-center gap-3 rounded-xs bg-primary px-8 py-4 text-sm font-medium tracking-wide text-primary-foreground shadow-[0_20px_60px_-15px_rgba(139,21,51,0.5)] transition-transform duration-500 hover:-translate-y-0.5 md:px-10 md:py-5"
              >
                <span>See the partnership page</span>
                <span
                  aria-hidden
                  className="grid h-7 w-7 place-items-center rounded-xs bg-white/20 transition-transform duration-500 group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>
              <Link
                href="/contact"
                className="text-sm font-medium tracking-wide text-white/70 underline-offset-4 transition-colors duration-500 hover:text-white hover:underline"
              >
                Talk to us first
              </Link>
            </motion.div>
          </div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
            custom={4}
            className="grid gap-4 md:col-span-6 md:gap-5"
          >
            {pillars.map((p, i) => (
              <motion.article
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.75, delay: 0.15 + i * 0.08, ease }}
                className="relative overflow-hidden rounded-xs border border-white/10 bg-white/3 p-5 md:p-6"
              >
                <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-primary/70" />
                <div className="flex items-start gap-4">
                  <span
                    aria-hidden
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xs bg-primary/12 text-primary"
                  >
                    <p.icon className="h-5 w-5" />
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <h3
                      className="font-heading text-[16px] font-medium text-white"
                      style={{ letterSpacing: '-0.005em' }}
                    >
                      {p.title}
                    </h3>
                    <p className="text-[13px] leading-[1.65] text-white/65">{p.body}</p>
                  </div>
                </div>
              </motion.article>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
