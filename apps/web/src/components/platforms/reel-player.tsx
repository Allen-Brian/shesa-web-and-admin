'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Captions,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { LightLeak, SlideCut, type CutAccent } from '@/components/cup/cup-graphics';
import { startLenis, stopLenis } from '@/components/lenis-provider';

import { PITCH_SCENES, SCREEN_SCENES, baseSeconds, type Scene } from './platforms-content';
import { SceneBody } from './scenes';
import { useReelAudio } from './use-reel-audio';

/**
 * The player behind both platforms reels.
 *
 * It is the cup trailer's engine with the two jobs this brief adds:
 *
 * `pitch` replaces a PowerPoint. It is driven by voiceover — each scene
 * holds for exactly as long as its recorded line, measured on load —
 * and it is presentable by hand: arrow keys and a presenter clicker
 * (which sends PageUp / PageDown) step it, space pauses, C shows the
 * script as captions, F goes full screen. It ends on the closing card.
 *
 * `screen` is for the giant screens at the venue. It loops forever,
 * shows no chrome unless the mouse moves, hides the cursor, and runs
 * the music bed. One click starts it — browsers allow sound only after
 * one — and that click also takes the window full screen.
 */

type Mode = 'pitch' | 'screen';
type Phase = 'gate' | 'playing' | 'ended';

function cutAccent(scene: Scene): CutAccent {
  switch (scene.kind) {
    case 'title':
    case 'close':
      return 'flash';
    case 'platform':
    case 'record':
    case 'revenue':
      return 'sweep';
    default:
      return 'none';
  }
}

function toggleFullscreen() {
  if (typeof document === 'undefined') return;
  if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
  else void document.documentElement.requestFullscreen?.().catch(() => undefined);
}

function formatRuntime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function ReelPlayer({ mode, qrSvg }: { readonly mode: Mode; readonly qrSvg?: string }) {
  const isScreen = mode === 'screen';
  const scenes = isScreen ? SCREEN_SCENES : PITCH_SCENES;
  const audio = useReelAudio({ voiceover: !isScreen });
  const reduced = useReducedMotion() ?? false;

  const [phase, setPhase] = useState<Phase>('gate');
  const [index, setIndex] = useState(0);
  const [loop, setLoop] = useState(0);
  const [paused, setPaused] = useState(false);
  const [captions, setCaptions] = useState(false);
  const [chrome, setChrome] = useState(true);
  const [durations, setDurations] = useState<number[]>(() => scenes.map(baseSeconds));
  const [voCount, setVoCount] = useState<number | null>(isScreen ? 0 : null);

  /** How far into scene `i` the clock had got when it last stopped. */
  const elapsedRef = useRef({ i: -1, ms: 0 });

  const scene = scenes[index];
  const isLast = index >= scenes.length - 1;
  const totalSeconds = useMemo(() => durations.reduce((a, b) => a + b, 0), [durations]);

  // Measure the voiceover as soon as the page opens. Loading metadata
  // needs no gesture, so by the time anyone presses play the running
  // time on the gate is the real one.
  const { preload } = audio;
  useEffect(() => {
    if (isScreen) return;
    let live = true;
    void preload(scenes).then((found) => {
      if (!live) return;
      setVoCount(found.size);
      setDurations(
        scenes.map((s) => {
          const vo = found.get(s.id);
          return vo ? Math.max(4, vo + 1.2) : baseSeconds(s);
        }),
      );
    });
    return () => {
      live = false;
    };
  }, [isScreen, preload, scenes]);

  // The reel owns the viewport. See the cup trailer for why Lenis has to
  // be stopped as well as the body's overflow.
  useEffect(() => {
    stopLenis();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      startLenis();
    };
  }, []);

  const indexRef = useRef(index);
  indexRef.current = index;
  const advance = useCallback(() => {
    const i = indexRef.current;
    if (i < scenes.length - 1) setIndex(i + 1);
    else if (isScreen) {
      setLoop((l) => l + 1);
      setIndex(0);
    } else setPhase('ended');
  }, [isScreen, scenes.length]);

  // The clock, with the voiceover riding on it. Pausing records how far
  // in the scene had got, so resuming continues both the hold and the
  // clip from the same point rather than starting the line again.
  const { playClip, whoosh } = audio;
  useEffect(() => {
    if (phase !== 'playing' || paused || reduced || !scene) return;
    const totalMs = (durations[index] ?? baseSeconds(scene)) * 1000;
    const prior = elapsedRef.current.i === index ? elapsedRef.current.ms : 0;
    const t0 = performance.now();
    const stopClip = playClip(scene.id, prior / 1000);
    const id = window.setTimeout(advance, Math.max(0, totalMs - prior));
    return () => {
      window.clearTimeout(id);
      stopClip();
      elapsedRef.current = { i: index, ms: prior + performance.now() - t0 };
    };
  }, [phase, paused, reduced, scene, index, durations, advance, playClip]);

  // A section cut gets the whoosh under it.
  useEffect(() => {
    if (phase === 'playing' && scene && cutAccent(scene) !== 'none') whoosh();
  }, [phase, scene, whoosh]);

  const begin = useCallback(async () => {
    if (isScreen) toggleFullscreen();
    await audio.start();
    elapsedRef.current = { i: -1, ms: 0 };
    // `?at=7` starts on scene 7 — for rehearsing one section, or picking
    // the pitch back up after an interruption.
    const at = Number(new URLSearchParams(window.location.search).get('at'));
    setIndex(Number.isInteger(at) && at >= 1 && at <= scenes.length ? at - 1 : 0);
    setPhase('playing');
  }, [audio, isScreen, scenes.length]);

  const step = useCallback(
    (delta: number) => {
      elapsedRef.current = { i: -1, ms: 0 };
      setPhase('playing');
      setIndex((i) => Math.min(scenes.length - 1, Math.max(0, i + delta)));
    },
    [scenes.length],
  );

  const replay = useCallback(() => {
    elapsedRef.current = { i: -1, ms: 0 };
    setIndex(0);
    setLoop((l) => l + 1);
    setPaused(false);
    setPhase('playing');
  }, []);

  // Keyboard, including what a presenter clicker sends.
  useEffect(() => {
    if (phase === 'gate') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') step(1);
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') step(-1);
      else if (e.key === ' ' || e.key === 'k') {
        e.preventDefault();
        setPaused((p) => !p);
      } else if (e.key === 'f') toggleFullscreen();
      else if (e.key === 'c') setCaptions((c) => !c);
      else if (e.key === 'm') audio.toggleMute();
      else if (e.key === 'Home') replay();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, step, replay, audio]);

  // Chrome and cursor hide after a few idle seconds — immediately on the
  // venue screen, after a moment in the pitch.
  useEffect(() => {
    if (phase === 'gate') return;
    let id = 0;
    const wake = () => {
      setChrome(true);
      window.clearTimeout(id);
      id = window.setTimeout(() => setChrome(false), isScreen ? 2000 : 3500);
    };
    wake();
    window.addEventListener('mousemove', wake);
    window.addEventListener('touchstart', wake);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener('mousemove', wake);
      window.removeEventListener('touchstart', wake);
    };
  }, [phase, isScreen]);

  const seconds = scene ? (durations[index] ?? baseSeconds(scene)) : 0;

  return (
    <div
      className={`fixed inset-0 overflow-hidden bg-black text-white ${
        phase !== 'gate' && !chrome ? 'cursor-none' : ''
      }`}
    >
      <AnimatePresence>
        {phase === 'gate' && (
          <Gate
            key="gate"
            mode={mode}
            runtime={totalSeconds}
            voCount={voCount}
            voTotal={scenes.filter((s) => s.vo).length}
            onBegin={begin}
          />
        )}
      </AnimatePresence>

      {phase !== 'gate' && scene && (
        <>
          <AnimatePresence>
            <motion.div
              key={`${scene.id}-${loop}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0 } }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0"
            >
              <SceneBody
                scene={scene}
                seconds={seconds}
                paused={paused || phase === 'ended'}
                big={isScreen}
                qrSvg={qrSvg}
              />
            </motion.div>
          </AnimatePresence>

          <SlideCut accent={cutAccent(scene)} cutKey={`${scene.id}-${loop}`} />
          <LightLeak delay={1.5} />

          {/* The builder's mark: present on every scene, never competing. */}
          <p className="pointer-events-none absolute bottom-3 right-4 z-20 font-heading text-[clamp(8px,0.7vw,0.8rem)] font-semibold uppercase tracking-[0.3em] text-white/30 md:bottom-5 md:right-6">
            Built by <span className="text-white/50">DIRA</span>
          </p>

          {!isScreen && (
            <ProgressBar
              durations={durations}
              index={index}
              paused={paused || phase === 'ended'}
              reduced={reduced}
              runKey={loop}
            />
          )}

          {!isScreen && captions && scene.vo && (
            <div className="pointer-events-none absolute inset-x-0 bottom-20 z-40 flex justify-center px-6">
              <p className="max-w-4xl rounded-md bg-black/75 px-4 py-2 text-center font-sans text-[clamp(0.85rem,1.4vw,1.3rem)] font-light leading-snug text-white backdrop-blur-sm">
                {scene.vo}
              </p>
            </div>
          )}

          {!isScreen && <TapZones onBack={() => step(-1)} onForward={() => step(1)} />}

          <motion.div
            initial={false}
            animate={{ opacity: chrome || phase === 'ended' ? 1 : 0 }}
            transition={{ duration: 0.4 }}
            className={chrome || phase === 'ended' ? '' : 'pointer-events-none'}
          >
            <Controls
              paused={paused}
              muted={audio.muted}
              captions={captions}
              showCaptions={!isScreen}
              atStart={index === 0}
              atEnd={isLast && !isScreen}
              showReplay={phase === 'ended'}
              reduced={reduced}
              counter={`${index + 1} / ${scenes.length}`}
              onTogglePause={() => setPaused((p) => !p)}
              onToggleMute={audio.toggleMute}
              onToggleCaptions={() => setCaptions((c) => !c)}
              onBack={() => step(-1)}
              onForward={() => step(1)}
              onReplay={replay}
            />
          </motion.div>
        </>
      )}
    </div>
  );
}

function Gate({
  mode,
  runtime,
  voCount,
  voTotal,
  onBegin,
}: {
  readonly mode: Mode;
  readonly runtime: number;
  readonly voCount: number | null;
  readonly voTotal: number;
  readonly onBegin: () => void;
}) {
  const isScreen = mode === 'screen';
  return (
    <motion.div
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-7 bg-black px-6"
    >
      <motion.span
        aria-hidden
        animate={{ opacity: [0.18, 0.4, 0.18] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
        className="pointer-events-none absolute h-[46vmin] w-[46vmin] rounded-full bg-primary/40 blur-[110px]"
      />
      <motion.img
        src="/shesa.png"
        alt=""
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        className="relative h-20 w-20 object-contain md:h-24 md:w-24"
      />
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.25 }}
        className="relative text-center font-heading text-[clamp(2rem,8vw,4.5rem)] font-light uppercase tracking-[0.1em] text-white"
      >
        SHESA <span className="text-primary">Digital</span>
      </motion.h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.45 }}
        className="relative text-center font-heading text-[10.5px] font-semibold uppercase tracking-[0.42em] text-white/45"
      >
        {isScreen ? 'Venue display · loops continuously' : 'The six platforms · presentation'}
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
          {isScreen ? 'Start display' : 'Play presentation'}
        </span>
      </motion.button>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1 }}
        className="relative flex flex-col items-center gap-2 text-center font-heading text-[10px] font-semibold uppercase tracking-[0.3em] text-white/30"
      >
        <span>
          {isScreen
            ? `${formatRuntime(runtime)} loop · goes full screen`
            : `${formatRuntime(runtime)} running time`}
        </span>
        {!isScreen && (
          <span>
            {voCount === null
              ? 'Checking voiceover…'
              : voCount === 0
                ? 'No voiceover yet · C shows the script'
                : `Voiceover ${voCount} / ${voTotal} scenes`}
          </span>
        )}
        <span className="hidden text-white/20 md:block">
          {isScreen
            ? 'F full screen · M mute'
            : '← → or clicker to step · Space pause · F full screen · C captions'}
        </span>
      </motion.div>
    </motion.div>
  );
}

/**
 * Story-style segments. A CSS animation rather than a tween, so pausing
 * freezes the fill where it is and resuming carries on from there.
 */
function ProgressBar({
  durations,
  index,
  paused,
  reduced,
  runKey,
}: {
  readonly durations: readonly number[];
  readonly index: number;
  readonly paused: boolean;
  readonly reduced: boolean;
  readonly runKey: number;
}) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex gap-1 p-2.5">
      <style>{`@keyframes reel-fill{from{transform:scaleX(0)}to{transform:scaleX(1)}}`}</style>
      {durations.map((d, i) => (
        <div key={i} className="h-0.5 overflow-hidden rounded-full bg-white/20" style={{ flex: d }}>
          <div
            key={i === index ? `${runKey}-${index}` : undefined}
            className="h-full origin-left bg-white"
            style={
              i < index
                ? { transform: 'scaleX(1)' }
                : i === index
                  ? reduced
                    ? { transform: 'scaleX(1)' }
                    : {
                        animation: `reel-fill ${d}s linear forwards`,
                        animationPlayState: paused ? 'paused' : 'running',
                      }
                  : { transform: 'scaleX(0)' }
            }
          />
        </div>
      ))}
    </div>
  );
}

function TapZones({
  onBack,
  onForward,
}: {
  readonly onBack: () => void;
  readonly onForward: () => void;
}) {
  return (
    <div aria-hidden className="absolute inset-0 z-30 flex">
      <button
        type="button"
        tabIndex={-1}
        onClick={onBack}
        className="h-full w-1/4 cursor-[inherit]"
      />
      <span className="h-full flex-1" />
      <button
        type="button"
        tabIndex={-1}
        onClick={onForward}
        className="h-full w-1/4 cursor-[inherit]"
      />
    </div>
  );
}

function Controls(props: {
  readonly paused: boolean;
  readonly muted: boolean;
  readonly captions: boolean;
  readonly showCaptions: boolean;
  readonly atStart: boolean;
  readonly atEnd: boolean;
  readonly showReplay: boolean;
  readonly reduced: boolean;
  readonly counter: string;
  readonly onTogglePause: () => void;
  readonly onToggleMute: () => void;
  readonly onToggleCaptions: () => void;
  readonly onBack: () => void;
  readonly onForward: () => void;
  readonly onReplay: () => void;
}) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-40 flex items-center justify-center gap-2.5 p-5">
      <ControlButton label="Previous scene" onClick={props.onBack} disabled={props.atStart}>
        <ChevronLeft className="h-4 w-4" aria-hidden />
      </ControlButton>
      {props.showReplay ? (
        <ControlButton label="Play again" onClick={props.onReplay} wide>
          <RotateCcw className="h-4 w-4" aria-hidden />
          <span className="font-heading text-[10px] font-semibold uppercase tracking-[0.26em]">
            Replay
          </span>
        </ControlButton>
      ) : (
        !props.reduced && (
          <ControlButton label={props.paused ? 'Resume' : 'Pause'} onClick={props.onTogglePause}>
            {props.paused ? (
              <Play className="h-4 w-4 translate-x-px fill-current" aria-hidden />
            ) : (
              <Pause className="h-4 w-4 fill-current" aria-hidden />
            )}
          </ControlButton>
        )
      )}
      <ControlButton label="Next scene" onClick={props.onForward} disabled={props.atEnd}>
        <ChevronRight className="h-4 w-4" aria-hidden />
      </ControlButton>
      <span className="px-2 font-heading text-[10px] font-semibold tabular-nums tracking-[0.2em] text-white/45">
        {props.counter}
      </span>
      <ControlButton label={props.muted ? 'Unmute' : 'Mute'} onClick={props.onToggleMute}>
        {props.muted ? (
          <VolumeX className="h-4 w-4" aria-hidden />
        ) : (
          <Volume2 className="h-4 w-4" aria-hidden />
        )}
      </ControlButton>
      {props.showCaptions && (
        <ControlButton
          label={props.captions ? 'Hide captions' : 'Show captions'}
          onClick={props.onToggleCaptions}
          active={props.captions}
        >
          <Captions className="h-4 w-4" aria-hidden />
        </ControlButton>
      )}
      <ControlButton label="Full screen" onClick={toggleFullscreen}>
        <Maximize className="h-4 w-4" aria-hidden />
      </ControlButton>
    </div>
  );
}

function ControlButton({
  label,
  onClick,
  disabled,
  wide,
  active,
  children,
}: {
  readonly label: string;
  readonly onClick: () => void;
  readonly disabled?: boolean;
  readonly wide?: boolean;
  readonly active?: boolean;
  readonly children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-full border bg-black/55 backdrop-blur-sm transition-colors hover:border-primary hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-30 ${
        active ? 'border-primary text-white' : 'border-white/20 text-white/75'
      } ${wide ? 'px-5' : 'w-11'}`}
    >
      {children}
    </button>
  );
}
