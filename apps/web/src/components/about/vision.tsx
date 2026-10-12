'use client';

import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';

import { association } from '@/lib/site-config';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.85, delay: i * 0.1, ease },
  }),
};

export function Vision() {
  return (
    <section
      data-nav-dark
      className="relative isolate overflow-hidden bg-black py-24 text-white md:py-32"
    >
      <AmbientGlow />
      <GrainOverlay />

      <div className="relative mx-auto max-w-3xl px-6">
        <div className="flex flex-col items-center text-center">
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
            Vision &amp; Mission
          </motion.p>

          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={2}
            className="mt-8 font-heading font-thin leading-[1.05] text-white"
            style={{
              fontSize: 'clamp(2rem, 5vw, 4.5rem)',
              letterSpacing: '-0.02em',
            }}
          >
            The Shesa we're <span className="italic text-primary">building.</span>
          </motion.h2>

          {/* The Association's adopted statements, from site-config. The
              paragraph that stood here was written for the site — a good
              line about labs, books, and bursaries — but it was not what
              SHESA had actually resolved to do. */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={3}
            className="mt-10 grid gap-8 text-left md:mt-12 md:grid-cols-2 md:gap-10"
          >
            {[
              { label: 'Vision', body: association.vision },
              { label: 'Mission', body: association.mission },
            ].map((s) => (
              <div key={s.label} className="relative pl-5">
                <span aria-hidden className="absolute inset-y-1 left-0 w-px bg-primary/60" />
                <p
                  className="font-heading text-[10px] font-semibold uppercase text-primary md:text-[11px]"
                  style={{ letterSpacing: '0.32em' }}
                >
                  {s.label}
                </p>
                <p className="mt-3 text-[15px] leading-[1.8] text-white/75 md:text-[15.5px]">
                  {s.body}
                </p>
              </div>
            ))}
          </motion.div>

          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={fadeUp}
            custom={5}
            className="mt-10 font-script text-primary"
            style={{
              fontSize: 'clamp(1.5rem, 2.4vw, 2.25rem)',
              lineHeight: 1,
              textShadow: '0 4px 30px rgba(139,21,51,0.55)',
            }}
          >
            One SHESA. One Dream.
          </motion.p>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={fadeUp}
            custom={6}
            className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:gap-5"
          >
            <PrimaryCta />
            <SecondaryCta />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function PrimaryCta() {
  return (
    <Link
      href="/agm-2026"
      className="group relative inline-flex items-center gap-3 overflow-hidden rounded-xs bg-primary px-9 py-4 text-sm font-medium tracking-wide text-primary-foreground shadow-[0_20px_60px_-15px_rgba(139,21,51,0.7)] transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_25px_75px_-15px_rgba(139,21,51,0.95)] md:px-11 md:py-5 md:text-base"
    >
      <span
        aria-hidden
        className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/35 to-transparent transition-transform duration-1000 group-hover:translate-x-full"
      />
      <span className="relative">Support The Movement</span>
      <span
        aria-hidden
        className="relative grid h-7 w-7 place-items-center rounded-xs bg-white/20 transition-transform duration-500 group-hover:translate-x-1"
      >
        →
      </span>
    </Link>
  );
}

function SecondaryCta() {
  return (
    <Link
      href="/contact"
      className="group relative inline-flex items-center gap-3 overflow-hidden rounded-xs border border-white/25 bg-white/3 px-9 py-4 text-sm font-medium tracking-wide text-white backdrop-blur-sm transition-all duration-500 hover:-translate-y-0.5 hover:border-white hover:bg-white hover:text-black md:px-11 md:py-5 md:text-base"
    >
      <span className="relative">Get involved</span>
    </Link>
  );
}

function AmbientGlow() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10"
      style={{
        background:
          'radial-gradient(45% 55% at 50% 40%, color-mix(in srgb, var(--color-primary) 20%, transparent) 0%, transparent 65%), radial-gradient(30% 45% at 12% 100%, color-mix(in srgb, var(--color-primary) 14%, transparent) 0%, transparent 60%), radial-gradient(30% 45% at 88% 100%, color-mix(in srgb, var(--color-primary) 12%, transparent) 0%, transparent 60%)',
      }}
    />
  );
}

function GrainOverlay() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 opacity-[0.22] mix-blend-overlay"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.3 0'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>\")",
        backgroundSize: '200px 200px',
      }}
    />
  );
}
