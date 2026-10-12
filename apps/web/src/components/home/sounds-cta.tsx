'use client';

import Link from 'next/link';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { useMemo } from 'react';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.85, delay: i * 0.1, ease },
  }),
};

export function SoundsCta() {
  return (
    <section
      data-nav-dark
      className="relative isolate overflow-hidden bg-black py-24 text-white md:py-32"
    >
      <AmbientGlow />
      <FloatingNotes />
      <GrainOverlay />

      <div className="relative mx-auto max-w-4xl px-6">
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
            SHESA Sounds
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
            The songs we sang. <span className="italic text-primary">Still ring.</span>
          </motion.h2>

          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={fadeUp}
            custom={3}
            className="mt-6 max-w-2xl text-[15px] leading-[1.7] text-white/70 md:text-base"
          >
            Every alma mater has an anthem. We have a whole songbook, the hymns, the parade chants,
            the halftime choruses, the sundown melodies we still hum without thinking. Reconnect
            with the sound of home.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.9, delay: 0.5, ease }}
            className="mt-16 w-full max-w-3xl md:mt-20"
          >
            <SoundVisual />
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={fadeUp}
            custom={6}
            className="mt-14 flex flex-col items-center gap-4 sm:flex-row sm:gap-5"
          >
            <PrimaryCta />
            <SecondaryCta />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function SoundVisual() {
  const reduce = useReducedMotion();

  return (
    <div className="relative mx-auto flex h-56 w-full items-center justify-center md:h-72">
      {!reduce && (
        <>
          <PulseRing delay={0} />
          <PulseRing delay={0.9} />
          <PulseRing delay={1.8} />
        </>
      )}

      <EqualizerBars reduce={Boolean(reduce)} />

      <PlayCentre />
    </div>
  );
}

function PulseRing({ delay }: { readonly delay: number }) {
  return (
    <motion.span
      aria-hidden
      className="absolute h-24 w-24 rounded-full border md:h-32 md:w-32"
      style={{ borderColor: 'color-mix(in srgb, var(--color-primary) 55%, transparent)' }}
      animate={{ scale: [1, 3.5], opacity: [0.6, 0] }}
      transition={{
        duration: 2.7,
        delay,
        repeat: Infinity,
        ease: 'easeOut',
      }}
    />
  );
}

function EqualizerBars({ reduce }: { readonly reduce: boolean }) {
  const bars = useMemo(
    () =>
      Array.from({ length: 41 }).map((_, i) => {
        // Amplitude tapers toward the center to focus attention on the play button
        const distFromCenter = Math.abs(i - 20) / 20;
        const midH = 30 - distFromCenter * 12;
        const minH = 10 + distFromCenter * 4;
        const maxH = 60 - distFromCenter * 22;

        // Six-keyframe organic loop so each bar breathes instead of
        // pumping. Values are deterministic per bar (pseudo-random) so
        // the composition looks lively but stable.
        const wobble = (seed: number) => {
          const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
          return x - Math.floor(x);
        };
        const between = (lo: number, hi: number, seed: number) => lo + wobble(seed) * (hi - lo);

        return {
          id: i,
          delay: wobble(0) * 3,
          duration: 3.6 + wobble(1) * 1.8,
          keyframes: [
            between(minH, midH, 2),
            between(midH, maxH, 3),
            between(minH, midH, 4),
            between(midH, maxH, 5),
            between(minH, midH, 6),
            between(minH, midH, 7),
          ],
          steady: midH,
        };
      }),
    [],
  );

  return (
    <div className="absolute inset-0 flex items-center justify-center gap-1 md:gap-1.5">
      {bars.map((b, i) => {
        // Cut a gap in the middle for the play button
        const inGap = Math.abs(i - 20) < 4;
        if (inGap) return <span key={b.id} className="w-1 md:w-1.5" aria-hidden />;

        return (
          <motion.span
            key={b.id}
            aria-hidden
            className="w-1 rounded-t-xs rounded-b-xs md:w-1.5"
            style={{
              background:
                'linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 90%, white) 0%, var(--color-primary) 60%, color-mix(in srgb, var(--color-primary) 60%, black) 100%)',
              boxShadow: '0 0 8px color-mix(in srgb, var(--color-primary) 40%, transparent)',
              willChange: 'height',
            }}
            initial={{ height: `${b.steady}%` }}
            animate={
              reduce ? { height: `${b.steady}%` } : { height: b.keyframes.map((h) => `${h}%`) }
            }
            transition={{
              duration: b.duration,
              delay: b.delay,
              repeat: Infinity,
              repeatType: 'mirror',
              ease: 'easeInOut',
            }}
          />
        );
      })}
    </div>
  );
}

function PlayCentre() {
  return (
    <div className="relative z-10 flex flex-col items-center">
      <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary shadow-[0_20px_60px_-15px_rgba(139,21,51,0.85)] md:h-24 md:w-24">
        <span
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            background:
              'radial-gradient(closest-side, color-mix(in srgb, var(--color-primary) 40%, transparent), transparent 70%)',
            filter: 'blur(20px)',
            transform: 'scale(1.5)',
          }}
        />
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="relative h-8 w-8 translate-x-0.5 text-white md:h-9 md:w-9"
          aria-hidden
        >
          <path d="M8 5v14l11-7L8 5z" />
        </svg>
      </div>
      <span className="mt-4 font-heading text-[10px] font-medium uppercase tracking-[0.32em] text-white/60 md:text-xs">
        Now Playing · The Anthem
      </span>
    </div>
  );
}

function PrimaryCta() {
  return (
    <Link
      href="/songs"
      className="group relative inline-flex items-center gap-3 overflow-hidden rounded-xs bg-primary px-9 py-4 text-sm font-medium tracking-wide text-primary-foreground shadow-[0_20px_60px_-15px_rgba(139,21,51,0.7)] transition-all duration-500 hover:-translate-y-0.5 hover:shadow-[0_25px_75px_-15px_rgba(139,21,51,0.95)] md:px-11 md:py-5 md:text-base"
    >
      <span
        aria-hidden
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-1000 group-hover:translate-x-full"
      />
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="relative h-4 w-4"
        aria-hidden
      >
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
      <span className="relative">Enter the sound library</span>
    </Link>
  );
}

function SecondaryCta() {
  return (
    <Link
      href="/songs"
      className="group relative inline-flex items-center gap-3 overflow-hidden rounded-xs border border-white/25 bg-white/[0.03] px-9 py-4 text-sm font-medium tracking-wide text-white backdrop-blur-sm transition-all duration-500 hover:-translate-y-0.5 hover:border-white hover:bg-white hover:text-black md:px-11 md:py-5 md:text-base"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="relative h-4 w-4"
        aria-hidden
      >
        <path d="M5 3l14 9-14 9V3z" fill="currentColor" strokeWidth="0" />
      </svg>
      <span className="relative">Play the anthem</span>
    </Link>
  );
}

function AmbientGlow() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(50% 55% at 50% 40%, color-mix(in srgb, var(--color-primary) 18%, transparent) 0%, transparent 65%), radial-gradient(30% 45% at 10% 100%, color-mix(in srgb, var(--color-primary) 12%, transparent) 0%, transparent 60%), radial-gradient(30% 45% at 90% 100%, color-mix(in srgb, var(--color-primary) 10%, transparent) 0%, transparent 60%)',
        }}
      />
    </>
  );
}

function FloatingNotes() {
  const notes = useMemo(
    () =>
      Array.from({ length: 10 }).map((_, i) => ({
        id: i,
        left: `${(i * 91.7) % 100}%`,
        size: 12 + ((i * 5) % 10),
        duration: 14 + ((i * 4) % 10),
        delay: (i * 2.1) % 12,
        drift: (i % 2 === 0 ? 1 : -1) * (15 + ((i * 3) % 20)),
      })),
    [],
  );

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {notes.map((n) => (
        <motion.span
          key={n.id}
          className="absolute bottom-0 block text-primary/70"
          style={{
            left: n.left,
            fontSize: n.size,
            filter:
              'drop-shadow(0 0 8px color-mix(in srgb, var(--color-primary) 40%, transparent))',
          }}
          animate={{
            y: ['0%', '-120vh'],
            x: [0, n.drift, 0],
            opacity: [0, 0.9, 0],
            rotate: [0, 12, -6, 0],
          }}
          transition={{
            duration: n.duration,
            delay: n.delay,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        >
          ♪
        </motion.span>
      ))}
    </div>
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
