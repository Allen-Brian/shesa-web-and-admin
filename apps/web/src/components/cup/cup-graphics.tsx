'use client';

import { motion, useReducedMotion } from 'framer-motion';

/**
 * The football vocabulary the trailer draws from.
 *
 * Everything here is SVG or CSS rather than imagery: the page has no
 * photographs yet, it has to stay light on a Cameroonian mobile
 * connection, and vector marks scale to any screen without a second
 * asset. They are also drawable — a line that arrives by being drawn
 * reads as deliberate, where the same line fading in reads as a
 * decoration someone added.
 *
 * Nothing in this file carries information. It is all atmosphere, so
 * every piece is `aria-hidden` and every piece collapses to a static
 * frame under `prefers-reduced-motion`.
 */

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

/**
 * Pitch markings drawn in behind a slide.
 *
 * The halfway line, the centre circle and the two penalty boxes, at a
 * low opacity. It is the single cheapest way to make a dark screen
 * read as football rather than as a generic dark screen.
 */
export function PitchBackdrop({
  /** Seconds before the lines begin drawing. */
  delay = 0,
  className,
}: {
  readonly delay?: number;
  readonly className?: string;
}) {
  const reduced = useReducedMotion() ?? false;

  const draw = (i: number) => ({
    initial: reduced ? { pathLength: 1, opacity: 0 } : { pathLength: 0, opacity: 0 },
    animate: { pathLength: 1, opacity: 1 },
    transition: {
      pathLength: { duration: reduced ? 0 : 1.6, ease: EASE, delay: delay + i * 0.12 },
      opacity: { duration: 0.5, delay: delay + i * 0.12 },
    },
  });

  return (
    <svg
      aria-hidden
      viewBox="0 0 1000 600"
      preserveAspectRatio="xMidYMid slice"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className ?? ''}`}
      // Faded out through the middle third. The markings should frame
      // the slide, not run underneath the words.
      style={{
        maskImage:
          'radial-gradient(85% 70% at 50% 50%, transparent 0%, transparent 34%, black 76%)',
        WebkitMaskImage:
          'radial-gradient(85% 70% at 50% 50%, transparent 0%, transparent 34%, black 76%)',
      }}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={1.4}
        className="text-white/[0.07]"
        vectorEffect="non-scaling-stroke"
      >
        <motion.line x1="500" y1="0" x2="500" y2="600" {...draw(0)} />
        <motion.circle cx="500" cy="300" r="92" {...draw(1)} />
        <motion.circle cx="500" cy="300" r="4" fill="currentColor" {...draw(1)} />
        <motion.rect x="0" y="170" width="150" height="260" {...draw(2)} />
        <motion.rect x="850" y="170" width="150" height="260" {...draw(2)} />
        <motion.rect x="0" y="238" width="55" height="124" {...draw(3)} />
        <motion.rect x="945" y="238" width="55" height="124" {...draw(3)} />
      </g>
    </svg>
  );
}

/**
 * A football, built from the panel seams rather than a photograph.
 *
 * Spins indefinitely, which is the one place an endless loop earns its
 * place here: a stationary ball reads as a logo, and the rotation is
 * what makes it a ball.
 */
export function SpinningBall({
  size = 56,
  className,
}: {
  readonly size?: number;
  readonly className?: string;
}) {
  const reduced = useReducedMotion() ?? false;

  return (
    <motion.svg
      aria-hidden
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      animate={reduced ? { rotate: 0 } : { rotate: 360 }}
      transition={reduced ? { duration: 0 } : { duration: 9, repeat: Infinity, ease: 'linear' }}
    >
      <circle cx="50" cy="50" r="46" className="fill-white" />
      {/* Centre pentagon plus the five that ring it. Rotating copies of
          one shape, so the seams stay even at any size. */}
      <polygon points="50,28 63,38 58,54 42,54 37,38" className="fill-black" />
      {[0, 72, 144, 216, 288].map((angle) => (
        <polygon
          key={angle}
          points="50,2 57,10 52,22 48,22 43,10"
          className="fill-black"
          transform={`rotate(${angle} 50 50)`}
        />
      ))}
      <circle cx="50" cy="50" r="46" fill="none" className="stroke-black/25" strokeWidth={2} />
    </motion.svg>
  );
}

/**
 * Edge shading. Darkens the corners and leaves the middle alone.
 *
 * This replaced a goal-net mesh that tiled diagonal lines across the
 * whole slide. The net looked like football and was unreadable: every
 * headline on this page is centred, and a lattice of 26px diagonals
 * running underneath it competes with the letterforms at exactly the
 * size the eye is trying to resolve.
 *
 * A vignette carries none of that texture, but it does the job the
 * texture was there for — stopping a flat black rectangle reading as a
 * web page — and it actively helps the type instead of fighting it, by
 * pushing contrast toward the centre where the words are.
 */
export function EdgeVignette({ className }: { readonly className?: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute inset-0 ${className ?? ''}`}
      style={{
        background:
          'radial-gradient(120% 95% at 50% 50%, transparent 38%, rgba(0,0,0,0.42) 78%, rgba(0,0,0,0.72) 100%)',
      }}
    />
  );
}

/**
 * Floodlights igniting across the top of a slide.
 *
 * Staggered rather than simultaneous: lights coming up one after
 * another is the sound of a ground filling, where all four at once is
 * just a brighter screen.
 */
export function Floodlights({
  count = 4,
  delay = 0,
}: {
  readonly count?: number;
  readonly delay?: number;
}) {
  const reduced = useReducedMotion() ?? false;

  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const left = ((i + 0.5) / count) * 100;
        return (
          <motion.span
            key={left}
            aria-hidden
            initial={{ opacity: 0 }}
            animate={reduced ? { opacity: 0.6 } : { opacity: [0, 0.95, 0.45, 0.72] }}
            transition={
              reduced
                ? { duration: 0.3 }
                : { duration: 1.1, ease: 'easeOut', delay: delay + i * 0.2 }
            }
            className="pointer-events-none absolute top-[8%] h-48 w-48 -translate-x-1/2 rounded-full bg-white/70 blur-[70px]"
            style={{ left: `${left}%` }}
          />
        );
      })}
    </>
  );
}

/**
 * A chalk-style sweep across the screen, the way a boot leaves a line
 * on a dry pitch. Used as an accent under headings.
 */
export function ChalkSweep({
  delay = 0,
  className,
}: {
  readonly delay?: number;
  readonly className?: string;
}) {
  const reduced = useReducedMotion() ?? false;

  return (
    <motion.span
      aria-hidden
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: reduced ? 0.2 : 0.7, ease: EASE, delay }}
      style={{ originX: 0 }}
      className={`block h-px bg-gradient-to-r from-primary via-primary/40 to-transparent ${className ?? ''}`}
    />
  );
}

/**
 * Faint moving grain. Film stock, basically.
 *
 * A perfectly clean black screen reads as a web page; a little noise
 * on it reads as footage. Kept very low and skipped entirely under
 * reduced motion, where a shimmering backdrop is exactly the wrong
 * thing to offer.
 */
export function Grain() {
  const reduced = useReducedMotion() ?? false;
  if (reduced) return null;

  return (
    <motion.span
      aria-hidden
      animate={{ opacity: [0.035, 0.07, 0.045, 0.065] }}
      transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
      className="pointer-events-none absolute inset-0 mix-blend-screen"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }}
    />
  );
}

/**
 * A light streak crossing a headline, the way a stadium light passes
 * over a trophy.
 *
 * Masked to the text it wraps, so it lights the letterforms rather
 * than drawing a bright bar over them. One pass, on a delay, because
 * a shine that repeats stops reading as light and starts reading as a
 * loading state.
 */
export function Shine({
  children,
  delay = 0,
  className,
}: {
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly delay?: number;
}) {
  const reduced = useReducedMotion() ?? false;
  if (reduced) return <span className={className}>{children}</span>;

  return (
    <span className={`relative inline-block overflow-hidden ${className ?? ''}`}>
      {children}
      <motion.span
        aria-hidden
        initial={{ x: '-120%' }}
        animate={{ x: '120%' }}
        transition={{ duration: 1.1, ease: 'easeInOut', delay }}
        className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/55 to-transparent mix-blend-overlay"
      />
    </span>
  );
}

/**
 * Radiating spokes that fire once, for the moment a figure lands.
 *
 * Cheap: twelve absolutely-positioned lines scaling outward from a
 * point. The effect is an impact, not a firework, so they travel a
 * short distance and fade fast.
 */
export function SparkBurst({
  delay = 0,
  count = 12,
}: {
  readonly delay?: number;
  readonly count?: number;
}) {
  const reduced = useReducedMotion() ?? false;
  if (reduced) return null;

  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
      {Array.from({ length: count }, (_, i) => (
        <motion.span
          key={i}
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: [0, 1, 0], opacity: [0, 0.85, 0] }}
          transition={{ duration: 0.75, ease: 'easeOut', delay: delay + i * 0.012 }}
          className="absolute h-[18vmin] w-px origin-bottom bg-gradient-to-t from-primary to-transparent"
          style={{ transform: `rotate(${(360 / count) * i}deg) translateY(-11vmin)` }}
        />
      ))}
    </span>
  );
}

/**
 * A crowd, as a silhouette of heads along the foot of a slide.
 *
 * Generated rather than photographed, because a real crowd photograph
 * would be of identifiable people. It reads as a terrace at a glance
 * and costs one SVG path.
 */
export function CrowdSilhouette({ className }: { readonly className?: string }) {
  const heads = Array.from({ length: 46 }, (_, i) => {
    const x = i * 22 + ((i * 37) % 11);
    const r = 7 + ((i * 13) % 5);
    const y = 42 + ((i * 29) % 7);
    return `M${x - r} ${y + 16} a${r} ${r} 0 0 1 ${r * 2} 0 z`;
  }).join(' ');

  return (
    <svg
      aria-hidden
      viewBox="0 0 1000 64"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute inset-x-0 bottom-0 h-16 w-full ${className ?? ''}`}
    >
      <path d={heads} className="fill-black/85" />
      <rect x="0" y="56" width="1000" height="8" className="fill-black" />
    </svg>
  );
}

/**
 * A ring thrown outward from a point, for the frame something lands on.
 *
 * The prize slide had one of these written inline and it was the single
 * most effective thing on it: an expanding ring reads as impact in a
 * way a flash does not, because the eye tracks the edge. Pulled out
 * here so the date and the kick-off can land the same way, and so all
 * three stay in step if the timing is tuned.
 *
 * `count` fires a short echo — two rings a beat apart read as a heavier
 * hit than one ring twice as big.
 */
export function PulseRing({
  delay = 0,
  count = 1,
  size = '26vmin',
}: {
  readonly delay?: number;
  readonly count?: number;
  readonly size?: string;
}) {
  const reduced = useReducedMotion() ?? false;
  if (reduced) return null;

  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
      {Array.from({ length: count }, (_, i) => (
        <motion.span
          key={i}
          // Never from zero — a ring that starts at nothing pops rather
          // than expands. 0.25 is small enough to read as a point.
          initial={{ scale: 0.25, opacity: 0.75 }}
          animate={{ scale: 2.6, opacity: 0 }}
          transition={{ duration: 1.1, ease: 'easeOut', delay: delay + i * 0.18 }}
          className="absolute rounded-full border border-primary/70"
          style={{ width: size, height: size }}
        />
      ))}
    </span>
  );
}

/**
 * A bright segment running along a path, like current down a wire.
 *
 * This is what fills a long hold on the bracket. The connectors draw
 * themselves once in the first two seconds and are then finished, which
 * leaves seven seconds of a static diagram; a light travelling from the
 * seeds toward the trophy keeps saying *this is a road* for as long as
 * the slide is up, without anything moving that the eye has to re-read.
 *
 * `strokeDashoffset` is the whole trick: one long gap and one short
 * dash, slid along the path. It animates on the compositor and costs
 * nothing per frame.
 */
export function TravellingLight({
  d,
  delay = 0,
  duration = 1.4,
  repeatDelay = 1.6,
  length = 46,
  className = 'stroke-primary',
  strokeWidth = 3,
}: {
  readonly d: string;
  readonly delay?: number;
  readonly duration?: number;
  readonly repeatDelay?: number;
  readonly length?: number;
  readonly className?: string;
  readonly strokeWidth?: number;
}) {
  const reduced = useReducedMotion() ?? false;
  if (reduced) return null;

  // The gap has to exceed the longest path here, or a second dash
  // appears behind the first.
  const gap = 4000;

  return (
    <motion.path
      aria-hidden
      d={d}
      fill="none"
      strokeLinecap="round"
      strokeWidth={strokeWidth}
      className={className}
      style={{ strokeDasharray: `${length} ${gap}` }}
      initial={{ strokeDashoffset: length, opacity: 0 }}
      animate={{ strokeDashoffset: -gap, opacity: [0, 1, 1, 0] }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        repeatDelay,
        ease: 'linear',
        opacity: { duration, delay, repeat: Infinity, repeatDelay, times: [0, 0.12, 0.8, 1] },
      }}
    />
  );
}

/**
 * The cut between two slides, dressed.
 *
 * ─── Why this exists ──────────────────────────────────────────────────
 * The trailer hard-cuts, on purpose: the outgoing slide leaves on the
 * same frame the incoming one arrives, which is what lets a cut land on
 * a beat rather than dissolving through it. That decision stands.
 *
 * What it was missing is that a hard cut in a film is never *just* a
 * cut — an editor puts something on it. So this fires a single accent
 * over the top of the cut, chosen by what kind of slide is arriving,
 * and is finished inside 400ms every time. The slide underneath is
 * already playing; this only decorates the join.
 *
 * `flash` for an arrival that is supposed to hit (the name, the prize).
 * `sweep` for a change of subject (a new zone, a new section) — a bar
 * crossing the screen, which is the oldest wipe there is. `bars` for
 * the montage, where the join wants to feel mechanical, like a reel
 * changing. Everything else gets nothing, because an effect on every
 * one of thirty cuts is wallpaper.
 */
export type CutAccent = 'none' | 'flash' | 'sweep' | 'bars';

export function SlideCut({
  accent,
  cutKey,
}: {
  readonly accent: CutAccent;
  readonly cutKey: string;
}) {
  const reduced = useReducedMotion() ?? false;
  if (reduced || accent === 'none') return null;

  if (accent === 'flash') {
    return (
      <motion.span
        key={cutKey}
        aria-hidden
        initial={{ opacity: 0.55 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.32, ease: 'easeOut' }}
        className="pointer-events-none absolute inset-0 z-50 bg-white"
      />
    );
  }

  if (accent === 'sweep') {
    return (
      <motion.span
        key={cutKey}
        aria-hidden
        // Crosses and leaves. `x` as a percentage of its own width, so
        // it covers the screen at any size without measuring anything.
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{ duration: 0.42, ease: [0.77, 0, 0.175, 1] }}
        className="pointer-events-none absolute inset-0 z-50 bg-gradient-to-r from-transparent via-primary to-transparent"
      />
    );
  }

  // Four bars pulling back off the screen, two from each side.
  return (
    <span key={cutKey} aria-hidden className="pointer-events-none absolute inset-0 z-50">
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          initial={{ scaleY: 1 }}
          animate={{ scaleY: 0 }}
          transition={{ duration: 0.34, ease: EASE, delay: i * 0.035 }}
          className="absolute top-0 h-full w-1/4 bg-black"
          style={{ left: `${i * 25}%`, originY: i % 2 === 0 ? 0 : 1 }}
        />
      ))}
    </span>
  );
}

/**
 * A slow wash of coloured light across the screen, the way a lens picks
 * one up off a floodlight.
 *
 * Deliberately long and deliberately faint: it is there to stop a dark
 * screen reading as a flat rectangle, not to be noticed. Repeats on a
 * cycle longer than any slide, so it never completes a visible loop.
 */
export function LightLeak({ delay = 0 }: { readonly delay?: number }) {
  const reduced = useReducedMotion() ?? false;
  if (reduced) return null;

  return (
    <motion.span
      aria-hidden
      initial={{ opacity: 0, x: '-30%' }}
      animate={{ opacity: [0, 0.16, 0.05, 0.12, 0], x: ['-30%', '30%'] }}
      transition={{ duration: 11, ease: 'easeInOut', delay, repeat: Infinity }}
      className="pointer-events-none absolute -inset-y-1/4 left-0 w-2/3 rotate-12 bg-gradient-to-r from-transparent via-primary/70 to-transparent blur-3xl"
    />
  );
}

/**
 * A rubber stamp coming down: an overshoot, a settle, and a ring.
 *
 * Used for the date, because a date is the one thing on the page that
 * is literally stamped — on a fixture list, on a ticket, on a poster.
 * It arrives slightly rotated and slightly too big and snaps square,
 * which is the whole read.
 */
export function StampIn({
  children,
  delay = 0,
  className,
}: {
  readonly children: React.ReactNode;
  readonly delay?: number;
  readonly className?: string;
}) {
  const reduced = useReducedMotion() ?? false;

  return (
    <motion.span
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.45, rotate: -7 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={
        reduced
          ? { duration: 0.25, delay }
          : // A spring, because a stamp has mass. Low bounce: this
            // should land hard and stop, not wobble.
            { type: 'spring', duration: 0.65, bounce: 0.28, delay }
      }
      className={className}
    >
      {children}
    </motion.span>
  );
}
