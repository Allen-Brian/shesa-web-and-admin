'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { PenTool } from 'lucide-react';
import { useState } from 'react';

import { PRESIDENTS_ADDRESS as A } from './presidents-address-content';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

/**
 * The President General's address, set as a rolled scroll on a dark
 * desk: parchment wound around a roll at each end, an illuminated drop
 * cap, a rubricated creed, a signature that writes itself when it comes
 * into view, and a wax seal beside it.
 *
 * The serif is the platform stack rather than a webfont — the repo
 * self-hosts its faces (see app/fonts.css) and none of the three is a
 * text serif, so Georgia/Times keeps the letter looking like a letter
 * without adding a download or breaking the offline-reproducible font
 * layer. Anton (`font-display`) sets the drop cap; Caveat
 * (`font-script`) signs it.
 */
const serif = "Georgia, 'Iowan Old Style', 'Times New Roman', serif";

export function PresidentsLetter() {
  return (
    <section
      /* Dark ground behind a fixed nav — without this the nav renders
         its dark-on-light palette and disappears into the desk. */
      data-nav-dark
      className="relative overflow-hidden bg-[#1a1310] py-16 md:py-24"
    >
      <DeskBackdrop />

      <div className="relative mx-auto max-w-4xl px-6 sm:px-8 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease }}
          className="relative"
        >
          <ScrollRoll edge="top" />

          <article
            className="relative px-6 py-12 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] sm:px-10 md:px-16 md:py-16 lg:px-24"
            style={{
              background:
                'radial-gradient(120% 80% at 50% 0%, #fbf3e0 0%, #f3e6cb 45%, #e8d7b4 100%)',
              color: '#3a2c1c',
              fontFamily: serif,
            }}
          >
            <Foxing />
            <CurlShadows />

            <header className="relative text-center">
              {/* Crest medallion — the seal of the house at the head of
                the letter, gilt-ringed on a parchment ground. */}
              <div
                className="relative mx-auto h-24 w-24 rounded-full p-0.75 md:h-28 md:w-28"
                style={{
                  background: 'linear-gradient(145deg, #d8b878 0%, #a37c3c 50%, #d8b878 100%)',
                  boxShadow: '0 10px 26px -10px rgba(60,40,15,0.7)',
                }}
              >
                <div
                  className="grid h-full w-full place-items-center rounded-full border border-[#f3e6cb]"
                  style={{
                    background:
                      'radial-gradient(70% 70% at 50% 35%, #fdf7e9 0%, #f3e6cb 70%, #e8d7b4 100%)',
                  }}
                >
                  <Image
                    src="/shesa.png"
                    alt="SHESA"
                    width={96}
                    height={96}
                    className="h-14 w-auto object-contain md:h-16"
                  />
                </div>
              </div>

              <p
                className="mt-6 text-[10px] font-semibold uppercase text-[#8a6b3f] md:text-[11px]"
                style={{ letterSpacing: '0.42em' }}
              >
                From the desk of the President General
              </p>

              <h1
                className="mx-auto mt-5 max-w-2xl uppercase leading-[1.35] text-[#4a2418]"
                style={{
                  fontFamily: serif,
                  fontSize: 'clamp(1.05rem, 2.2vw, 1.6rem)',
                  letterSpacing: '0.12em',
                  fontWeight: 700,
                }}
              >
                {A.title}
              </h1>

              <Flourish />
            </header>

            <div className="relative mt-10 md:mt-12">
              <p
                className="text-[1.05rem] italic md:text-[1.15rem]"
                style={{ letterSpacing: '0.01em' }}
              >
                {A.salutation}
              </p>

              {A.paragraphs.map((text, i) => (
                <p
                  key={i}
                  className="mt-5 text-[1rem] leading-[1.95] md:mt-6 md:text-[1.075rem]"
                  style={{ textAlign: 'justify', hyphens: 'auto' }}
                >
                  {i === 0 ? (
                    <>
                      <span
                        aria-hidden
                        className="font-display float-left mr-3 mt-1 leading-[0.8] text-primary"
                        style={{ fontSize: '3.6em', letterSpacing: '-0.02em' }}
                      >
                        {text.charAt(0)}
                      </span>
                      {text.slice(1)}
                    </>
                  ) : (
                    text
                  )}
                </p>
              ))}

              {/* The creed, rubricated the way a medieval scribe marked
                the passage that mattered most. */}
              <div className="mt-9 border-y border-[#c9ab77]/60 py-7 text-center md:mt-11 md:py-8">
                <p className="text-[0.95rem] italic text-[#6b5233] md:text-[1rem]">
                  {A.creed.lead}
                </p>
                <p
                  className="mt-3 uppercase leading-[1.45] text-primary"
                  style={{
                    fontFamily: serif,
                    fontSize: 'clamp(1.05rem, 2.4vw, 1.5rem)',
                    letterSpacing: '0.14em',
                    fontWeight: 700,
                  }}
                >
                  {A.creed.line}
                </p>
                <p className="mx-auto mt-4 max-w-xl text-[0.95rem] leading-[1.85] md:text-[1rem]">
                  {A.creed.tail}
                </p>
              </div>

              {A.closingParagraphs.map((text, i) => (
                <p
                  key={i}
                  className="mt-6 text-[1rem] leading-[1.95] md:text-[1.075rem]"
                  style={{ textAlign: 'justify', hyphens: 'auto' }}
                >
                  {text}
                </p>
              ))}

              <p
                className="mt-9 text-center text-[1.05rem] italic text-[#4a2418] md:text-[1.2rem]"
                style={{ letterSpacing: '0.02em' }}
              >
                {A.refrain}
              </p>
            </div>

            <footer className="relative mt-12 flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between md:mt-14">
              <div>
                <p className="text-[1rem] italic md:text-[1.05rem]">{A.valediction}</p>
                <Signature />
                <span aria-hidden className="mt-3 block h-px w-56 max-w-full bg-[#b3915d]" />
                <p
                  className="mt-3 text-[11px] font-semibold uppercase text-[#6b5233]"
                  style={{ letterSpacing: '0.3em' }}
                >
                  {A.signatory.title}
                </p>
                <p
                  className="mt-1 text-[11px] uppercase text-[#8a6b3f]"
                  style={{ letterSpacing: '0.3em' }}
                >
                  {A.signatory.organisation}
                </p>
              </div>

              <WaxSeal />
            </footer>
          </article>

          <ScrollRoll edge="bottom" />
        </motion.div>

        <div className="mt-10 flex justify-center md:mt-12">
          <Link
            href="/"
            className="group inline-flex items-center gap-3 text-sm font-medium tracking-wide text-[#e8d7b4] transition-colors duration-500 hover:text-white"
          >
            <span
              aria-hidden
              className="grid h-8 w-8 place-items-center rounded-xs border border-[#e8d7b4]/30 transition-transform duration-500 group-hover:-translate-x-1"
            >
              ←
            </span>
            Back home
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * A rolled end of the scroll. Wider than the sheet so the roll reads as
 * a cylinder the parchment is wound around: a horizontal gradient gives
 * the barrel its round shading, and darker caps close both ends.
 */
function ScrollRoll({ edge }: { readonly edge: 'top' | 'bottom' }) {
  const top = edge === 'top';
  return (
    <div
      aria-hidden
      className={`pointer-events-none relative z-20 h-9 md:h-11 ${top ? '-mb-1' : '-mt-1'}`}
    >
      {/* The barrel, overhanging the sheet on both sides. */}
      <div
        className="absolute inset-y-0 -left-4 -right-4 rounded-full md:-left-6 md:-right-6"
        style={{
          background:
            'linear-gradient(180deg, #c2a877 0%, #e6d5b0 18%, #fbf3e0 42%, #e2cfa6 68%, #a98a56 100%)',
          boxShadow: top
            ? '0 12px 26px -12px rgba(0,0,0,0.75), inset 0 -8px 12px -8px rgba(90,62,25,0.65)'
            : '0 -6px 20px -12px rgba(0,0,0,0.6), inset 0 8px 12px -8px rgba(90,62,25,0.65)',
        }}
      />

      {/* Wound layers — the spiral you see from the side. */}
      <div
        className="absolute inset-y-1 -left-4 -right-4 rounded-full opacity-60 md:-left-6 md:-right-6"
        style={{
          background:
            'repeating-linear-gradient(180deg, rgba(150,112,58,0.22) 0 1px, transparent 1px 5px)',
        }}
      />

      {/* End caps, each showing the coiled edge of the parchment. */}
      {(['left', 'right'] as const).map((side) => (
        <span
          key={side}
          className={`absolute top-1/2 h-[125%] w-5 -translate-y-1/2 rounded-full md:w-6 ${
            side === 'left' ? '-left-6 md:-left-8' : '-right-6 md:-right-8'
          }`}
          style={{
            background:
              'radial-gradient(60% 55% at 50% 42%, #fbf3e0 0%, #dcc79c 45%, #9c7c4a 100%)',
            boxShadow: '0 8px 18px -10px rgba(0,0,0,0.8)',
          }}
        />
      ))}
    </div>
  );
}

/**
 * Shading where the sheet disappears into each roll, so the parchment
 * looks like it curves away rather than being cut off.
 */
function CurlShadows() {
  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-10"
        style={{
          background: 'linear-gradient(180deg, rgba(120,88,45,0.35) 0%, transparent 100%)',
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-10"
        style={{
          background: 'linear-gradient(0deg, rgba(120,88,45,0.35) 0%, transparent 100%)',
        }}
      />
    </>
  );
}

/**
 * The signature, written rather than printed: once the footer scrolls
 * into view the name is revealed left to right with a nib riding the
 * leading edge, so it reads as the President General signing in front
 * of you.
 *
 * The reveal is a `clipPath` wipe over the real text rather than an SVG
 * path traced with `stroke-dashoffset` — hand-authoring a path for this
 * name would take a signature's worth of bezier work and still not look
 * like his hand. The wipe reads the same at this size and keeps the name
 * as selectable text.
 */
function Signature() {
  const reduce = useReducedMotion();
  const [writing, setWriting] = useState(false);
  const duration = 2.4;

  return (
    <div className="relative mt-3 inline-block">
      {/* The name is never hidden by default: no `initial` clip, and the
          wipe is a keyframe pair that only exists once `writing` is set.
          An earlier version parked the paragraph at `inset(... 100% ...)`
          and relied on the viewport callback to open it, so anything that
          stopped that callback firing left the signature invisible — which
          is what happened on desktop. Now a failed trigger costs the
          animation, not the signature.

          The vertical padding gives Caveat's ascenders and descenders room
          inside the clip box; `inset()` percentages must stay >= 0, since
          negative values are dropped outright by some engines. */}
      <motion.p
        className="font-script whitespace-nowrap py-1.5 leading-none text-[#2f2418]"
        style={{ fontSize: 'clamp(1.35rem, 3.6vw, 2rem)' }}
        initial={false}
        viewport={{ once: true, amount: 0.3 }}
        onViewportEnter={() => {
          if (!reduce) setWriting(true);
        }}
        animate={writing ? { clipPath: ['inset(0 100% 0 0)', 'inset(0 0% 0 0)'] } : undefined}
        transition={{ duration, ease: 'linear' }}
      >
        {A.signatory.name}
      </motion.p>

      {writing ? (
        <motion.span
          /* Below the line, nib turned up so the tip meets the letters
             it is laying down. */
          aria-hidden
          className="absolute top-full left-0 -mt-2 text-primary"
          initial={{ left: '0%', opacity: 0 }}
          animate={{
            left: '100%',
            opacity: [0, 1, 1, 0],
            y: [0, 2, -1, 1, 0],
          }}
          transition={{
            left: { duration, ease: 'linear' },
            opacity: { duration, times: [0, 0.04, 0.92, 1] },
            y: { duration, ease: 'easeInOut' },
          }}
        >
          {/* Rotated on the icon rather than the animated wrapper, so the
              nib's offset stays fixed while the wrapper travels. */}
          <PenTool className="h-6 w-6 translate-x-[-62%] rotate-170 md:h-7 md:w-7" />
        </motion.span>
      ) : null}
    </div>
  );
}

/** Dark desk the sheet rests on — worn leather, lit from above. */
function DeskBackdrop() {
  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(70% 50% at 50% 0%, rgba(139,21,51,0.22) 0%, transparent 60%), radial-gradient(90% 70% at 50% 100%, rgba(0,0,0,0.6) 0%, transparent 70%)',
        }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.4 0'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>\")",
          backgroundSize: '180px 180px',
        }}
      />
    </>
  );
}

/** Age spots and fibre on the parchment. */
function Foxing() {
  return (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 300 300' xmlns='http://www.w3.org/2000/svg'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.55  0 0 0 0 0.42  0 0 0 0 0.22  0 0 0 0.18 0'/></filter><rect width='300' height='300' filter='url(%23p)'/></svg>\")",
          backgroundSize: '300px 300px',
        }}
      />
      {/* Shadowed edges, as if the sheet curls away from the desk. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(120,88,45,0.22) 100%)',
        }}
      />
    </>
  );
}

/** Ornamental rule under the heading. */
function Flourish() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 240 24"
      className="mx-auto mt-7 h-5 w-52"
      style={{ color: '#b3915d' }}
      fill="none"
    >
      <path d="M4 12h78M158 12h78" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      <path
        d="M120 4c-6 0-9 3.6-9 8s3 8 9 8 9-3.6 9-8-3-8-9-8z"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        d="M111 12c-5 0-8-2.4-11-4.6M129 12c5 0 8-2.4 11-4.6M111 12c-5 0-8 2.4-11 4.6M129 12c5 0 8 2.4 11 4.6"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <circle cx="120" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

/** Wax seal pressed beside the signature. */
function WaxSeal() {
  return (
    <div
      aria-hidden
      className="relative h-28 w-28 shrink-0 self-center sm:self-end md:h-32 md:w-32"
      style={{ transform: 'rotate(-8deg)' }}
    >
      <span
        className="absolute inset-0 rounded-full shadow-[0_10px_24px_-8px_rgba(60,10,25,0.7)]"
        style={{
          background: 'radial-gradient(60% 60% at 35% 30%, #a82342 0%, #8b1533 45%, #6d0f27 100%)',
          clipPath:
            'polygon(50% 0%, 63% 6%, 76% 4%, 85% 14%, 96% 22%, 97% 36%, 100% 50%, 96% 63%, 96% 77%, 85% 85%, 77% 96%, 63% 96%, 50% 100%, 37% 96%, 23% 97%, 14% 86%, 4% 77%, 3% 63%, 0% 50%, 4% 37%, 3% 23%, 15% 14%, 23% 4%, 37% 3%)',
        }}
      />
      <span
        className="absolute inset-[14%] rounded-full border border-white/25"
        style={{ boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.45)' }}
      />
      <span
        className="absolute inset-0 grid place-items-center text-[10px] font-semibold uppercase text-white/90"
        style={{ letterSpacing: '0.22em' }}
      >
        SHESA
      </span>
    </div>
  );
}
