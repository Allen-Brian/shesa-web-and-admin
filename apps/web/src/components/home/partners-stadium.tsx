'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

import { MarqueeCarousel } from './marquee-carousel';
import { PartnerLogo } from './partner-logo';
import { partners, type Partner } from './partners-data';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

/**
 * Second rail runs a different order so the two never mirror. Rotated
 * by half the list rather than a fixed four, which with the current
 * four partners would have rotated by the whole list and produced two
 * identical rails.
 */
const offset = Math.floor(partners.length / 2);
const secondRail = [...partners.slice(offset), ...partners.slice(0, offset)];

/**
 * VARIANT B — Stadium bowl.
 *
 * Two rails running against each other under floodlight, tilted in
 * perspective so the boards read as a curved perimeter seen from the
 * stands. The loudest of the four: maximum brand surface, maximum
 * movement, the closest thing to a real matchday board.
 */
export function PartnersStadium() {
  return (
    <section
      data-nav-dark
      className="relative isolate overflow-hidden bg-[#0a0600] py-16 text-white md:py-20"
    >
      {/* Floodlights. */}
      <div aria-hidden className="pointer-events-none absolute inset-0" />

      <div className="relative mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, ease }}
          className="text-center"
        >
          <p
            className="font-heading text-[11px] font-medium uppercase text-primary"
            style={{ letterSpacing: '0.45em' }}
          >
            Our partners
          </p>
          <h2
            className="mx-auto mt-4 max-w-3xl font-heading font-thin leading-[1.08] text-white"
            style={{ fontSize: 'clamp(1.9rem, 4vw, 3.4rem)', letterSpacing: '-0.02em' }}
          >
            Every visit to this page is a pair of eyes on{' '}
            <span className="italic text-primary">your board.</span>
          </h2>
        </motion.div>
      </div>

      {/* The bowl. Perspective is applied to the wrapper so both rails
       * share one vanishing point and tilt as a single surface. */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 1, delay: 0.15, ease }}
        className="relative mt-12 md:mt-16"
        style={{ perspective: '1400px' }}
      >
        <div
          className="flex flex-col gap-4 md:gap-5"
          style={{ transform: 'rotateX(11deg)', transformStyle: 'preserve-3d' }}
        >
          <MarqueeCarousel
            items={partners}
            duration={38}
            ariaLabel="Our partners"
            trackClassName="gap-4 md:gap-5"
            renderItem={(partner) => <StadiumBoard partner={partner} />}
          />
          <MarqueeCarousel
            items={secondRail}
            duration={46}
            reverse
            ariaLabel="More partners"
            trackClassName="gap-4 md:gap-5"
            renderItem={(partner) => <StadiumBoard partner={partner} dim />}
          />
        </div>

        {/* Pitch light bouncing back up off the boards. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -bottom-14 h-24 opacity-30 blur-3xl"
          style={{
            background:
              'linear-gradient(90deg, #FFCC00, #FF7900, #D2232A, #00478F, #00A651, #00AEEF)',
          }}
        />
      </motion.div>

      <div className="relative mx-auto mt-14 max-w-350 px-5 text-center md:mt-16 md:px-8">
        <Link
          href="/agm-2026/sponsor"
          className="group inline-flex items-center gap-3 rounded-xs bg-primary px-8 py-4 text-sm font-medium tracking-wide text-primary-foreground shadow-[0_20px_60px_-15px_rgba(139,21,51,0.6)] transition-transform duration-500 hover:-translate-y-0.5 md:px-10 md:py-5"
        >
          Book a board for your brand
          <span
            aria-hidden
            className="grid h-7 w-7 place-items-center rounded-xs bg-white/20 transition-transform duration-500 group-hover:translate-x-1"
          >
            →
          </span>
        </Link>
      </div>
    </section>
  );
}

function StadiumBoard({
  partner,
  dim = false,
}: {
  readonly partner: Partner;
  readonly dim?: boolean;
}) {
  return (
    <Link
      href={partner.href ?? '/agm-2026/sponsor'}
      className={`group relative flex h-26 w-82.5 items-center gap-4 overflow-hidden rounded-[3px] px-5 shadow-[0_18px_40px_-20px_rgba(0,0,0,0.9)] transition-all duration-500 hover:-translate-y-1 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white md:h-30 md:w-115 md:gap-5 md:px-7 ${
        dim ? 'brightness-90' : ''
      }`}
      style={{ backgroundColor: partner.bg, color: partner.fg }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, rgba(0,0,0,0.32) 0 1px, transparent 1px 3px), repeating-linear-gradient(0deg, rgba(0,0,0,0.24) 0 1px, transparent 1px 3px)',
        }}
      />
      {/* Standing light across the top of the panel. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-linear-to-b from-white/25 to-transparent"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/4 w-1/4 -skew-x-12 bg-white/35 blur-md transition-transform duration-1000 group-hover:translate-x-[560%]"
      />

      <PartnerLogo partner={partner} className="h-15 w-26 md:h-18 md:w-32" />

      <span className="relative flex min-w-0 flex-col gap-1">
        <span
          className="text-[9px] font-semibold uppercase opacity-75 md:text-[10px]"
          style={{ letterSpacing: '0.28em' }}
        >
          {partner.tag}
        </span>
        <span className="text-[13.5px] font-medium leading-snug md:text-[16px]">
          {partner.message}
        </span>
      </span>
    </Link>
  );
}
