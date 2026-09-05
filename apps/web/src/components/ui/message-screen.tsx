'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

interface Props {
  /** The oversized numeral or word behind the message: "404", "500". */
  readonly code: string;
  readonly eyebrow: string;
  readonly title: ReactNode;
  readonly body: string;
  readonly children?: ReactNode;
}

/**
 * Full-screen message in the site's own language — black ground, crest,
 * burgundy glow, the display face — used for 404 and for the error
 * boundary. Shared so the two cannot drift into looking like different
 * websites, which is exactly how an error page ends up feeling like
 * somebody else's server.
 */
export function MessageScreen({ code, eyebrow, title, body, children }: Props) {
  return (
    <section
      data-nav-dark
      className="relative isolate flex min-h-svh w-full items-center overflow-hidden bg-black px-5 py-32 text-white md:px-8"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(55% 50% at 50% 40%, color-mix(in srgb, var(--color-primary) 22%, transparent) 0%, transparent 65%), radial-gradient(40% 50% at 15% 100%, color-mix(in srgb, var(--color-primary) 12%, transparent) 0%, transparent 60%)',
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.3] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.35 0'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>\")",
          backgroundSize: '200px 200px',
        }}
      />

      {/* The code, set enormous and nearly invisible, the way the hero
          carries SHESA / ALUMNI behind the crest. */}
      <motion.span
        aria-hidden
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease }}
        className="pointer-events-none absolute inset-0 -z-10 flex select-none items-center justify-center font-display leading-none text-white/6"
        style={{ fontSize: 'clamp(11rem, 40vw, 30rem)', letterSpacing: '-0.05em' }}
      >
        {code}
      </motion.span>

      <div className="relative mx-auto flex w-full max-w-2xl flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease }}
        >
          <Image
            src="/shesa.png"
            alt=""
            width={96}
            height={96}
            className="h-14 w-auto object-contain opacity-90 md:h-16"
          />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease }}
          className="mt-8 font-heading text-[10px] font-semibold uppercase text-primary md:text-[11px]"
          style={{ letterSpacing: '0.45em' }}
        >
          {eyebrow}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.18, ease }}
          className="mt-5 font-heading font-thin leading-[1.05] text-white"
          style={{ fontSize: 'clamp(2rem, 5vw, 3.75rem)', letterSpacing: '-0.02em' }}
        >
          {title}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.26, ease }}
          className="mt-6 max-w-lg text-[15px] leading-[1.8] text-white/70 md:text-base"
        >
          {body}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.34, ease }}
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-4"
        >
          {children}
        </motion.div>
      </div>
    </section>
  );
}

/** Filled burgundy action, matching the CTAs used across the site. */
export function ScreenPrimaryLink({
  href,
  children,
}: {
  readonly href: string;
  readonly children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-3 rounded-xs bg-primary px-8 py-4 text-sm font-medium tracking-wide text-primary-foreground shadow-[0_20px_60px_-15px_rgba(139,21,51,0.6)] transition-transform duration-500 hover:-translate-y-0.5"
    >
      <span>{children}</span>
      <span
        aria-hidden
        className="grid h-7 w-7 place-items-center rounded-xs bg-white/20 transition-transform duration-500 group-hover:translate-x-1"
      >
        →
      </span>
    </Link>
  );
}

/** Outlined companion action. */
export function ScreenSecondaryLink({
  href,
  children,
}: {
  readonly href: string;
  readonly children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-xs border border-white/25 px-8 py-4 text-sm font-medium tracking-wide text-white/80 transition-colors duration-500 hover:border-white hover:text-white"
    >
      {children}
    </Link>
  );
}
