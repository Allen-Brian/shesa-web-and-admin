'use client';

import { useEffect, useState } from 'react';

/**
 * The room the song is playing in.
 *
 * ─── What this is for ──────────────────────────────────────────────────
 * A song page is one of the few places on the site where a visitor stops
 * and stays — they press play, then read the lyrics for four minutes.
 * White paper is right for reading and wrong for listening, so while the
 * track is playing the page acquires a slow wash of colour behind the
 * words, and when it stops the wash leaves.
 *
 * It is deliberately slow: the three drifts run between 22 and 34 seconds
 * and are mutually prime, so the composition never visibly repeats and
 * nothing moves fast enough to pull the eye off the lyrics. This is
 * atmosphere, not a visualiser — it is not driven by the audio, and it
 * should never be. A shape reacting to a beat is something you watch; the
 * point here is something you stop noticing.
 *
 * ─── Why CSS and not canvas ────────────────────────────────────────────
 * Three blurred radial gradients on transform-only keyframes stay on the
 * compositor: no paint, no main-thread work, no rAF competing with the
 * audio element. A canvas would cost a frame budget for a result nobody
 * is looking directly at, and would keep costing it in a background tab.
 *
 * The blobs are `translate`/`scale` only for the same reason — animating
 * a gradient's position or a filter would force repaint every frame.
 *
 * ─── Reduced motion ────────────────────────────────────────────────────
 * Honoured properly rather than by hiding the effect: the colour still
 * arrives and still leaves, it simply holds still. Someone who asked for
 * less motion asked for less motion, not for a plainer page.
 */
export function SongAmbience({ active }: { readonly active: boolean }) {
  // Mounted only once it has been needed, so a visitor who never presses
  // play never pays for the layers at all. Once mounted it stays, because
  // unmounting mid-fade would snap the colour away instead of letting it
  // go.
  const [everActive, setEverActive] = useState(false);

  useEffect(() => {
    if (active) setEverActive(true);
  }, [active]);

  if (!everActive) return null;

  return (
    <div
      aria-hidden
      data-active={active ? 'true' : 'false'}
      className="song-ambience pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <span className="song-ambience__blob song-ambience__blob--one" />
      <span className="song-ambience__blob song-ambience__blob--two" />
      <span className="song-ambience__blob song-ambience__blob--three" />

      {/* Fades the wash out against the page's own white before it reaches
          the lyrics, so the text never sits on a moving ground. */}
      <span className="song-ambience__veil" />

      <style>{`
        .song-ambience {
          opacity: 0;
          transition: opacity 2.4s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .song-ambience[data-active='true'] { opacity: 1; }

        .song-ambience__blob {
          position: absolute;
          display: block;
          border-radius: 9999px;
          filter: blur(80px);
          will-change: transform;
        }

        .song-ambience__blob--one {
          top: -18%;
          left: -12%;
          width: 62vw;
          height: 62vw;
          background: radial-gradient(circle, rgba(139, 21, 51, 0.22), transparent 68%);
          animation: song-drift-one 27s ease-in-out infinite;
        }

        .song-ambience__blob--two {
          top: 14%;
          right: -20%;
          width: 55vw;
          height: 55vw;
          background: radial-gradient(circle, rgba(196, 132, 62, 0.20), transparent 68%);
          animation: song-drift-two 34s ease-in-out infinite;
        }

        .song-ambience__blob--three {
          bottom: -22%;
          left: 22%;
          width: 58vw;
          height: 58vw;
          background: radial-gradient(circle, rgba(46, 74, 106, 0.16), transparent 68%);
          animation: song-drift-three 22s ease-in-out infinite;
        }

        .song-ambience__veil {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.55) 45%,
            rgba(255, 255, 255, 0.92) 100%
          );
        }

        @keyframes song-drift-one {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50%      { transform: translate3d(6%, 8%, 0) scale(1.12); }
        }
        @keyframes song-drift-two {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1.06); }
          50%      { transform: translate3d(-8%, 6%, 0) scale(0.94); }
        }
        @keyframes song-drift-three {
          0%, 100% { transform: translate3d(0, 0, 0) scale(0.96); }
          50%      { transform: translate3d(7%, -7%, 0) scale(1.1); }
        }

        @media (prefers-reduced-motion: reduce) {
          .song-ambience__blob { animation: none; }
        }
      `}</style>
    </div>
  );
}
