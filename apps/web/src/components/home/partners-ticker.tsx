'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

import { MarqueeCarousel } from './marquee-carousel';
import { PartnerLogo } from './partner-logo';
import { partners, type Partner } from './partners-data';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

/**
 * VARIANT C — Broadcast ticker.
 *
 * A live lower-third: a locked burgundy flag on the left, then one
 * continuous line of partner messages running past it. Reads as
 * always-on airtime rather than a logo wall, and it costs the page
 * almost no vertical space — the argument here is frequency, the same
 * board seen on every visit, not size.
 */
export function PartnersTicker() {
  return (
    <section data-nav-dark className="relative isolate bg-[#0a0a0e] py-12 text-white md:py-16">
      <div className="mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.7, ease }}
          className="mb-7 flex flex-wrap items-end justify-between gap-4 md:mb-9"
        >
          <h2
            className="font-heading font-thin leading-[1.1] text-white"
            style={{ fontSize: 'clamp(1.6rem, 3vw, 2.6rem)', letterSpacing: '-0.02em' }}
          >
            On air with our partners.
          </h2>
          <Link
            href="/agm-2026/sponsor"
            className="text-[13px] font-medium tracking-wide text-white/70 underline-offset-4 transition-colors duration-500 hover:text-primary hover:underline"
          >
            Take a slot →
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, delay: 0.1, ease }}
          className="relative flex overflow-hidden rounded-xs border border-white/12 bg-linear-to-r from-white/8 to-white/3 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] backdrop-blur-md"
        >
          {/* Locked flag — the channel ident. */}
          <div className="relative z-10 flex shrink-0 items-center gap-2.5 bg-primary px-4 text-primary-foreground md:gap-3 md:px-6">
            <span className="relative grid h-2 w-2 place-items-center">
              <span className="absolute h-2 w-2 rounded-full bg-white" />
              <motion.span
                aria-hidden
                className="absolute h-2 w-2 rounded-full bg-white"
                animate={{ scale: [1, 2.6], opacity: [0.7, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
              />
            </span>
            <span
              className="font-heading text-[10px] font-semibold uppercase md:text-[11px]"
              style={{ letterSpacing: '0.3em' }}
            >
              Partners
            </span>
          </div>

          <div className="min-w-0 flex-1 py-3.5 md:py-4">
            <MarqueeCarousel
              items={partners}
              duration={44}
              ariaLabel="Our partners"
              trackClassName="gap-0"
              maskImage="linear-gradient(to right, black 0%, black 92%, transparent)"
              renderItem={(partner) => <TickerItem partner={partner} />}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function TickerItem({ partner }: { readonly partner: Partner }) {
  return (
    <span className="flex items-center">
      <Link
        href={partner.href ?? '/agm-2026/sponsor'}
        className="group flex items-center gap-3 px-5 md:gap-4 md:px-7"
      >
        <PartnerLogo
          partner={partner}
          className="h-9 w-18 md:h-10 md:w-20"
          textClassName="text-[11px] md:text-[12px]"
        />
        <span className="flex items-baseline gap-2.5">
          <span
            className="hidden text-[9px] font-semibold uppercase text-primary sm:inline md:text-[10px]"
            style={{ letterSpacing: '0.26em' }}
          >
            {partner.tag}
          </span>
          <span className="whitespace-nowrap text-[13px] font-medium text-white/85 transition-colors duration-300 group-hover:text-white md:text-[15px]">
            {partner.message}
          </span>
        </span>
      </Link>
      {/* Bullet between slots, the way a news crawl separates stories. */}
      <span aria-hidden className="h-1.5 w-1.5 rotate-45 bg-primary/70" />
    </span>
  );
}
