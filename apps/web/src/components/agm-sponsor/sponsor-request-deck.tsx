'use client';

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

const SUBJECT = encodeURIComponent('AGM 2026 · Partnership deck request');
const BODY = encodeURIComponent(
  [
    'Dear SHESA Secretariat,',
    '',
    'Please share the AGM 2026 partnership deck with me.',
    '',
    'Organisation:',
    'Sector:',
    'Contact person / role:',
    'Tier(s) of interest (Naming / Platinum / Gold / Silver / Exhibition):',
    'Preferred activation angle:',
    '',
    'Thank you,',
  ].join('\n'),
);
const MAILTO = `mailto:hello@shesaconnect.com?subject=${SUBJECT}&body=${BODY}`;

/**
 * Close of the sponsorship page. Deliberately does not surface any
 * tier amounts, those live in the partnership deck which SHESA
 * sends after an inbound request.
 */
export function SponsorRequestDeck() {
  return (
    <section
      id="request-deck"
      data-nav-dark
      className="relative isolate overflow-hidden bg-black py-24 text-white md:py-32"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(55% 65% at 50% 40%, color-mix(in srgb, var(--color-primary) 22%, transparent) 0%, transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/60 to-transparent"
      />

      <div className="relative mx-auto max-w-4xl px-5 md:px-8">
        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.6 }}
          variants={fadeUp}
          className="font-heading text-[11px] font-medium uppercase text-white/60"
          style={{ letterSpacing: '0.5em' }}
        >
          Request the deck
        </motion.p>

        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          custom={1}
          className="mt-8 font-heading font-thin leading-[1.05] text-white"
          style={{ fontSize: 'clamp(1.85rem, 4vw, 3rem)', letterSpacing: '-0.02em' }}
        >
          Tell us a little about your organisation.
          <span className="block italic text-primary">We&rsquo;ll send back the deck.</span>
        </motion.h2>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          custom={2}
          className="mt-8 max-w-2xl text-[15px] leading-[1.85] text-white/70"
        >
          The partnership deck carries the tier amounts, the deliverables per tier, the AGM
          programme timing, and the audience data your marketing team needs to sign off. Reach out
          to the SHESA Secretariat and we&rsquo;ll send it over within one business day.
        </motion.p>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={fadeUp}
          custom={3}
          className="mt-12 flex flex-col gap-4 sm:flex-row sm:gap-5"
        >
          <a
            href={MAILTO}
            className="group inline-flex items-center gap-3 rounded-xs bg-primary px-8 py-4 text-sm font-medium tracking-wide text-primary-foreground shadow-[0_20px_60px_-15px_rgba(139,21,51,0.6)] transition-transform duration-500 hover:-translate-y-0.5 md:px-10 md:py-5 md:text-base"
          >
            <span>Email the Secretariat</span>
            <span
              aria-hidden
              className="grid h-7 w-7 place-items-center rounded-xs bg-white/20 transition-transform duration-500 group-hover:translate-x-1"
            >
              →
            </span>
          </a>
          <a
            href="/contact"
            className="group inline-flex items-center gap-3 rounded-xs border border-white/25 bg-white/3 px-8 py-4 text-sm font-medium tracking-wide text-white backdrop-blur-sm transition-all duration-500 hover:-translate-y-0.5 hover:border-white hover:bg-white hover:text-black md:px-10 md:py-5 md:text-base"
          >
            <span>Contact page</span>
          </a>
        </motion.div>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={fadeUp}
          custom={4}
          className="mt-12 text-[13px] text-white/50"
        >
          Institutional and diplomatic invitations are handled separately by the SHESA Secretariat
          on a protocol basis.
        </motion.p>
      </div>
    </section>
  );
}
