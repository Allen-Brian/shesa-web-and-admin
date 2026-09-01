'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

import { MarqueeCarousel } from './marquee-carousel';
import { PartnerLogo } from './partner-logo';
import { partners, type Partner } from './partners-data';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

/**
 * Partners board — a stadium perimeter rail that runs under the
 * Mission section. Each panel is a partner's own advertising board:
 * brand colour, logo, and a message of their own, not just a logo.
 *
 * Motion, hover-pause, and the reduced-motion opt-out all come from
 * MarqueeCarousel + globals.css. Partners are a local list because
 * there is no partners table yet — when one lands, load them server
 * side and pass them in the way Events / Projects do.
 */
export function PartnersStrip() {
  return (
    <section
      data-nav-dark
      className="relative isolate overflow-hidden bg-[#07070b] py-14 text-white md:py-16"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(75% 60% at 50% 120%, color-mix(in srgb, var(--color-primary) 30%, transparent) 0%, transparent 70%)',
        }}
      />

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
              The brands standing with SHESA.
            </h2>
          </div>

          <Link
            href="/agm-2026/sponsor"
            className="group inline-flex items-center gap-2 rounded-xs border border-white/20 px-5 py-3 text-[13px] font-medium tracking-wide text-white transition-colors duration-500 hover:border-primary hover:bg-primary hover:text-primary-foreground"
          >
            Put your brand on this board
            <span
              aria-hidden
              className="transition-transform duration-500 group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.9, delay: 0.15, ease }}
        className="relative mt-9 md:mt-12"
      >
        <MarqueeCarousel
          items={partners}
          duration={40}
          ariaLabel="Our partners"
          renderItem={(partner) => <PartnerBoard partner={partner} />}
        />

        {/* Spill of colour onto the "pitch" below the rail. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -bottom-10 h-10 opacity-40 blur-2xl"
          style={{
            background:
              'linear-gradient(90deg, #FFCC00, #FF7900, #D2232A, #00478F, #00A651, #00AEEF)',
          }}
        />
      </motion.div>
    </section>
  );
}

function PartnerBoard({ partner }: { readonly partner: Partner }) {
  return (
    <Link
      href={partner.href ?? '/agm-2026/sponsor'}
      className="group relative flex h-24 w-75 items-center gap-4 overflow-hidden px-5 transition-transform duration-500 hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white md:h-28 md:w-105 md:gap-5 md:px-6"
      style={{ backgroundColor: partner.bg, color: partner.fg }}
    >
      {/* LED pixel grid — the texture that reads as a screen, not a poster. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, rgba(0,0,0,0.30) 0 1px, transparent 1px 3px), repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0 1px, transparent 1px 3px)',
        }}
      />
      {/* Gloss sweep on hover. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/4 w-1/4 -skew-x-12 bg-white/30 blur-md transition-transform duration-1000 group-hover:translate-x-[520%]"
      />

      <PartnerLogo partner={partner} />

      <span className="relative flex min-w-0 flex-col gap-1">
        <span
          className="text-[9px] font-semibold uppercase opacity-75 md:text-[10px]"
          style={{ letterSpacing: '0.28em' }}
        >
          {partner.tag}
        </span>
        <span className="text-[13px] font-medium leading-snug md:text-[15px]">
          {partner.message}
        </span>
      </span>
    </Link>
  );
}
