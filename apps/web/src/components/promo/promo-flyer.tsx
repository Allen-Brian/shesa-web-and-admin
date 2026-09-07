'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { MapPin, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { startLenis, stopLenis } from '@/components/lenis-provider';

import { ACTIVE_PROMO } from './promo-config';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

/**
 * True on a barred route: an exact match on a suppressed prefix, or any
 * path beneath it. The `/` check keeps a prefix from swallowing an
 * unrelated sibling — `/receipt` must not silence `/receipts-policy`.
 */
function isSuppressed(pathname: string): boolean {
  return ACTIVE_PROMO.suppressedPaths.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Event flyer. Shown once on each page the visitor opens — no timers,
 * no tally: the route is the trigger. Landing on the site opens it, and
 * so does every navigation after that, once per page.
 *
 * Keyed on the pathname rather than a mount, because this lives in the
 * root layout and client-side navigation never remounts it. Query and
 * hash changes are not pathname changes, so in-page links (the AGM form
 * anchors) don't re-open it.
 *
 * Built as a ticket stub rather than a dialog box — a full poster half
 * on the left, the details torn off along a perforation on the right.
 * It still behaves like a modal: Escape and the backdrop close it,
 * focus moves into the panel, and the page behind stops scrolling.
 */
export function PromoFlyer() {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const pathname = usePathname();

  const dismiss = useCallback(() => setOpen(false), []);

  // One showing per page opened, on the pages that want it.
  useEffect(() => {
    if (!ACTIVE_PROMO.active) return;
    if (isSuppressed(pathname)) {
      // Navigating from a page that had it open onto one that bars it.
      setOpen(false);
      return;
    }
    setOpen(true);
  }, [pathname]);

  // Freeze the page, take focus, and listen for Escape while open.
  useEffect(() => {
    if (!open) return;

    stopLenis();
    panelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      startLenis();
    };
  }, [dismiss, open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease }}
          className="fixed inset-0 z-100 flex items-start justify-center overflow-y-auto overscroll-contain bg-black/75 p-3 backdrop-blur-md sm:p-6 md:items-center md:p-10"
          /* Without this the flyer cannot be scrolled on a phone.
             Opening it calls `stopLenis()`, and a stopped Lenis calls
             preventDefault() on every touchmove and wheel event whose
             composed path does not carry one of its opt-out attributes
             (lenis 1.3.25, `onVirtualScroll`) — including the gesture
             inside this element, which is the one thing that still has
             to work while the page behind is frozen. On desktop the
             panel fits the viewport, so nothing looked wrong. */
          data-lenis-prevent
          /* A tap anywhere closes the flyer — the panel deliberately
             does not stop propagation. On a phone the sheet fills the
             screen and the close button sits far up in a corner, so
             requiring a hit on the backdrop or that button made it hard
             to dismiss. The two links still navigate on their way out,
             since they dismiss on click themselves. */
          onClick={dismiss}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="promo-flyer-title"
            tabIndex={-1}
            initial={{ opacity: 0, y: reduce ? 0 : 36, scale: reduce ? 1 : 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduce ? 0 : 20, scale: reduce ? 1 : 0.98 }}
            transition={{ duration: 0.6, ease }}
            className="relative my-auto grid w-full max-w-260 overflow-hidden rounded-xs bg-[#08080c] text-white shadow-[0_60px_160px_-30px_rgba(0,0,0,0.95)] outline-none md:grid-cols-2"
          >
            <button
              type="button"
              onClick={dismiss}
              aria-label="Close"
              className="absolute right-3 top-3 z-30 grid h-10 w-10 place-items-center rounded-xs bg-black/50 text-white/80 backdrop-blur-sm transition-colors duration-300 hover:bg-black/80 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            <PosterHalf />
            <StubHalf onNavigate={dismiss} />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/**
 * Left half: the flyer itself. The artwork already carries the title,
 * dates, and venue, so nothing is drawn over it — an overlay here would
 * be the designer's words competing with mine.
 *
 * It fills the panel edge to edge. `object-contain` left black bands
 * above and below, because the flyer is portrait and the panel is as
 * tall as the details beside it. Filling costs a sliver off one edge
 * instead, taken from the bottom so the title and crest are never
 * touched.
 *
 * Hidden below `md`. Stacked on a phone the poster is a 4:5 block above
 * the details, which pushed the dates, the programme and — worst — the
 * pay button below the fold of a dialog most people never think to
 * scroll. A flyer nobody can act on is decoration. The artwork is the
 * invitation, but the button is the point, so on a small screen the
 * button wins.
 */
function PosterHalf() {
  const promo = ACTIVE_PROMO;

  return (
    <div className="relative hidden aspect-4/5 overflow-hidden bg-[#0b0b0f] md:block md:aspect-auto md:h-full md:min-h-160">
      <Image
        src={promo.image}
        alt={`${promo.title} — ${promo.subtitle}`}
        fill
        priority
        sizes="(min-width: 768px) 640px, 100vw"
        className="object-cover object-top"
      />
    </div>
  );
}

/** Right half: the torn-off stub — dates, programme, and the buttons. */
function StubHalf({ onNavigate }: { readonly onNavigate: () => void }) {
  const promo = ACTIVE_PROMO;

  return (
    // The dashed edge is the tear between poster and stub, so it only
    // exists where the poster does — on md and up, down the left side.
    <div className="relative flex flex-col justify-center gap-7 border-dashed border-white/20 px-6 py-10 md:border-l md:px-10 md:py-14">
      {/* Date lockup. */}
      <div>
        <p
          className="font-heading text-[10px] font-semibold uppercase text-primary"
          style={{ letterSpacing: '0.4em' }}
        >
          Save the date
        </p>
        <p
          className="mt-3 font-heading font-thin leading-none text-white"
          style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', letterSpacing: '-0.03em' }}
        >
          {promo.dateRange}
        </p>
        <p className="mt-2 font-heading text-[15px] font-medium tracking-wide text-white/80 md:text-base">
          {promo.monthYear}
        </p>

        <p className="mt-4 flex items-start gap-2 text-[13.5px] leading-snug text-white/70">
          <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span>
            <span className="block font-medium text-white">{promo.venue}</span>
            <span className="block">{promo.city}</span>
          </span>
        </p>
      </div>

      {/* Programme at a glance. */}
      <ul className="flex flex-col">
        {promo.highlights.map((h) => (
          <li
            key={h.day}
            className="flex items-start gap-4 border-t border-white/10 py-3.5 first:border-t-0 first:pt-0 last:pb-0"
          >
            <span className="flex w-10 shrink-0 flex-col items-center leading-none">
              <span className="font-heading text-xl font-thin text-primary">{h.day}</span>
              <span
                className="mt-1 text-[9px] font-semibold uppercase text-white/45"
                style={{ letterSpacing: '0.2em' }}
              >
                {h.month}
              </span>
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-[13.5px] font-medium leading-snug text-white">{h.title}</span>
              <span className="mt-1 text-[12px] leading-[1.6] text-white/55">{h.detail}</span>
            </span>
          </li>
        ))}
      </ul>

      {/* Actions. */}
      <div>
        <Link
          href={promo.cta.href}
          onClick={onNavigate}
          className="group relative flex items-center justify-center gap-3 overflow-hidden rounded-xs bg-primary px-6 py-4.5 text-sm font-medium tracking-wide text-primary-foreground shadow-[0_24px_70px_-18px_rgba(139,21,51,0.8)] transition-transform duration-500 hover:-translate-y-0.5 md:text-[15px]"
        >
          <span className="border-beam" aria-hidden />
          <span
            aria-hidden
            className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/35 to-transparent transition-transform duration-1000 group-hover:translate-x-full"
          />
          <span className="relative">{promo.cta.label}</span>
          <span
            aria-hidden
            className="relative grid h-6 w-6 place-items-center rounded-xs bg-white/20 transition-transform duration-500 group-hover:translate-x-1"
          >
            →
          </span>
        </Link>

        {promo.secondary ? (
          <Link
            href={promo.secondary.href}
            onClick={onNavigate}
            className="mt-3 block rounded-xs border border-white/15 px-6 py-3.5 text-center text-[13px] font-medium text-white/75 transition-colors duration-300 hover:border-white/40 hover:text-white"
          >
            {promo.secondary.label}
          </Link>
        ) : null}

        <p className="mt-4 text-center text-[11.5px] leading-relaxed text-white/45">
          {promo.footnote}
        </p>
      </div>
    </div>
  );
}
