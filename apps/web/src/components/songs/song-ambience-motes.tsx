'use client';

import { useEffect, useRef } from 'react';

/**
 * Light through high windows, and what drifts in it.
 *
 * ─── Why this exists at all ────────────────────────────────────────────
 * The first ambience was four blurred gradients on `transform` keyframes.
 * It was correctly described as "just the fade blur background": a slow
 * scale-and-translate of a soft blob reads as breathing, not as movement.
 * Nothing crosses the frame, so there is nothing for the eye to follow.
 *
 * The repertoire is largely Catholic, so the reference is a nave in the
 * late afternoon: shafts of light coming down at an angle, swinging by a
 * degree or two as the hour goes, and incense and dust turning slowly
 * upward through them. That has real travel in it, which is the thing the
 * gradients could not give at any strength.
 *
 * ─── Why canvas here, when the wash is CSS ─────────────────────────────
 * The wash underneath is four gradients and belongs in CSS, where it
 * costs nothing. Sixty independently-drifting motes do not: as DOM they
 * would be sixty composited layers, and their paths — a rise with a sine
 * sway and a wrap — are not expressible as a keyframe you can write once
 * and share. One canvas and one rAF is the cheaper half of that trade.
 *
 * The loop is paid for only while it earns: it stops when the music
 * stops, and when the tab is hidden.
 *
 * ─── Additive light does not work on paper ─────────────────────────────
 * The instinct for glow is `globalCompositeOperation = 'lighter'`. On a
 * white page that is a no-op — white plus light is white. So everything
 * here is drawn as low-alpha *tint* over the page, and the light reads as
 * light because of where it falls and how it moves, not because it is
 * brighter than its ground.
 */

/** Stained glass: old gold, the brand's crimson, and a cold window blue. */
const TINTS: readonly [number, number, number][] = [
  [198, 154, 74],
  [139, 21, 51],
  [64, 96, 140],
];

interface Mote {
  /** 0..1 of width and height, so a resize does not teleport anything. */
  x: number;
  y: number;
  radius: number;
  /** Fraction of the height climbed per second. Slow: a full rise is minutes. */
  rise: number;
  /** Horizontal sway, in fractions of width. */
  sway: number;
  /** Seconds, so no two motes sway together. */
  phase: number;
  swayRate: number;
  alpha: number;
  tint: number;
}

interface Shaft {
  /** Where it crosses the top edge, in fractions of width. */
  origin: number;
  width: number;
  tiltDeg: number;
  swingDeg: number;
  swingSeconds: number;
  alpha: number;
  tint: number;
}

/**
 * Fixed, not random.
 *
 * A seeded arrangement renders the same on the server-adjacent first
 * paint as on every later one, and — more usefully — it is a composition
 * somebody chose rather than whatever `Math.random` produced on the day.
 * The three shafts are spaced so they do not all cross the headline.
 */
const SHAFTS: readonly Shaft[] = [
  { origin: 0.16, width: 0.2, tiltDeg: 14, swingDeg: 2.4, swingSeconds: 47, alpha: 0.1, tint: 0 },
  { origin: 0.54, width: 0.28, tiltDeg: 9, swingDeg: 1.8, swingSeconds: 61, alpha: 0.075, tint: 0 },
  {
    origin: 0.85,
    width: 0.22,
    tiltDeg: 17,
    swingDeg: 3.1,
    swingSeconds: 53,
    alpha: 0.055,
    tint: 2,
  },
];

/** One mote, drawn once into a sprite and stamped from then on. */
function makeSprite(tint: readonly [number, number, number]): HTMLCanvasElement {
  const size = 64;
  const sprite = document.createElement('canvas');
  sprite.width = size;
  sprite.height = size;

  const g = sprite.getContext('2d');
  if (g) {
    const half = size / 2;
    const grad = g.createRadialGradient(half, half, 0, half, half, half);
    const [r, gr, b] = tint;
    grad.addColorStop(0, `rgba(${r}, ${gr}, ${b}, 1)`);
    grad.addColorStop(0.45, `rgba(${r}, ${gr}, ${b}, 0.42)`);
    grad.addColorStop(1, `rgba(${r}, ${gr}, ${b}, 0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, size, size);
  }
  return sprite;
}

/**
 * A small deterministic generator.
 *
 * `Math.random` would rearrange the motes on every mount — including on
 * a resize, which re-seeds — and a dust cloud that reshuffles when you
 * rotate your phone is a glitch, not weather.
 */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

interface Controls {
  readonly start: () => void;
  readonly windDown: () => void;
}

export function SongAmbienceMotes({ active }: { readonly active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  /**
   * Set up once and driven by the effect below, rather than keying the
   * whole effect on `active` — that would tear the canvas down and re-seed
   * the dust on every pause, so the cloud rearranged itself each time the
   * music stopped.
   */
  const controlsRef = useRef<Controls | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const sprites = TINTS.map(makeSprite);

    let width = 0;
    let height = 0;
    let motes: Mote[] = [];

    const seedMotes = () => {
      // Density by area, so a phone is not given a desktop's worth of
      // dust in a tenth of the space.
      const count = Math.max(18, Math.min(70, Math.round((width * height) / 26_000)));
      const rand = seeded(0x5eed);

      motes = Array.from({ length: count }, () => ({
        x: rand(),
        y: rand(),
        radius: 1.5 + rand() * 5.5,
        // A full rise takes between roughly two and six minutes.
        rise: 0.0028 + rand() * 0.0062,
        sway: 0.012 + rand() * 0.03,
        phase: rand() * 100,
        swayRate: 0.05 + rand() * 0.09,
        alpha: 0.16 + rand() * 0.36,
        tint: Math.floor(rand() * TINTS.length),
      }));
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      // Capped at 2: past that a full-bleed canvas costs real memory for
      // a picture that is entirely soft edges.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedMotes();
    };

    const drawShafts = (seconds: number) => {
      for (const shaft of SHAFTS) {
        const swing =
          Math.sin((seconds / shaft.swingSeconds) * Math.PI * 2 + shaft.origin * 6) *
          shaft.swingDeg;
        const angle = ((shaft.tiltDeg + swing) * Math.PI) / 180;
        const beamWidth = shaft.width * width;
        // Long enough that the far end is always past the bottom corner,
        // whatever the tilt.
        const beamLength = Math.hypot(width, height) * 1.6;
        const [r, g, b] = TINTS[shaft.tint] ?? TINTS[0]!;

        ctx.save();
        ctx.translate(shaft.origin * width, -height * 0.15);
        ctx.rotate(angle);

        // Across the beam: transparent at both edges, so it has no sides.
        const across = ctx.createLinearGradient(-beamWidth / 2, 0, beamWidth / 2, 0);
        across.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
        across.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${shaft.alpha})`);
        across.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

        ctx.fillStyle = across;
        ctx.fillRect(-beamWidth / 2, 0, beamWidth, beamLength);
        ctx.restore();
      }

      // Down the page: erase the beams towards the bottom, where the
      // lyrics are. Done as one pass over all three rather than per beam,
      // which also stops their overlaps from stacking into a hard edge.
      const fade = ctx.createLinearGradient(0, 0, 0, height);
      fade.addColorStop(0, 'rgba(0, 0, 0, 0)');
      fade.addColorStop(0.55, 'rgba(0, 0, 0, 0.55)');
      fade.addColorStop(1, 'rgba(0, 0, 0, 1)');

      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = fade;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    };

    const drawMotes = (seconds: number) => {
      for (const mote of motes) {
        // Rising, and wrapped back under the bottom edge. The modulo is on
        // distance travelled rather than on position, so a mote never
        // jumps when the canvas is resized.
        const travelled = (mote.y - seconds * mote.rise) % 1;
        const y = (travelled < 0 ? travelled + 1 : travelled) * height;
        const x =
          (mote.x + Math.sin((seconds * mote.swayRate + mote.phase) * Math.PI * 2) * mote.sway) *
          width;

        // Fade in off the bottom and out at the top, so nothing appears
        // or vanishes at a hard edge.
        const depth = 1 - y / height;
        const edge = Math.min(1, depth * 4, (1 - depth) * 4 + 0.25);

        const sprite = sprites[mote.tint] ?? sprites[0]!;
        const size = mote.radius * 2;

        ctx.globalAlpha = mote.alpha * edge;
        ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
      }
      ctx.globalAlpha = 1;
    };

    const render = (seconds: number) => {
      ctx.clearRect(0, 0, width, height);
      drawShafts(seconds);
      drawMotes(seconds);
    };

    resize();

    // Reduced motion still gets the picture — the shafts, the dust — it
    // simply does not move. Someone asked for less motion, not for a
    // blank page, and a single frame costs one paint in total.
    if (reduceMotion) {
      render(0);
      const observer = new ResizeObserver(() => {
        resize();
        render(0);
      });
      observer.observe(canvas);
      return () => observer.disconnect();
    }

    let frame = 0;
    let startedAt: number | null = null;
    /** Kept across pauses so the composition resumes rather than restarts. */
    let elapsed = 0;
    /** When set, the loop stops at this timestamp. */
    let stopAt: number | null = null;

    const halt = (seconds: number) => {
      elapsed = seconds;
      startedAt = null;
      if (frame !== 0) cancelAnimationFrame(frame);
      frame = 0;
    };

    const loop = (now: number) => {
      if (startedAt === null) startedAt = now;
      const seconds = elapsed + (now - startedAt) / 1000;

      render(seconds);

      // Keep drawing a little past the last note: the wash above takes
      // ~1.8s to fade out, and motion freezing mid-fade reads as a stall.
      if (stopAt !== null && now >= stopAt) {
        halt(seconds);
        return;
      }
      frame = requestAnimationFrame(loop);
    };

    const start = () => {
      stopAt = null;
      if (frame !== 0) return;
      startedAt = null;
      frame = requestAnimationFrame(loop);
    };

    /** Run on for the length of the wash's fade, then stop. */
    const windDown = () => {
      if (frame === 0) return;
      stopAt = performance.now() + 2200;
    };

    controlsRef.current = { start, windDown };

    const onVisibility = () => {
      if (document.hidden) {
        // Nothing to look at, so nothing to pay for. rAF is usually
        // throttled in a background tab anyway, but "usually" is not a
        // guarantee worth a render loop. `elapsed` is banked first, so
        // coming back resumes the composition mid-drift rather than
        // snapping it forward by however long the tab was away.
        if (startedAt !== null) halt(elapsed + (performance.now() - startedAt) / 1000);
      } else if (activeRef.current) {
        start();
      }
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    document.addEventListener('visibilitychange', onVisibility);

    if (activeRef.current) start();

    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      controlsRef.current = null;
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    if (active) controls.start();
    else controls.windDown();
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
