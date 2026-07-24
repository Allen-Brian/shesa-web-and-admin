'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';

import { CrestBadge } from './crest-badge';
import { HeroBackdropImages } from './hero-backdrop-images';

const ease = [0.22, 1, 0.36, 1] as const;

export function Hero() {
  const reduce = useReducedMotion();
  const [beating, setBeating] = useState(false);

  const rise = (delay: number) => ({
    initial: { opacity: 0, y: reduce ? 0 : 32 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.9, delay, ease },
  });

  return (
    <section
      data-nav-dark
      onPointerEnter={() => setBeating(true)}
      onPointerLeave={() => setBeating(false)}
      className="relative isolate flex min-h-svh w-full items-end overflow-hidden bg-black pb-6 pt-24 text-white md:items-center md:pb-10 md:pt-32"
    >
      <HeroBackdropImages />
      <AmbientBackdrop />
      <BackdropWord />

      <div className="relative mx-auto flex w-full max-w-350 flex-1 flex-col px-5 md:px-8 lg:px-12">
        <div className="relative flex flex-1 flex-col items-center justify-center">
          <ScriptOverlay />

          <motion.div
            {...rise(0.05)}
            className="relative z-10 flex w-full max-w-180 items-center justify-center"
          >
            <CrestBadge
              beating={beating}
              className="aspect-square w-60 sm:w-80 md:w-100 lg:w-120 xl:w-135"
            />
          </motion.div>
        </div>

        <div className="relative z-20 mt-10 grid gap-4 md:mt-0 md:grid-cols-2 md:items-end md:gap-6">
          <motion.aside {...rise(0.55)} className="md:max-w-[320px]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white">
              Viriliter Age
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/70 md:text-[15px]">
              A living network of graduates, carrying the spirit forward, chapter after chapter,
              across every era.
            </p>
          </motion.aside>

          <motion.aside
            {...rise(0.7)}
            className="group relative overflow-hidden rounded-xs border border-white/15 bg-white/4 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-md transition-colors hover:border-primary md:ml-auto md:max-w-75"
          >
            <Link href="/agm-2026" className="block">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
                AGM 2026
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/75">
                Save the date. Our largest gathering yet, reunions, honours, and what comes next.
              </p>
              <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-white">
                See details
                <span
                  aria-hidden
                  className="grid h-6 w-6 place-items-center rounded-xs border border-white/30 transition-transform duration-300 group-hover:translate-x-1 group-hover:border-primary group-hover:text-primary"
                >
                  →
                </span>
              </span>
            </Link>
          </motion.aside>
        </div>
      </div>

      <ScrollHint />
    </section>
  );
}

function AmbientBackdrop() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 45% at 50% 35%, color-mix(in srgb, var(--color-primary) 22%, transparent) 0%, transparent 65%), radial-gradient(70% 55% at 15% 90%, color-mix(in srgb, var(--color-primary) 14%, transparent) 0%, transparent 60%), radial-gradient(60% 55% at 90% 100%, color-mix(in srgb, var(--color-primary) 10%, transparent) 0%, transparent 60%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.35 0'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>\")",
          backgroundSize: '200px 200px',
        }}
      />
    </>
  );
}

function BackdropWord() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-[18%] z-0 flex select-none items-center justify-between px-3 md:top-[22%] md:px-8 lg:px-14"
    >
      <motion.span
        initial={{ opacity: 0, x: -60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1.2, ease }}
        className="font-display leading-none text-white/10"
        style={{ fontSize: 'clamp(4rem, 18vw, 20rem)', letterSpacing: '-0.04em' }}
      >
        SHESA
      </motion.span>
      <motion.span
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1.2, ease }}
        className="font-display leading-none text-white/10"
        style={{ fontSize: 'clamp(4rem, 18vw, 20rem)', letterSpacing: '-0.04em' }}
      >
        ALUMNI
      </motion.span>
    </div>
  );
}

function ScriptOverlay() {
  return (
    <>
      <motion.span
        aria-hidden
        initial={{ opacity: 0, y: 20, rotate: -6 }}
        animate={{ opacity: 1, y: 0, rotate: -6 }}
        transition={{ duration: 1, delay: 0.35, ease }}
        className="pointer-events-none absolute left-[2%] top-[34%] z-20 font-script text-primary md:left-[6%] md:top-[36%]"
        style={{
          fontSize: 'clamp(2.5rem, 8vw, 7rem)',
          lineHeight: 1,
          textShadow: '0 4px 30px rgba(139,21,51,0.55)',
        }}
      >
        United
      </motion.span>
      <motion.span
        aria-hidden
        initial={{ opacity: 0, y: 20, rotate: 4 }}
        animate={{ opacity: 1, y: 0, rotate: 4 }}
        transition={{ duration: 1, delay: 0.5, ease }}
        className="pointer-events-none absolute right-[2%] top-[34%] z-20 font-script text-primary md:right-[6%] md:top-[36%]"
        style={{
          fontSize: 'clamp(2.5rem, 8vw, 7rem)',
          lineHeight: 1,
          textShadow: '0 4px 30px rgba(139,21,51,0.55)',
        }}
      >
        Always
      </motion.span>
      <motion.span
        aria-hidden
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.85, ease }}
        className="pointer-events-none absolute inset-x-0 top-full z-20 text-center font-script text-white"
        style={{ fontSize: 'clamp(1.25rem, 2.6vw, 2.25rem)', lineHeight: 1 }}
      >
        One family. Every era.
      </motion.span>
    </>
  );
}

function ScrollHint() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 1.4, duration: 0.6 }}
      className="pointer-events-none absolute inset-x-0 bottom-3 z-30 hidden justify-center md:flex"
      aria-hidden
    >
      <div className="flex flex-col items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-white/50">
        Scroll
        <span className="relative block h-8 w-px overflow-hidden bg-white/15">
          <motion.span
            className="absolute inset-x-0 top-0 h-3 bg-primary"
            animate={{ y: ['-100%', '260%'] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </span>
      </div>
    </motion.div>
  );
}
