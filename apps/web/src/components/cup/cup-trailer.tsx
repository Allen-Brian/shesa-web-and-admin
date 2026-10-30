'use client';

import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { startLenis, stopLenis } from '@/components/lenis-provider';

import { CUP, RUNTIME_MS } from './cup-content';
import { LightLeak, SlideCut, type CutAccent } from './cup-graphics';
import { buildSlides, planRuntime, type SlideKind } from './cup-slides';
import { SlideBody } from './trailer-slides';
import { useTrailerAudio } from './use-trailer-audio';

/**
 * Which cuts get dressed, and with what.
 *
 * Most get nothing. An accent on all thirty cuts stops being an accent
 * and becomes the wallpaper, and the hard cut is doing the work on its
 * own — see `SlideCut`.
 *
 * `name` and `prize` flash, because those two are meant to hit. `zone`
 * and `fixtures` sweep, because they open a new section and a bar
 * crossing the screen is the oldest way of saying so. `gallery` gets
 * the bars, which read as a reel changing — right for a montage of
 * other people's footage.
 */
function cutAccent(kind: SlideKind): CutAccent {
  switch (kind) {
    case 'name':
    case 'prize':
      return 'flash';
    case 'zone':
    case 'fixtures':
      return 'sweep';
    case 'gallery':
      return 'bars';
    default:
      return 'none';
  }
}

/**
 * The Quartier trailer: a fixed 150-second timed sequence.
 *
 * ─── Why it is slides and not scroll ──────────────────────────────────
 * A running time only means something if the piece controls its own
 * pace, so this is a timeline rather than a scrolled page. Each slide
 * holds for its share of the 150 seconds and hands over. The share is
 * computed in `cup-slides.ts` from weights, so the total stays at 150
 * seconds no matter how many zones or players the content grows.
 *
 * ─── Why it still has controls ────────────────────────────────────────
 * Two and a half minutes is long. A viewer who misses the zone their
 * region sits in, or who wants a captain's number again, must not have
 * to watch the whole thing a second time. So it behaves like a story
 * reel: progress segments along the top, tap the left or right of the
 * screen to step, hold or press the button to pause. That vocabulary
 * is already understood by anyone who uses WhatsApp, which is where
 * this link is going to live.
 *
 * Under `prefers-reduced-motion` the timer never starts. The viewer
 * gets the same slides in the same order and steps through them at
 * their own pace, which is the honest reading of the request.
 */

type Phase = 'gate' | 'playing' | 'ended';

export function CupTrailer() {
  const audio = useTrailerAudio();
  const reduced = useReducedMotion() ?? false;

  const plan = useMemo(() => planRuntime(buildSlides(), RUNTIME_MS), []);
  const slides = plan.slides;

  const [phase, setPhase] = useState<Phase>('gate');
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const slide = slides[index];
  const isLast = index >= slides.length - 1;

  // Scrolling on this site is driven by Lenis, not the browser, and
  // LenisProvider documents that `overflow: hidden` alone will not stop
  // a wheel gesture. The trailer owns the viewport for its whole run,
  // so Lenis is stopped for the duration and restarted on unmount.
  useEffect(() => {
    stopLenis();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      startLenis();
    };
  }, []);

  // The clock. One timeout per slide, re-armed on each hand-over.
  // Paused, ended, gated and reduced-motion all simply decline to arm.
  useEffect(() => {
    if (phase !== 'playing' || paused || reduced || !slide) return;
    const id = window.setTimeout(() => {
      if (isLast) setPhase('ended');
      else setIndex((i) => i + 1);
    }, slide.durationMs);
    return () => window.clearTimeout(id);
  }, [phase, paused, reduced, slide, isLast]);

  const begin = useCallback(async () => {
    await audio.start();
    setIndex(0);
    setPhase('playing');
  }, [audio]);

  const step = useCallback(
    (delta: number) => {
      setPhase('playing');
      setIndex((i) => Math.min(slides.length - 1, Math.max(0, i + delta)));
    },
    [slides.length],
  );

  const replay = useCallback(() => {
    setIndex(0);
    setPaused(false);
    setPhase('playing');
  }, []);

  // Keyboard parity with the tap zones. A trailer that can only be
  // driven by touching the screen excludes anyone on a keyboard.
  useEffect(() => {
    if (phase === 'gate') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === ' ') {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, step]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-black text-white">
      <AnimatePresence>
        {phase === 'gate' && <Gate key="gate" reduced={reduced} onBegin={begin} />}
      </AnimatePresence>

      {phase !== 'gate' && slide && (
        <>
          {/* Slides cut rather than cross-fade: the outgoing one leaves
              on the same frame the incoming one arrives, which is what
              lets a cut land on a beat. */}
          <AnimatePresence>
            <motion.div
              key={slide.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0 } }}
              transition={{ duration: reduced ? 0.2 : 0.12 }}
              className="absolute inset-0"
            >
              <SlideBody slide={slide} paused={paused || phase === 'ended'} />
            </motion.div>
          </AnimatePresence>

          {/* And something on the cut itself. An editor never leaves a
              hard cut bare; see `SlideCut` for which kinds get what,
              and why most of them get nothing. */}
          <SlideCut accent={cutAccent(slide.kind)} cutKey={slide.id} />

          {/* One leak, over everything, on an eleven-second cycle. It
              sits above the slides and below the controls so it reads
              as the lens rather than as part of any one slide — which
              is also why it lives here and not in `trailer-slides`. */}
          <LightLeak delay={1.5} />

          <ProgressBar slides={slides} index={index} paused={paused} reduced={reduced} />
          <TapZones onBack={() => step(-1)} onForward={() => step(1)} />

          <Controls
            paused={paused}
            muted={audio.muted}
            atStart={index === 0}
            atEnd={isLast}
            showReplay={phase === 'ended'}
            reduced={reduced}
            onTogglePause={() => setPaused((p) => !p)}
            onToggleMute={audio.toggleMute}
            onBack={() => step(-1)}
            onForward={() => step(1)}
            onReplay={replay}
          />
        </>
      )}
    </div>
  );
}

/**
 * The title card.
 *
 * It exists because no browser starts audio without a gesture, so it
 * may as well be the first shot: black, the crest, one instruction.
 * The wait also covers preloading. The running time is stated, because
 * telling someone it is two and a half minutes before they commit is
 * what stops them leaving at forty seconds.
 */
function Gate({ reduced, onBegin }: { readonly reduced: boolean; readonly onBegin: () => void }) {
  return (
    <motion.div
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-black px-6"
    >
      <motion.span
        aria-hidden
        animate={reduced ? { opacity: 0.3 } : { opacity: [0.18, 0.4, 0.18] }}
        transition={
          reduced ? { duration: 0 } : { duration: 3.4, repeat: Infinity, ease: 'easeInOut' }
        }
        className="pointer-events-none absolute h-[46vmin] w-[46vmin] rounded-full bg-primary/40 blur-[110px]"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        className="relative h-20 w-20 md:h-24 md:w-24"
      >
        <Image src={CUP.crest} alt="" fill sizes="96px" className="object-contain" priority />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.25 }}
        className="relative font-heading text-[clamp(2rem,9vw,4.5rem)] font-light uppercase tracking-[0.1em] text-white"
      >
        {CUP.name}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.45 }}
        className="relative text-center font-heading text-[10.5px] font-semibold uppercase tracking-[0.42em] text-white/45"
      >
        {reduced ? 'Best experienced with sound' : 'Best experienced with sound, in the dark'}
      </motion.p>

      <motion.button
        type="button"
        onClick={onBegin}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="group relative inline-flex items-center gap-4 rounded-full border border-white/25 py-4 pl-5 pr-7 transition-colors duration-500 hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-black transition-transform duration-500 group-hover:scale-110">
          <Play className="h-4 w-4 translate-x-px fill-current" aria-hidden />
        </span>
        <span className="font-heading text-[11px] font-semibold uppercase tracking-[0.34em] text-white">
          {reduced ? 'Enter' : 'Play trailer'}
        </span>
      </motion.button>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1 }}
        className="relative font-heading text-[10px] font-semibold uppercase tracking-[0.3em] text-white/25"
      >
        {Math.round(RUNTIME_MS / 1000)} seconds
      </motion.p>
    </motion.div>
  );
}

/** Story-style segments: filled behind, draining across the current one. */
function ProgressBar({
  slides,
  index,
  paused,
  reduced,
}: {
  readonly slides: readonly { id: string; durationMs: number }[];
  readonly index: number;
  readonly paused: boolean;
  readonly reduced: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex gap-1 p-2.5">
      {slides.map((s, i) => {
        const behind = i < index;
        const current = i === index;
        // A paused or reduced-motion run shows the segment filled
        // rather than creeping, since nothing is counting down.
        const animating = current && !paused && !reduced;
        return (
          <div key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/20">
            <motion.div
              className="h-full bg-white"
              initial={false}
              animate={{ scaleX: behind || current ? 1 : 0 }}
              transition={
                animating ? { duration: s.durationMs / 1000, ease: 'linear' } : { duration: 0 }
              }
              style={{ originX: 0 }}
            />
          </div>
        );
      })}
    </div>
  );
}

/**
 * Invisible back and forward halves, the way a story reel works.
 *
 * Kept out of the tab order on purpose: the visible controls below
 * already give keyboard and screen-reader access to the same two
 * actions, and announcing two unlabelled full-height regions on every
 * slide would be noise rather than help.
 */
function TapZones({
  onBack,
  onForward,
}: {
  readonly onBack: () => void;
  readonly onForward: () => void;
}) {
  return (
    <div aria-hidden className="absolute inset-0 z-30 flex">
      <button type="button" tabIndex={-1} onClick={onBack} className="h-full w-1/3" />
      <button type="button" tabIndex={-1} onClick={onForward} className="h-full flex-1" />
    </div>
  );
}

function Controls({
  paused,
  muted,
  atStart,
  atEnd,
  showReplay,
  reduced,
  onTogglePause,
  onToggleMute,
  onBack,
  onForward,
  onReplay,
}: {
  readonly paused: boolean;
  readonly muted: boolean;
  readonly atStart: boolean;
  readonly atEnd: boolean;
  readonly showReplay: boolean;
  readonly reduced: boolean;
  readonly onTogglePause: () => void;
  readonly onToggleMute: () => void;
  readonly onBack: () => void;
  readonly onForward: () => void;
  readonly onReplay: () => void;
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-40 flex items-center justify-center gap-2.5 p-5">
      <ControlButton label="Previous slide" onClick={onBack} disabled={atStart}>
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </ControlButton>

      {showReplay ? (
        <ControlButton label="Play the trailer again" onClick={onReplay} wide>
          <RotateCcw className="h-4 w-4" aria-hidden />
          <span className="font-heading text-[10px] font-semibold uppercase tracking-[0.26em]">
            Replay
          </span>
        </ControlButton>
      ) : (
        // Nothing advances on its own under reduced motion, so there is
        // nothing to pause.
        !reduced && (
          <ControlButton label={paused ? 'Resume' : 'Pause'} onClick={onTogglePause}>
            {paused ? (
              <Play className="h-4 w-4 translate-x-px fill-current" aria-hidden />
            ) : (
              <Pause className="h-4 w-4 fill-current" aria-hidden />
            )}
          </ControlButton>
        )
      )}

      <ControlButton label="Next slide" onClick={onForward} disabled={atEnd}>
        <ChevronRight className="h-4 w-4" aria-hidden />
      </ControlButton>

      <ControlButton
        label={muted ? 'Unmute the soundtrack' : 'Mute the soundtrack'}
        onClick={onToggleMute}
      >
        {muted ? (
          <VolumeX className="h-4 w-4" aria-hidden />
        ) : (
          <Volume2 className="h-4 w-4" aria-hidden />
        )}
      </ControlButton>
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  disabled,
  wide,
  children,
}: {
  readonly label: string;
  readonly onClick: () => void;
  readonly disabled?: boolean;
  readonly wide?: boolean;
  readonly children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/20 bg-black/55 text-white/75 backdrop-blur-sm transition-colors hover:border-primary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-30 ${
        wide ? 'px-5' : 'w-11'
      }`}
    >
      {children}
    </button>
  );
}
