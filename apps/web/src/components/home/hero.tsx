'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { HandHeart, Shirt, Ticket, type LucideIcon } from 'lucide-react';
import { useState } from 'react';

import { CrestBadge } from './crest-badge';
import { HeroBackdropImages } from './hero-backdrop-images';

const ease = [0.22, 1, 0.36, 1] as const;

interface HeroAction {
  readonly icon: LucideIcon;
  readonly kicker: string;
  readonly label: string;
  readonly body: string;
  /** Deep link into the matching form on the AGM 2026 page. */
  readonly href: string;
  /** The one card carrying the beam — ticket sales lead everything else. */
  readonly primary?: boolean;
}

const heroActions: readonly HeroAction[] = [
  {
    icon: Ticket,
    kicker: 'AGM 2026',
    label: 'Get your ticket',
    body: 'Register and pay for your seat in Yaoundé.',
    href: '/agm-2026#register',
    primary: true,
  },
  {
    icon: Shirt,
    kicker: 'Uniform',
    label: 'Order SHESA attire',
    body: 'The new colours, sized and paid for online.',
    href: '/agm-2026#attire',
  },
  {
    icon: HandHeart,
    kicker: 'Give',
    label: 'Sponsor or support',
    body: 'Back the assembly at the tier that suits you.',
    href: '/agm-2026#funding',
  },
] as const;

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
              className="aspect-square w-60 sm:w-80 md:w-100 lg:w-120 xl:w-135 mb-8"
            />
          </motion.div>
        </div>

        <div className="relative z-20 mt-8 grid gap-3 md:mt-0 md:grid-cols-3 md:items-stretch md:gap-4">
          {heroActions.map((action, i) => (
            <motion.div key={action.href} {...rise(0.55 + i * 0.12)}>
              <ActionCard action={action} />
            </motion.div>
          ))}
        </div>
      </div>

      <ScrollHint />
    </section>
  );
}

/**
 * Hero call-to-action card. Each one deep-links to a form section on
 * the AGM 2026 page (`#register`, `#attire`, `#funding`) so the hero
 * lands people inside the flow rather than at the top of the page.
 *
 * The primary card carries the rotating beam + halo used by the AGM
 * support button, so the ticket action reads as the loudest thing on
 * the screen; the other two are glass cards that light up on hover.
 */
function ActionCard({ action }: { readonly action: HeroAction }) {
  const { icon: Icon, primary } = action;

  return (
    <div className={`relative h-full rounded-xs ${primary ? '' : 'isolate'}`}>
      {primary ? <span className="border-beam-halo" aria-hidden /> : null}
      <Link
        href={action.href}
        className={`group relative flex h-full flex-col gap-3 overflow-hidden rounded-xs px-4 py-4 transition-all duration-500 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary md:px-5 md:py-5 ${
          primary
            ? 'bg-primary text-primary-foreground shadow-[0_20px_60px_-15px_rgba(139,21,51,0.6)] hover:-translate-y-0.5'
            : 'border border-white/15 bg-white/6 text-white shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-md hover:-translate-y-0.5 hover:border-primary hover:bg-white/10'
        }`}
      >
        {primary ? <span className="border-beam" aria-hidden /> : null}
        <span
          aria-hidden
          className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/25 to-transparent transition-transform duration-1000 group-hover:translate-x-full"
        />

        <span className="relative flex items-center gap-3">
          <span
            aria-hidden
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-xs ${
              primary ? 'bg-white/20 text-white' : 'bg-primary/15 text-primary'
            }`}
          >
            <Icon className="h-5 w-5" />
          </span>

          <span className="flex min-w-0 flex-col">
            <span
              className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${
                primary ? 'text-white/75' : 'text-primary'
              }`}
            >
              {action.kicker}
            </span>
            <span className="mt-0.5 text-[15px] font-medium leading-tight md:text-base">
              {action.label}
            </span>
          </span>
        </span>

        <span className="relative mt-auto flex items-center justify-between gap-3">
          <span
            className={`text-[12.5px] leading-normal md:text-[13px] ${
              primary ? 'text-white/80' : 'text-white/65'
            }`}
          >
            {action.body}
          </span>

          <span
            aria-hidden
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-xs transition-transform duration-500 group-hover:translate-x-1 ${
              primary
                ? 'bg-white/20 text-white'
                : 'border border-white/30 text-white group-hover:border-primary group-hover:text-primary'
            }`}
          >
            →
          </span>
        </span>
      </Link>
    </div>
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
        className="font-display leading-none text-white/25"
        style={{ fontSize: 'clamp(4rem, 18vw, 20rem)', letterSpacing: '-0.04em' }}
      >
        SHESA
      </motion.span>
      <motion.span
        initial={{ opacity: 0, x: 60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1.2, ease }}
        className="font-display leading-none text-white/25"
        style={{ fontSize: 'clamp(4rem, 18vw, 20rem)', letterSpacing: '-0.04em' }}
      >
        ALUMNI
      </motion.span>
    </div>
  );
}

/**
 * The tagline flanking the crest, split across it — "One SHESA" left,
 * "One Dream" right. Both sit in the crest's lower third so they stay
 * clear of the oversized SHESA / ALUMNI backdrop word above, and the
 * crest carries nothing beneath it.
 */
function ScriptOverlay() {
  const scriptStyle = {
    fontSize: 'clamp(1.75rem, 5.5vw, 5rem)',
    lineHeight: 1,
    textShadow: '0 4px 30px rgba(139,21,51,0.55)',
  } as const;

  return (
    <>
      <motion.span
        aria-hidden
        initial={{ opacity: 0, y: 20, rotate: -3 }}
        animate={{ opacity: 1, y: 0, rotate: -3 }}
        transition={{ duration: 1, delay: 0.35, ease }}
        className="pointer-events-none absolute left-0 top-[52%] z-20 whitespace-nowrap font-script text-primary md:left-[3%] md:top-[64%]"
        style={scriptStyle}
      >
        One SHESA
      </motion.span>
      <motion.span
        aria-hidden
        initial={{ opacity: 0, y: 20, rotate: 3 }}
        animate={{ opacity: 1, y: 0, rotate: 3 }}
        transition={{ duration: 1, delay: 0.5, ease }}
        className="pointer-events-none absolute right-0 top-[62%] z-20 whitespace-nowrap font-script text-primary md:right-[3%] md:top-[64%]"
        style={scriptStyle}
      >
        One Dream
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
