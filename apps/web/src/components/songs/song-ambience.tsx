'use client';

import { useEffect, useState } from 'react';

import { SongAmbienceMotes } from './song-ambience-motes';

/**
 * The room the song is playing in.
 *
 * ─── What this is for ──────────────────────────────────────────────────
 * The songbook is one of the few places on the site where a visitor stops
 * and stays — they press play, then read the lyrics for four minutes.
 * White paper is right for reading and wrong for listening, so while a
 * track is playing the page acquires a slow wash of colour, and when it
 * stops the wash leaves.
 *
 * It is deliberately slow: the drifts run between 17 and 34 seconds and
 * are mutually prime, so the composition never visibly repeats and
 * nothing moves fast enough to pull the eye off the words. This is
 * atmosphere, not a visualiser — it is not driven by the audio, and it
 * should never be. A shape reacting to a beat is something you watch; the
 * point here is something you stop noticing.
 *
 * The colour lives here. The *motion* — shafts of light and the dust
 * turning through them — is `song-ambience-motes`, drawn on a canvas
 * over this, because a drifting blurred gradient reads as breathing
 * rather than as anything travelling.
 *
 * ─── Being visible enough to exist ─────────────────────────────────────
 * The first version of this was not. Its blobs peaked at alpha 0.22 on a
 * gradient that fell to transparent at 68%, and an 80px blur spread that
 * peak thinner still — then a white veil reaching 0.92 was laid over the
 * result. Every one of those choices was individually defensible as
 * restraint and together they subtracted the effect entirely.
 *
 * So the colour is now carried at a strength you can actually see, and
 * restraint is spent where it belongs: on *speed*, on keeping the veil
 * only under running text, and on the accompanying `breathe` being a
 * ±12% opacity swell rather than anything that reads as blinking.
 *
 * ─── Why the colour stays in CSS ───────────────────────────────────────
 * Blurred radial gradients on transform and opacity keyframes stay on the
 * compositor: no paint, no main-thread work, no rAF competing with the
 * audio element. There is no reason to pay a frame loop for a wash that
 * a keyframe expresses exactly — which is why only the part that a
 * keyframe *cannot* express moved to a canvas.
 *
 * ─── Reduced motion ────────────────────────────────────────────────────
 * Honoured properly rather than by hiding the effect: the colour still
 * arrives and still leaves, it simply holds still. Someone who asked for
 * less motion asked for less motion, not for a plainer page.
 */
export function SongAmbience({
  active,
  /**
   * How much of the page the wash has to yield to running text.
   *
   * `full` veils the lower half — the detail page, where lyrics sit on
   * it. `soft` barely veils at all, for a grid of cards that carry their
   * own opaque surfaces and shade the wash themselves.
   */
  veil = 'full',
}: {
  readonly active: boolean;
  readonly veil?: 'full' | 'soft';
}) {
  // Mounted only once it has been needed, so a visitor who never presses
  // play never pays for the layers at all. Once mounted it stays, because
  // unmounting mid-fade would snap the colour away instead of letting it
  // go.
  const [everActive, setEverActive] = useState(false);

  // Separate from `everActive` so the first fade is a fade. Both flip in
  // the same effect, but a fresh element carrying its final opacity has
  // nothing to transition from — the browser has no previous value for
  // it — and the wash would appear in one frame. One paint at zero, then
  // the class change, gives the transition something to run between.
  const [lit, setLit] = useState(false);

  useEffect(() => {
    if (!active) {
      setLit(false);
      return;
    }
    setEverActive(true);
    const id = requestAnimationFrame(() => setLit(true));
    return () => cancelAnimationFrame(id);
  }, [active]);

  if (!everActive) return null;

  return (
    <div
      aria-hidden
      data-lit={lit ? 'true' : 'false'}
      className="song-ambience pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <span className="song-ambience__blob song-ambience__blob--one" />
      <span className="song-ambience__blob song-ambience__blob--two" />
      <span className="song-ambience__blob song-ambience__blob--three" />
      <span className="song-ambience__blob song-ambience__blob--four" />

      {/* The wash above is colour; this is the movement. Kept apart
          because they are paid for differently — the gradients cost
          nothing and can always run, the canvas costs a frame loop and
          only runs while the music does. */}
      <SongAmbienceMotes active={active} />

      {/* Keeps the wash off running text without flattening it everywhere. */}
      <span className={`song-ambience__veil song-ambience__veil--${veil}`} />

      <style>{`
        .song-ambience {
          opacity: 0;
          transition: opacity 1.8s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .song-ambience[data-lit='true'] { opacity: 1; }

        .song-ambience__blob {
          position: absolute;
          display: block;
          border-radius: 9999px;
          filter: blur(60px);
          will-change: transform, opacity;
        }

        .song-ambience__blob--one {
          top: -22%;
          left: -14%;
          width: 68vw;
          height: 68vw;
          background: radial-gradient(circle, rgba(139, 21, 51, 0.62), rgba(139, 21, 51, 0) 70%);
          animation: song-drift-one 27s ease-in-out infinite,
                     song-breathe 19s ease-in-out infinite;
        }

        .song-ambience__blob--two {
          top: 6%;
          right: -22%;
          width: 62vw;
          height: 62vw;
          background: radial-gradient(circle, rgba(203, 132, 54, 0.52), rgba(203, 132, 54, 0) 70%);
          animation: song-drift-two 34s ease-in-out infinite,
                     song-breathe 23s ease-in-out infinite reverse;
        }

        .song-ambience__blob--three {
          bottom: -26%;
          left: 18%;
          width: 64vw;
          height: 64vw;
          background: radial-gradient(circle, rgba(38, 70, 108, 0.42), rgba(38, 70, 108, 0) 70%);
          animation: song-drift-three 22s ease-in-out infinite,
                     song-breathe 29s ease-in-out infinite;
        }

        /* Sits under the headline, where the page is otherwise emptiest. */
        .song-ambience__blob--four {
          top: 30%;
          left: 34%;
          width: 46vw;
          height: 46vw;
          background: radial-gradient(circle, rgba(122, 42, 92, 0.34), rgba(122, 42, 92, 0) 72%);
          animation: song-drift-four 31s ease-in-out infinite,
                     song-breathe 17s ease-in-out infinite reverse;
        }

        .song-ambience__veil--full {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.12) 38%,
            rgba(255, 255, 255, 0.52) 100%
          );
        }

        .song-ambience__veil--soft {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(255, 255, 255, 0.10) 0%,
            rgba(255, 255, 255, 0.20) 100%
          );
        }

        @keyframes song-drift-one {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50%      { transform: translate3d(9%, 11%, 0) scale(1.18); }
        }
        @keyframes song-drift-two {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1.1); }
          50%      { transform: translate3d(-12%, 9%, 0) scale(0.9); }
        }
        @keyframes song-drift-three {
          0%, 100% { transform: translate3d(0, 0, 0) scale(0.94); }
          50%      { transform: translate3d(11%, -10%, 0) scale(1.16); }
        }
        @keyframes song-drift-four {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1.04); }
          50%      { transform: translate3d(-10%, -8%, 0) scale(0.88); }
        }

        /* ±12%. Enough to keep the wash alive, not enough to read as a pulse. */
        @keyframes song-breathe {
          0%, 100% { opacity: 0.88; }
          50%      { opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          .song-ambience__blob { animation: none; }
        }
      `}</style>
    </div>
  );
}
