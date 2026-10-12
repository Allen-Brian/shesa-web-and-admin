'use client';

import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useState } from 'react';

import { PartnerLogo } from './partner-logo';
import { partners } from './partners-data';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

/** Milliseconds each partner holds the billboard. */
const DWELL = 5000;

/**
 * VARIANT D — Solo billboard.
 *
 * No marquee. One partner at a time owns a full-width panel, rotating
 * on a timer with the brand's own colour flooding the section, and the
 * rest wait in a chip rail underneath. The trade is coverage for
 * attention: fewer logos on screen, but the one that is up is
 * unmissable and legible on a phone — the strongest thing to sell to a
 * headline sponsor.
 */
export function PartnersBillboard() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const partner = partners[index] ?? partners[0];

  const go = useCallback((next: number) => {
    setIndex(((next % partners.length) + partners.length) % partners.length);
  }, []);

  useEffect(() => {
    if (paused || reduce) return;
    const id = setTimeout(() => go(index + 1), DWELL);
    return () => clearTimeout(id);
  }, [index, paused, reduce, go]);

  if (!partner) return null;

  return (
    <section
      data-nav-dark
      className="relative isolate overflow-hidden bg-[#08080c] py-16 text-white md:py-20"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
    >
      {/* The live partner's colour washes the whole section. */}
      <AnimatePresence mode="sync">
        <motion.div
          key={partner.name}
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease }}
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(70% 70% at 22% 30%, ${partner.bg}55 0%, transparent 65%), radial-gradient(60% 60% at 90% 90%, ${partner.bg}33 0%, transparent 60%)`,
          }}
        />
      </AnimatePresence>

      <div className="relative mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, ease }}
          className="flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <p
              className="font-heading text-[11px] font-medium uppercase text-primary"
              style={{ letterSpacing: '0.45em' }}
            >
              Our partners
            </p>
            <h2
              className="mt-3 font-heading font-thin leading-[1.1] text-white"
              style={{ fontSize: 'clamp(1.6rem, 3vw, 2.6rem)', letterSpacing: '-0.02em' }}
            >
              One brand at a time. Nothing to scroll past.
            </h2>
          </div>
          <span className="font-heading text-[11px] uppercase tracking-[0.3em] text-white/40">
            {String(index + 1).padStart(2, '0')} / {String(partners.length).padStart(2, '0')}
          </span>
        </motion.div>

        {/* The board. */}
        <div className="relative mt-8 overflow-hidden rounded-xs border border-white/10 md:mt-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={partner.name}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.6, ease }}
              className="grid md:grid-cols-12"
            >
              {/* Brand plate. */}
              <div
                className="relative flex items-center justify-center overflow-hidden px-8 py-10 md:col-span-5 md:py-16"
                style={{ backgroundColor: partner.bg, color: partner.fg }}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-25"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(90deg, rgba(0,0,0,0.28) 0 1px, transparent 1px 4px), repeating-linear-gradient(0deg, rgba(0,0,0,0.2) 0 1px, transparent 1px 4px)',
                  }}
                />
                {/* No plate: the board itself is the partner's ground,
                    so the mark sits straight on it. */}
                <PartnerLogo
                  partner={partner}
                  plate={false}
                  className="h-24 w-52 md:h-28 md:w-64"
                  textClassName="text-[24px] md:text-[30px]"
                />
              </div>

              {/* Their message. */}
              <div className="flex flex-col justify-center gap-4 bg-white/4 px-6 py-9 backdrop-blur-md md:col-span-7 md:gap-5 md:px-12 md:py-16">
                <span
                  className="font-heading text-[10px] font-semibold uppercase text-primary md:text-[11px]"
                  style={{ letterSpacing: '0.3em' }}
                >
                  {partner.tag}
                </span>
                <p
                  className="font-heading font-thin leading-[1.2] text-white"
                  style={{ fontSize: 'clamp(1.4rem, 2.6vw, 2.3rem)', letterSpacing: '-0.01em' }}
                >
                  {partner.message}
                </p>
                <Link
                  href={partner.href ?? '/agm-2026/sponsor'}
                  className="group mt-1 inline-flex w-fit items-center gap-3 text-sm font-medium text-white"
                >
                  <span className="underline-offset-4 group-hover:underline">
                    More from {partner.name}
                  </span>
                  <span
                    aria-hidden
                    className="grid h-7 w-7 place-items-center rounded-xs border border-white/30 transition-transform duration-500 group-hover:translate-x-1 group-hover:border-primary group-hover:text-primary"
                  >
                    →
                  </span>
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Dwell progress — restarts with each partner. */}
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-white/10">
            {!reduce && !paused ? (
              <span
                key={partner.name}
                className="block h-full bg-primary"
                style={{ animation: `carousel-progress ${DWELL}ms linear forwards` }}
              />
            ) : null}
          </span>
        </div>

        {/* The queue. Every partner stays visible even when not live. */}
        <div className="mt-5 flex flex-wrap gap-2 md:mt-6 md:gap-2.5">
          {partners.map((p, i) => (
            <button
              key={p.name}
              type="button"
              onClick={() => go(i)}
              aria-current={i === index}
              className={`group relative flex items-center gap-2 rounded-xs border px-3 py-2 transition-all duration-400 ${
                i === index
                  ? 'border-white/50 bg-white/12'
                  : 'border-white/10 bg-white/4 hover:border-white/30 hover:bg-white/8'
              }`}
            >
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-full transition-transform duration-400 group-hover:scale-125"
                style={{ backgroundColor: p.bg }}
              />
              <span
                className={`font-heading text-[11px] font-medium uppercase tracking-wide transition-colors duration-400 md:text-[12px] ${
                  i === index ? 'text-white' : 'text-white/55 group-hover:text-white/85'
                }`}
              >
                {p.name}
              </span>
            </button>
          ))}

          <Link
            href="/agm-2026/sponsor"
            className="flex items-center gap-2 rounded-xs border border-dashed border-primary/60 px-3 py-2 font-heading text-[11px] font-medium uppercase tracking-wide text-primary transition-colors duration-400 hover:bg-primary hover:text-primary-foreground md:text-[12px]"
          >
            + Your brand
          </Link>
        </div>
      </div>
    </section>
  );
}
