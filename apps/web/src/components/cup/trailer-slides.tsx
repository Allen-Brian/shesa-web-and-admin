'use client';

import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  AMBIANCE,
  ARCHIVE_DEFAULT_FOCUS,
  ARCHIVE_IMAGE_SECONDS,
  CUP,
  FIXTURES,
  buildArchiveReel,
  capitalise,
  numberWord,
} from './cup-content';
import type { ArchiveItem, Zone } from './cup-content';
import type { TimedSlide } from './cup-slides';
import {
  ChalkSweep,
  CrowdSilhouette,
  EdgeVignette,
  Floodlights,
  Grain,
  PitchBackdrop,
  PulseRing,
  Shine,
  SparkBurst,
  SpinningBall,
  StampIn,
  TravellingLight,
} from './cup-graphics';
import { PlayerReel } from './player-reel';
import { useIsNarrow } from './use-viewport';
import { useCupPoll } from './use-cup-poll';

/**
 * One slide per screen, each doing exactly one job.
 *
 * Nothing here owns its own timing. The engine decides when a slide
 * arrives and when it leaves; a slide only animates what happens
 * inside its own window. The reel is the single exception, because it
 * has to divide its slide's duration between five players, and it is
 * handed that duration rather than deciding it.
 */

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

/** Kick-off is always stated in the venue's own time. */
const VENUE_TIME_ZONE = 'Africa/Douala';

function venueTime(options: Intl.DateTimeFormatOptions): string {
  return new Date(CUP.kickOff).toLocaleString('en-GB', {
    timeZone: VENUE_TIME_ZONE,
    ...options,
  });
}

export function SlideBody({
  slide,
  paused,
}: {
  readonly slide: TimedSlide;
  readonly paused: boolean;
}) {
  switch (slide.kind) {
    case 'cold-open':
      return <ColdOpenSlide text={slide.text ?? ''} />;
    case 'name':
      return <NameSlide />;
    case 'prize':
      return <PrizeSlide />;
    case 'ambiance':
      return slide.ambiance ? <AmbianceSlide card={slide.ambiance} /> : null;
    case 'fixtures':
      return <FixturesSlide />;
    case 'road':
      return <RoadSlide />;
    case 'finale':
      return slide.ambiance ? <FinaleSlide card={slide.ambiance} /> : null;
    case 'zone':
      return slide.zone ? <ZoneSlide zone={slide.zone} /> : null;
    case 'players':
      return slide.zone ? (
        <section className="absolute inset-0 flex flex-col gap-3 px-3 py-16 md:px-6 md:py-20">
          <header className="shrink-0 text-center">
            <p className="font-heading text-[10px] font-semibold uppercase tracking-[0.42em] text-primary">
              {slide.zone.designation} · {slide.zone.captaincy}
            </p>
            <h2 className="mt-2 font-heading text-[clamp(1.1rem,3.4vw,2rem)] font-light uppercase tracking-[0.1em] text-white">
              The ones to watch
            </h2>
          </header>
          <div className="min-h-0 flex-1">
            <PlayerReel
              zone={slide.zone}
              durationMs={slide.durationMs}
              slideId={slide.id}
              paused={paused}
            />
          </div>
        </section>
      ) : null;
    case 'stadium':
      return <StadiumSlide durationMs={slide.durationMs} paused={paused} />;
    case 'gallery':
      return <GallerySlide paused={paused} />;
    case 'date':
      return <DateSlide />;
    case 'time':
      return <TimeSlide />;
    case 'contacts':
      return <ContactsSlide />;
  }
}

/** Centres a slide's content and gives it a consistent entrance. */
function Stage({
  children,
  className,
}: {
  readonly children: React.ReactNode;
  readonly className?: string;
}) {
  return (
    <section
      className={`absolute inset-0 flex flex-col items-center justify-center px-6 text-center ${className ?? ''}`}
    >
      {children}
    </section>
  );
}

/**
 * The cold open: three statements, two and a quarter seconds each.
 *
 * These are the first thing anybody sees and they had no animation at
 * all — three static lines of text, cut to in silence. A trailer that
 * opens on a still frame has given away its tension before it starts.
 *
 * Each line now sets itself letter by letter out of a wide track, so
 * the words tighten into place rather than appearing. That is the one
 * effect that suits a cold open: it reads as something being stated,
 * and it works at any length without a layout change, because the
 * track is a per-character transform and not a width.
 *
 * The rule under it draws in the gap before the next card, which
 * carries the eye across the cut.
 */
function ColdOpenSlide({ text }: { readonly text: string }) {
  const reduced = useReducedMotion() ?? false;
  const chars = [...text];

  return (
    <Stage>
      <EdgeVignette />
      <Grain />

      <p
        aria-label={text}
        className="relative flex flex-wrap justify-center font-heading text-[clamp(1.1rem,4.4vw,2.2rem)] font-light tracking-[0.42em] text-white"
      >
        {chars.map((char, i) => (
          <motion.span
            key={`${char}-${i}`}
            aria-hidden
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18, scale: 1.3 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: reduced ? 0.3 : 0.7,
              ease: EASE,
              // 34ms apart: inside the 30–80ms stagger band, and fast
              // enough that eleven characters are all home by 500ms.
              delay: reduced ? 0 : i * 0.034,
            }}
            // A space with no width collapses in a flex row.
            className={char === ' ' ? 'w-[0.4em]' : undefined}
          >
            {char === ' ' ? ' ' : char}
          </motion.span>
        ))}
      </p>

      <ChalkSweep delay={0.55} className="relative mt-5 w-28 md:w-44" />
    </Stage>
  );
}

/**
 * The money shot: crest, white flash and a letter-spacing collapse all
 * landing on the same frame. Individually each is a cliché; together,
 * on one frame, they read as an impact.
 */
function NameSlide() {
  const reduced = useReducedMotion() ?? false;

  return (
    <Stage>
      <PitchBackdrop delay={0.35} />
      <Grain />
      {!reduced && (
        <motion.span
          aria-hidden
          initial={{ opacity: 0.85 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="pointer-events-none fixed inset-0 z-10 bg-white"
        />
      )}

      <motion.div
        initial={reduced ? { opacity: 0 } : { scale: 1.25, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: reduced ? 0.3 : 0.24, ease: EASE }}
        className="relative mb-6 h-20 w-20 md:h-28 md:w-28"
      >
        <Image src={CUP.crest} alt="" fill sizes="112px" className="object-contain" priority />
      </motion.div>

      <motion.h1
        initial={reduced ? { opacity: 0 } : { scale: 1.15, letterSpacing: '0.38em', opacity: 0 }}
        animate={{ scale: 1, letterSpacing: '0.04em', opacity: 1 }}
        transition={{ duration: reduced ? 0.3 : 0.26, ease: EASE }}
        className="font-heading text-[clamp(2.6rem,13vw,9rem)] font-light uppercase leading-[0.95] text-white"
      >
        <Shine delay={0.42}>{CUP.name}</Shine>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
        className="mt-5 font-heading text-[11px] font-semibold uppercase tracking-[0.5em] text-primary"
      >
        {CUP.edition}
      </motion.p>
    </Stage>
  );
}

/** Winner takes all. There is no runner-up line, because there is no purse. */
/**
 * The prize.
 *
 * The figure is the single most quotable thing in the trailer, so it
 * is the only piece of type set bold — everything else on the page is
 * light, which is what makes this read as the number that matters
 * rather than another heading.
 *
 * The sequence lands rather than appears: the counter runs up, and on
 * the frame it finishes, four things fire together — the figure slams
 * down from slightly too large, a shockwave ring expands out of it,
 * the spark burst fires, and the bloom behind it flares. Separately
 * each is a cliché; on the same frame they read as an impact.
 */
function PrizeSlide() {
  const reduced = useReducedMotion() ?? false;
  const narrow = useIsNarrow();
  const [landed, setLanded] = useState(false);

  const words = CUP.prize.headline;
  const PER = 0.26;
  const lastAt = 0.3 + (words.length - 1) * PER;

  useEffect(() => {
    const id = window.setTimeout(() => setLanded(true), reduced ? 0 : (lastAt + 0.35) * 1000);
    return () => window.clearTimeout(id);
  }, [reduced, lastAt]);

  return (
    /* ─── The one slide that inverts ──────────────────────────────────
       Every other slide is white on black. This one is white on
       burgundy, so it is the single frame you could identify from
       across a room with the sound off.

       ─── And no number on it ────────────────────────────────────────
       It used to be the prize figure in the largest type in the
       trailer. An advert that tells you the number has answered the
       only question it had to make you ask — so the slide now states
       the stake instead, and the amount lives in `cup-content.ts`
       without being rendered.

       That also retires the overflow this slide kept having. Three
       short words stack and wrap on any screen; a seven-character
       figure had to be measured against the viewport every time. */
    <section className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-primary px-6 text-center">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 45%, rgba(255,255,255,0.14) 0%, transparent 55%), radial-gradient(130% 100% at 50% 50%, transparent 40%, rgba(0,0,0,0.45) 100%)',
        }}
      />
      <Grain />

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="relative font-heading text-[clamp(9px,2.6vw,11px)] font-semibold uppercase tracking-[0.5em] text-white/70"
      >
        One prize
      </motion.p>

      {/* One word per line, each landing on its own beat. Stacked
          rather than set as a sentence because the three words are
          the three beats — and because stacked words cannot overflow
          a phone the way a long line can. */}
      <h2 className="relative mt-4 flex flex-col items-center gap-0.5">
        {words.map((word, i) => (
          <motion.span
            key={word}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: '45%', scale: 1.12 }}
            animate={{ opacity: 1, y: '0%', scale: 1 }}
            transition={
              reduced
                ? { duration: 0.25, delay: i * 0.08 }
                : { type: 'spring', duration: 0.6, bounce: 0.24, delay: 0.3 + i * PER }
            }
            className="font-heading text-[clamp(2.6rem,17vw,8rem)] font-bold uppercase leading-[0.86] text-white"
          >
            {word}
          </motion.span>
        ))}
      </h2>

      {/* White on burgundy, so the impact is white too — a burgundy
          spark on a burgundy field is invisible. */}
      {landed && !reduced && (
        <>
          <motion.span
            aria-hidden
            initial={{ scale: 0.3, opacity: 0.5 }}
            animate={{ scale: 2.8, opacity: 0 }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
            className="pointer-events-none absolute rounded-full border-2 border-white"
            style={{ width: narrow ? '48vmin' : '36vmin', height: narrow ? '48vmin' : '36vmin' }}
          />
          <motion.span
            aria-hidden
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="pointer-events-none absolute inset-0 bg-white"
          />
        </>
      )}

      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.6, ease: EASE, delay: lastAt + 0.2 }}
        className="relative mt-7 h-px w-36 bg-white/50 md:w-60"
      />

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE, delay: lastAt + 0.35 }}
        className="relative mt-4 font-heading text-[clamp(0.78rem,3.6vw,1.1rem)] font-semibold uppercase tracking-[0.3em] text-white/85"
      >
        {CUP.prize.tail}
      </motion.p>
    </section>
  );
}

/**
 * A zone, announced.
 *
 * ─── What this needed ─────────────────────────────────────────────────
 * It was a label, a name, a rule and a line of regions — correct, and
 * completely flat. Four of these run back to back in the middle of the
 * trailer, so a thin card is not a one-slide problem, it is twelve
 * seconds of the running time with nothing happening in it.
 *
 * Three changes. The draw number is now a Roman numeral set enormous
 * behind the name, so each of the four is instantly distinguishable
 * from the others even at a glance — that is the thing a run of
 * near-identical cards most needs. The regions became chips rather
 * than a run-on line, which is what they are: a list of places, not a
 * sentence. And the captaincy moved to a footer rule, so the card has
 * a top, a middle and a bottom instead of four stacked centred lines.
 *
 * It holds for three seconds, so the whole build lands inside 1.4s and
 * the rest is the wash settling.
 */
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const;

function ZoneSlide({ zone }: { readonly zone: Zone }) {
  const reduced = useReducedMotion() ?? false;
  const index = CUP.zones.findIndex((z) => z.name === zone.name);
  const numeral = ROMAN[index] ?? String(index + 1);

  return (
    <Stage>
      <PitchBackdrop delay={0.05} />
      <EdgeVignette />
      <Grain />

      {/* The draw number, huge and nearly invisible. The one element
          that differs sharply between the four cards. */}
      <motion.span
        aria-hidden
        initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.25 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reduced ? 0.3 : 1.1, ease: EASE }}
        className="pointer-events-none absolute select-none font-heading text-[46vh] font-light leading-none text-white/[0.055]"
      >
        {numeral}
      </motion.span>

      {/* A wash timed to land with the name. */}
      <motion.span
        aria-hidden
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: [0, 0.9, 0.6], scale: [0.8, 1.12, 1] }}
        transition={{ duration: 2.2, ease: 'easeOut', times: [0, 0.3, 1] }}
        className="pointer-events-none absolute h-[48vmin] w-[48vmin] rounded-full bg-primary/20 blur-[90px]"
      />

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="relative font-heading text-[10px] font-semibold uppercase tracking-[0.42em] text-primary"
      >
        {zone.designation}
      </motion.p>

      <motion.h2
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0.3 : 0.75, ease: EASE, delay: 0.1 }}
        className="relative mt-3 font-heading text-[clamp(2.2rem,11vw,6rem)] font-light uppercase leading-[0.92] text-white"
      >
        <Shine delay={0.6}>{zone.name}</Shine>
      </motion.h2>

      <SparkBurst delay={0.35} count={10} />
      <ChalkSweep delay={0.5} className="relative mt-5 w-40 md:w-64" />

      {/* Regions as chips. They are a list of places, and a list reads
          as a list — not as a middot-separated sentence. */}
      <div className="relative mt-6 flex flex-wrap items-center justify-center gap-2">
        {zone.regions.map((region, i) => (
          <motion.span
            key={region}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: reduced ? 0.25 : 0.5, ease: EASE, delay: 0.55 + i * 0.09 }}
            className="rounded-full border border-white/20 bg-white/[0.04] px-3.5 py-1.5 font-heading text-[clamp(0.68rem,3vw,0.85rem)] font-semibold uppercase tracking-[0.18em] text-white/80"
          >
            {region}
          </motion.span>
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.95 }}
        className="relative mt-8 font-heading text-[clamp(9px,2.8vw,11px)] font-semibold uppercase tracking-[0.3em] text-white/45"
      >
        Captaincy
        <span className="ml-2 text-primary">{zone.captaincy}</span>
      </motion.p>
    </Stage>
  );
}

/**
 * The ground itself, cross-dissolving through the real photographs.
 *
 * It used to show one plate and leave the other five unused, which
 * wasted the only genuine photography on the page. Now it works
 * through them on its own clock, each with a slow push, so eleven
 * seconds of stadium is a walk around the ground rather than a still.
 *
 * The timer is driven off the slide's own duration, so adding photos
 * does not overrun the slide, it just gives each one less time.
 */
function StadiumSlide({
  durationMs,
  paused,
}: {
  readonly durationMs: number;
  readonly paused: boolean;
}) {
  const reduced = useReducedMotion() ?? false;
  // Same reasoning as the archive: a push on a portrait phone is a
  // push on an already severe crop, and it drifts the stand out of
  // shot. The cross-fade carries the slide on its own.
  const narrow = useIsNarrow();
  const still = reduced || narrow;
  const plates = CUP.stadium;
  const [shot, setShot] = useState(0);
  const perShotMs = plates.length > 0 ? durationMs / plates.length : durationMs;

  useEffect(() => {
    if (paused || reduced || plates.length <= 1) return;
    const id = window.setTimeout(() => setShot((i) => (i + 1) % plates.length), perShotMs);
    return () => window.clearTimeout(id);
  }, [shot, paused, reduced, perShotMs, plates.length]);

  return (
    <section className="absolute inset-0 overflow-hidden">
      <AnimatePresence>
        <motion.div
          key={plates[shot] ?? 'empty'}
          initial={{ opacity: 0, scale: still ? 1 : 1.12 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6 } }}
          transition={{
            opacity: { duration: 0.7 },
            scale: { duration: perShotMs / 1000 + 1, ease: 'linear' },
          }}
          className="absolute inset-0"
        >
          {plates[shot] ? (
            <Image
              src={plates[shot]!}
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
              quality={75}
              priority={shot === 0}
            />
          ) : (
            <span aria-hidden className="absolute inset-0 bg-neutral-950" />
          )}
        </motion.div>
      </AnimatePresence>

      <span aria-hidden className="absolute inset-0 bg-black/55" />
      <EdgeVignette />

      {/* Lights coming up one after another is the sound of a ground
          filling; all four at once is just a brighter screen. */}
      <Floodlights count={4} delay={0.25} />
      <Grain />
      <CrowdSilhouette />

      <div className="absolute inset-0 flex flex-col items-center justify-end px-6 pb-24 text-center">
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.5 }}
          className="font-heading text-[10px] font-semibold uppercase tracking-[0.42em] text-primary"
        >
          The venue
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.6 }}
          className="mt-4 font-heading text-[clamp(1.8rem,7vw,4.4rem)] font-light uppercase leading-[1.02] text-white"
        >
          <Shine delay={1.1}>{CUP.venue.name}</Shine>
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.78 }}
          className="mt-4 font-heading text-sm uppercase tracking-[0.3em] text-white/55"
        >
          {CUP.venue.area} · {CUP.venue.city}
        </motion.p>

        {/* Which plate, so the dissolve reads as deliberate. */}
        <div className="mt-6 flex gap-1.5">
          {plates.map((plate, i) => (
            <span
              key={plate}
              aria-hidden
              className={`h-0.5 w-6 rounded-full transition-colors duration-500 ${
                i === shot ? 'bg-primary' : 'bg-white/25'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * The archive: past tournaments, played in sequence.
 *
 * This was a three-frame collage while the folder held only
 * placeholders. Video changed that — a clip needs the screen to
 * itself, and three videos playing at once on a phone is a way to
 * drop frames rather than a montage. So it is one frame at a time, in
 * the order `buildArchiveReel` deals out: clips as declared, stills
 * shuffled and sprayed into the gaps between them.
 *
 * Stills hold for `ARCHIVE_IMAGE_SECONDS`; clips hold for the
 * `seconds` declared against them. Every hold is declared rather than
 * read off the video element at runtime, because the trailer is
 * time-boxed: a reel whose length depends on how fast a file buffers
 * would push the running order around on a slow connection.
 *
 * `onEnded` is wired anyway as a backstop, in case a clip is shorter
 * than its declared hold.
 */
/**
 * One clip in the reel, owning its own element.
 *
 * It has to be its own component: during the crossfade the outgoing
 * and incoming clips are both mounted, and a single shared ref in the
 * parent ends up null the moment the outgoing one unmounts — which it
 * does *after* the incoming one has mounted and claimed the ref.
 */
function ArchiveVideo({
  src,
  paused,
  startSeconds,
  focus,
  onEnded,
}: {
  readonly src: string;
  readonly paused: boolean;
  readonly startSeconds?: number;
  readonly focus?: string;
  readonly onEnded: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  /**
   * Seek to the segment's start once the browser knows the clip's
   * length. Setting `currentTime` before metadata has loaded is
   * silently ignored, which is why this waits for the event rather
   * than running in an effect on mount.
   */
  const seekToStart = useCallback(() => {
    const video = ref.current;
    if (!video || !startSeconds) return;
    try {
      video.currentTime = startSeconds;
    } catch {
      // Seeking can fail if the clip is shorter than the offset. The
      // hold timer still moves the reel on, so this is survivable.
    }
  }, [startSeconds]);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (paused) video.pause();
    // A rejected play() is normal — the element can be torn down
    // mid-promise as the reel moves on.
    else void video.play().catch(() => undefined);
  }, [paused]);

  return (
    <video
      ref={ref}
      src={src}
      // Muted is not a preference: no browser autoplays a clip with
      // sound, and the trailer has its own bed over the top anyway.
      muted
      playsInline
      autoPlay={!paused}
      preload="auto"
      onLoadedMetadata={seekToStart}
      onEnded={onEnded}
      style={{ objectPosition: focus ?? ARCHIVE_DEFAULT_FOCUS }}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}

function GallerySlide({ paused }: { readonly paused: boolean }) {
  const reduced = useReducedMotion() ?? false;
  const [index, setIndex] = useState(0);

  /**
   * The running order, built once per viewing.
   *
   * The stills are shuffled, which makes the reel different on every
   * play — and therefore different between a server render and the
   * first client render, which is a hydration mismatch. So the first
   * render uses the declared order and the shuffle lands in an effect,
   * which only ever runs on the client. The swap happens on mount,
   * two minutes before this slide is ever reached, so nothing visible
   * changes under the viewer.
   */
  const [reel, setReel] = useState<readonly ArchiveItem[]>(() => buildArchiveReel(false));
  useEffect(() => {
    setReel(buildArchiveReel());
  }, []);

  const item = reel[index];
  // The one after it, prefetched below so the cut does not stall.
  const next = reel.length > 0 ? reel[(index + 1) % reel.length] : undefined;

  // Fixed holds, not shares of the slide: a clip runs its declared
  // five seconds and a still three quarters of one, which is what
  // gives the reel its shape — the footage, then a burst of stills.
  //
  // A pass is well short of the slide, so the reel comes round again
  // and the second pass gets another three clips — see the note on
  // `archiveSeconds`.
  const holdMs = (item?.kind === 'video' ? item.seconds : ARCHIVE_IMAGE_SECONDS) * 1000;

  /**
   * The Ken Burns push, on desktop only.
   *
   * It is scaled to the hold — a 9% move looks considered across five
   * seconds of footage and like a lurch across three quarters of one,
   * so a short still gets a correspondingly short travel.
   *
   * On a phone it is switched off entirely. Full-bleed media on a
   * portrait screen is already cropped hard by `object-cover`, and
   * pushing in on top of that walks the subject out of frame: the
   * thing worth seeing is usually near an edge, not dead centre.
   * Holding the frame still and aiming it with `focus` keeps the
   * player on the ball in shot for the whole hold, which is what the
   * zoom was costing.
   */
  const narrow = useIsNarrow();
  const zoomTo = narrow ? 1 : 1 + Math.min(0.09, (holdMs / 1000) * 0.018);

  // A phone crops far harder than a laptop does, so a handful of very
  // wide clips name a second crop for it. Everything else uses one.
  const crop = (narrow ? item?.focusNarrow : undefined) ?? item?.focus ?? ARCHIVE_DEFAULT_FOCUS;

  /**
   * Step on, but only once per item.
   *
   * Two things can ask the reel to advance — the hold timer and a
   * clip reaching its end — and for a while both fired on `1.mp4`,
   * because its declared hold was its exact length. Two advances in
   * the same tick skipped straight past `2.mp4`, which is why the
   * second video never appeared.
   *
   * Passing the index being left makes it idempotent: whichever call
   * arrives first moves the reel, and the second is a no-op because
   * the reel is no longer on the item it was asked to leave.
   */
  const advanceFrom = useCallback(
    (from: number) => {
      setIndex((i) => (i === from && reel.length > 0 ? (i + 1) % reel.length : i));
    },
    [reel.length],
  );

  useEffect(() => {
    if (paused || reel.length <= 1) return;
    const id = window.setTimeout(() => advanceFrom(index), holdMs);
    return () => window.clearTimeout(id);
  }, [index, paused, holdMs, advanceFrom, reel.length]);

  return (
    <section className="absolute inset-0 overflow-hidden bg-black">
      <AnimatePresence>
        <motion.div
          key={`${index}-${item?.src ?? 'empty'}`}
          // A slow push in across the whole hold, the Ken Burns move.
          // It runs on stills and clips alike, which is what stops a
          // photograph sitting dead between two pieces of footage.
          initial={{ opacity: 0, scale: 1 }}
          animate={{ opacity: 1, scale: reduced ? 1 : zoomTo }}
          exit={{ opacity: 0, transition: { duration: 0.5 } }}
          transition={{
            opacity: { duration: 0.55 },
            scale: { duration: holdMs / 1000 + 0.6, ease: 'linear' },
          }}
          className="absolute inset-0"
        >
          {item?.kind === 'video' ? (
            <ArchiveVideo
              src={item.src}
              paused={paused || reduced}
              startSeconds={item.startSeconds}
              focus={crop}
              onEnded={() => advanceFrom(index)}
            />
          ) : item ? (
            <Image
              src={item.src}
              alt=""
              fill
              sizes="100vw"
              style={{ objectPosition: crop }}
              className="object-cover"
              quality={75}
              priority={index === 0}
            />
          ) : (
            <span aria-hidden className="absolute inset-0 bg-neutral-950" />
          )}
        </motion.div>
      </AnimatePresence>

      <span aria-hidden className="absolute inset-0 bg-black/40" />
      <EdgeVignette />
      <Grain />

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center px-6 pb-14 text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
          className="font-heading text-[10px] font-semibold uppercase tracking-[0.42em] text-primary"
        >
          From the archive
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, ease: EASE, delay: 0.32 }}
          className="mt-3 font-heading text-[clamp(1.6rem,7vw,4rem)] font-light uppercase leading-[1.02] text-white"
        >
          <Shine delay={0.9}>We have done this before</Shine>
        </motion.h2>

        {/* ─── Prefetching the next item ───────────────────────────────
          Each clip used to begin downloading only when it mounted,
          which on a Cameroonian mobile connection is most of a second
          of black before the first frame — eleven times over, in a
          montage whose whole job is to flow.

          So the next item in the reel is mounted here, invisible and
          never played, purely so the browser has it buffered by the
          time it is shown. `preload="auto"` on a hidden element is the
          cheapest prefetch there is: no second request, no cache
          plumbing, and it is already warm when the real element asks
          for the same URL.

          Only one ahead. Two would have three clips in flight at once
          and on a thin connection that makes the clip being watched
          worse, not better. */}
        {next && (
          <span
            aria-hidden
            className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
          >
            {next.kind === 'video' ? (
              <video src={next.src} muted playsInline preload="auto" tabIndex={-1} />
            ) : (
              <Image src={next.src} alt="" width={16} height={16} quality={75} />
            )}
          </span>
        )}

        {/* Twenty ticks now, so they are narrower than they were and
            allowed to wrap: a strip wide enough for the whole reel
            overran a phone held sideways. */}
        <div className="mt-6 flex max-w-full flex-wrap justify-center gap-1">
          {reel.map((media, i) => (
            <span
              key={media.src}
              aria-hidden
              className={`h-0.5 rounded-full transition-colors duration-500 ${
                media.kind === 'video' ? 'w-6' : 'w-3'
              } ${i === index ? 'bg-primary' : 'bg-white/25'}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * The date, as a numeral that arrives rather than appears.
 *
 * ─── Why it is stacked now ────────────────────────────────────────────
 * It used to read "13 November" on one line, which on a phone shrank
 * to about half the size the slide could carry. Split, the numeral
 * gets the whole width on both screens and the month sits under it as
 * spaced caps — and the day of the month is the thing worth
 * remembering, so it should be the biggest object on the slide.
 *
 * ─── Why a count and not a flip ───────────────────────────────────────
 * The kick-off slide already clatters in on split-flaps. Two slides
 * back to back using the same mechanism makes them read as one idea
 * told twice, so the date counts up and the time flips down.
 *
 * It all has to land inside three seconds, so nothing waits its turn:
 * the ghost numeral, the label and the count are already running by
 * 150ms, and the whole build is finished at 1.5s. The remaining
 * second and a half is a slow drift on the ghost, which keeps the
 * frame alive without asking the eye to read anything again.
 */
function DateSlide() {
  const reduced = useReducedMotion() ?? false;
  const narrow = useIsNarrow();
  const [stamped, setStamped] = useState(false);
  const day = venueTime({ day: 'numeric' });
  const month = venueTime({ month: 'long' });

  // The stamp lands at the end of its spring. Driving the impact off a
  // timeout rather than an `onComplete` because a spring has no fixed
  // duration — 0.5s is where this one is visually down.
  useEffect(() => {
    const id = window.setTimeout(() => setStamped(true), reduced ? 0 : 500);
    return () => window.clearTimeout(id);
  }, [reduced]);

  return (
    <Stage>
      <PitchBackdrop delay={0.05} />
      <EdgeVignette />
      <Grain />

      <motion.p
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="relative font-heading text-[10px] font-semibold uppercase tracking-[0.42em] text-primary"
      >
        Mark the day
      </motion.p>

      {/* ─── Stamped, not counted ────────────────────────────────────
          The date used to count up to 13, which is what the prize does
          with its figure. A date is not a quantity you arrive at, it
          is a thing printed on a fixture list — so it comes down like
          a stamp: oversized, rotated a few degrees, and square on the
          landing frame.

          The whole block is one unit inside a bordered plate, so on a
          phone the day and the month stay locked together and scale as
          one object instead of two lines drifting apart. */}
      <StampIn delay={0.2} className="relative mt-4 inline-block">
        <span className="relative block border-y-2 border-primary/70 px-5 py-2 md:px-8 md:py-3">
          <span className="block font-heading text-[clamp(4.5rem,24vw,13rem)] font-light leading-[0.82] tabular-nums text-white">
            {day}
          </span>
          <span className="mt-2 block font-heading text-[clamp(0.95rem,4.5vw,2rem)] font-semibold uppercase tracking-[0.3em] text-white/85">
            {month}
          </span>
        </span>
      </StampIn>

      {/* The ink spreading out from where it hit. */}
      {stamped && (
        <>
          <PulseRing count={2} size={narrow ? '46vmin' : '38vmin'} />
          <SparkBurst count={12} />
        </>
      )}

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: stamped ? 1 : 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative mt-6 font-heading text-[clamp(0.8rem,3.4vw,1rem)] font-semibold uppercase tracking-[0.42em] text-primary"
      >
        <Shine delay={0.9}>{venueTime({ year: 'numeric' })}</Shine>
      </motion.p>
    </Stage>
  );
}

/**
 * Kick-off, as two halves meeting.
 *
 * ─── Why this was redone ──────────────────────────────────────────────
 * It used to clatter in on split-flaps over a drawn centre circle. The
 * flaps were the right idea for a departure board and the wrong one
 * here: they made the time read as a schedule entry, and the circle
 * behind them was a second thing competing for the middle of the
 * screen at exactly the size the digits wanted.
 *
 * Now the hour comes in from the left and the minutes from the right
 * and they meet at the colon, which pulses on the frame they arrive.
 * That is the same collision the fixtures slide uses for two sides
 * meeting at a ball, which is deliberate — it is the trailer's one
 * recurring gesture, and a kick-off is the moment two halves meet.
 *
 * The digits are enormous and nothing sits behind them, which is what
 * makes it work on a phone.
 */
function TimeSlide() {
  const reduced = useReducedMotion() ?? false;
  const narrow = useIsNarrow();
  const kickOff = venueTime({ hour: '2-digit', minute: '2-digit' });
  const [hour = '', minute = ''] = kickOff.split(':');
  const MEET = 0.75;

  const half = (from: string) => ({
    initial: reduced ? { opacity: 0 } : { opacity: 0, x: from },
    animate: { opacity: 1, x: 0 },
    transition: reduced
      ? { duration: 0.3, delay: 0.2 }
      : { type: 'spring' as const, duration: 0.7, bounce: 0.18, delay: 0.25 },
  });

  return (
    <Stage>
      <EdgeVignette />
      <Grain />

      {/* A single bloom behind the meeting point, swelling as they
          arrive. One blurred element, not four — a phone paying for
          four 70px blurs under a spring drops frames. */}
      <motion.span
        aria-hidden
        initial={{ opacity: 0, scale: 0.7 }}
        animate={
          reduced ? { opacity: 0.3, scale: 1 } : { opacity: [0, 0.5, 0.3], scale: [0.7, 1.15, 1] }
        }
        transition={{ duration: 2.4, ease: 'easeOut', times: [0, 0.35, 1], delay: 0.2 }}
        className="pointer-events-none absolute h-[46vmin] w-[46vmin] rounded-full bg-primary/40 blur-[70px]"
      />

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="relative font-heading text-[10px] font-semibold uppercase tracking-[0.42em] text-primary"
      >
        Kick-off
      </motion.p>

      <p
        aria-label={`Kick-off ${kickOff}`}
        className="relative mt-4 flex items-center justify-center font-heading text-[clamp(4rem,23vw,11rem)] font-light leading-[0.85] tabular-nums text-white"
      >
        <motion.span aria-hidden {...half('-60%')}>
          {hour}
        </motion.span>
        <motion.span
          aria-hidden
          // The colon is the meeting point, so it is the one thing
          // that reacts rather than arrives.
          initial={{ opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: reduced ? 1 : [0.4, 1.5, 1] }}
          transition={{ duration: reduced ? 0.3 : 0.5, ease: EASE, delay: MEET }}
          className="mx-[0.06em] text-primary"
        >
          :
        </motion.span>
        <motion.span aria-hidden {...half('60%')}>
          {minute}
        </motion.span>
      </p>

      {/* Fired on the frame they meet. */}
      <PulseRing delay={MEET} count={2} size="38vmin" />
      <SparkBurst delay={MEET} count={16} />

      {/* The ball dropping onto the spot. The trailer's one recurring
          football mark, and this is the moment it belongs to. */}
      <motion.span
        aria-hidden
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: -44, scale: 0.5 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={
          reduced
            ? { duration: 0.3, delay: MEET }
            : { type: 'spring', duration: 0.6, bounce: 0.35, delay: MEET + 0.05 }
        }
        className="relative mt-6"
      >
        <SpinningBall size={narrow ? 26 : 34} />
      </motion.span>

      <motion.div
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.7, ease: EASE, delay: MEET + 0.15 }}
        className="relative mt-7 h-px w-36 bg-gradient-to-r from-transparent via-primary to-transparent md:w-56"
      />

      {/* Labelled, because this link travels. Left to the browser, a
          member in Sydney would read a different time and a different
          day for the same kick-off. */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE, delay: MEET + 0.3 }}
        className="relative mt-4 font-heading text-[clamp(0.75rem,3.2vw,0.95rem)] font-semibold uppercase tracking-[0.34em] text-white/60"
      >
        {CUP.venue.city} time
      </motion.p>
    </Stage>
  );
}

/**
 * The last slide, and the only one with anything to act on.
 *
 * One name per zone now, not a captain and a coach each. Four rows
 * instead of eight means they can be bigger, which matters: this is
 * the slide somebody is squinting at to find a number to call.
 */
function ContactsSlide() {
  const lines = CUP.zones.map((zone) => ({ zone: zone.name, ...zone.contact }));

  return (
    <section className="absolute inset-0 flex flex-col justify-center overflow-y-auto px-5 py-16 md:px-10">
      <div className="mx-auto w-full max-w-3xl">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="text-center font-heading text-[10px] font-semibold uppercase tracking-[0.42em] text-primary"
        >
          Get in touch
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, ease: EASE, delay: 0.08 }}
          className="mt-3 text-center font-heading text-[clamp(1.5rem,5vw,2.8rem)] font-light uppercase leading-tight text-white"
        >
          One name per zone
        </motion.h2>

        <div className="mt-8 divide-y divide-white/10 border-y border-white/10">
          {lines.map((line, i) => (
            <motion.div
              key={`${line.zone}-${line.name}`}
              initial={{ opacity: 0, x: -18 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.16 + i * 0.07 }}
              // Stacked on a phone, one row from `md`. Wrapping three
              // columns into 350px put the name and the number on the
              // same cramped line with nothing to separate them; given
              // its own line the zone reads as a heading for the pair.
              className="flex flex-col gap-1.5 py-4 md:flex-row md:flex-wrap md:items-baseline md:gap-x-5 md:gap-y-1"
            >
              <span className="font-heading text-[10.5px] font-semibold uppercase tracking-[0.22em] text-primary md:w-40 md:shrink-0">
                {line.zone}
              </span>
              {/* Deliberately not `md:contents`, which would make the
                  phone link a direct flex child: `display: contents`
                  has a history of dropping elements out of the
                  accessibility tree, and this is the one link on the
                  page anyone actually needs. */}
              <div className="flex items-baseline justify-between gap-3 md:flex-1">
                <span className="min-w-0 font-heading text-[clamp(1rem,3.4vw,1.2rem)] font-light text-white">
                  {line.name}
                </span>
                {/* No number for one zone yet. It says so rather than
                    rendering a dead `tel:` link — see `Contact.phone`. */}
                {line.phone ? (
                  <a
                    href={`tel:${line.phone.replace(/\s+/g, '')}`}
                    className="relative z-[35] -my-2 shrink-0 py-2 font-heading text-[clamp(0.85rem,3vw,1rem)] tabular-nums text-white/75 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  >
                    {line.phone}
                  </a>
                ) : (
                  <span className="shrink-0 font-heading text-[11px] uppercase tracking-[0.2em] text-white/30">
                    Number to follow
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="mt-9 text-center font-heading text-[clamp(1.1rem,4vw,1.9rem)] font-light uppercase tracking-[0.12em] text-white"
        >
          {CUP.name} {CUP.edition}
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.72 }}
          className="mt-2 text-center text-[13px] text-white/45"
        >
          {capitalise(numberWord(CUP.zones.length))} zones · {CUP.venue.name} ·{' '}
          {venueTime({ day: 'numeric', month: 'long' })}
        </motion.p>
      </div>
    </section>
  );
}

/**
 * An atmosphere card. Two lines, no information, maximum size.
 *
 * It exists to break the rhythm. The slides either side of it are
 * dense — a schedule, a bracket, five faces — and reading three of
 * those in a row flattens them all. A card with nothing to decode is
 * where the eye rests, which is what makes the next dense slide land.
 */
function AmbianceSlide({ card }: { readonly card: (typeof AMBIANCE)[number] }) {
  const reduced = useReducedMotion() ?? false;

  return (
    <Stage>
      <EdgeVignette />
      <Grain />
      {/* The wash swells as the second line lands, so the card gets
          brighter on the word that carries it. */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, scale: 0.85 }}
        animate={
          reduced ? { opacity: 1, scale: 1 } : { opacity: [0, 1, 0.75], scale: [0.85, 1.1, 1] }
        }
        transition={{ duration: reduced ? 0.3 : 2.6, ease: 'easeOut', times: [0, 0.35, 1] }}
        className="pointer-events-none absolute h-[60vmin] w-[60vmin] rounded-full bg-primary/15 blur-[120px]"
      />
      <motion.p
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0.25 : 0.5, ease: EASE }}
        className="relative font-heading text-[clamp(1.9rem,9vw,5.5rem)] font-light uppercase leading-[0.98] text-white"
      >
        {card.line}
      </motion.p>
      <motion.p
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduced ? 0.25 : 0.5, ease: EASE, delay: 0.14 }}
        className="relative font-heading text-[clamp(1.9rem,9vw,5.5rem)] font-light uppercase leading-[0.98] text-primary"
      >
        <Shine delay={0.55}>{card.accent}</Shine>
      </motion.p>

      <ChalkSweep delay={0.7} className="relative mt-6 w-32 md:w-52" />
    </Stage>
  );
}

/**
 * The night's three matches, as a match-day board.
 *
 * ─── The rebrand ──────────────────────────────────────────────────────
 * This was three bordered rows with a ball in the middle of each and a
 * burgundy bar wiping across them. It worked, but it read as three
 * identical widgets stacked up — nothing said *schedule*, and nothing
 * distinguished the final from the semis except a slightly brighter
 * border.
 *
 * It is now laid out the way a ground actually posts its fixtures: a
 * kick-off time in a chip on the left, the two sides to the right of
 * it, and the final inverted into a solid burgundy block so the shape
 * of the evening is legible before you read a word of it.
 *
 * ─── The order it builds in ───────────────────────────────────────────
 * Time first, then the sides. That is the order the information
 * matters in — somebody reading this wants to know when to be there
 * before they want to know who is playing — and it gives each row an
 * internal beat rather than everything arriving together.
 *
 * ─── On a phone ───────────────────────────────────────────────────────
 * The chip sits above the fixture instead of beside it, and the two
 * sides stack either side of a centred "v". Three columns in 350px was
 * what forced the old version's type down to nine pixels.
 */
function FixturesSlide() {
  const reduced = useReducedMotion() ?? false;
  const narrow = useIsNarrow();

  return (
    <section className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden px-4 md:px-10">
      <PitchBackdrop delay={0.1} />
      <Floodlights count={narrow ? 2 : 4} delay={0.15} />
      <EdgeVignette />
      <Grain />

      <div className="relative w-full max-w-3xl">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="text-center font-heading text-[10px] font-semibold uppercase tracking-[0.42em] text-primary"
        >
          The card
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: EASE, delay: 0.08 }}
          className="mt-2 text-center font-heading text-[clamp(1.3rem,6vw,2.6rem)] font-light uppercase leading-tight text-white"
        >
          <Shine delay={0.7}>One night, three matches</Shine>
        </motion.h2>

        <div className="mt-6 flex flex-col gap-3 md:mt-9 md:gap-4">
          {FIXTURES.map((fixture, i) => (
            <FixtureRow
              key={fixture.label}
              fixture={fixture}
              at={0.6 + i * 0.75}
              index={i}
              isFinal={i === FIXTURES.length - 1}
              reduced={reduced}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FixtureRow({
  fixture,
  at,
  index,
  isFinal,
  reduced,
}: {
  readonly fixture: (typeof FIXTURES)[number];
  readonly at: number;
  readonly index: number;
  readonly isFinal: boolean;
  readonly reduced: boolean;
}) {
  const side =
    'min-w-0 flex-1 truncate font-heading text-[clamp(0.9rem,4.2vw,1.5rem)] font-light uppercase tracking-[0.03em]';

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0.25 : 0.6, ease: EASE, delay: at - 0.2 }}
      className={`relative flex items-stretch overflow-hidden rounded-sm ${
        isFinal ? 'bg-primary text-white' : 'border border-white/12 bg-white/[0.03] text-white'
      }`}
    >
      {/* ─── The number column ───────────────────────────────────────
          The match index set large down the left, with the kick-off
          under it. This is what makes the three rows read as an order
          of play rather than three equivalent widgets: the eye gets a
          01 / 02 / 03 to travel down, and the time it actually needs
          is attached to it rather than buried in a label. */}
      <div
        className={`flex shrink-0 flex-col items-center justify-center px-3 py-3 md:px-5 ${
          isFinal ? 'bg-white/15' : 'bg-white/[0.04]'
        }`}
      >
        <motion.span
          initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.3 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reduced ? 0.2 : 0.5, ease: EASE, delay: at }}
          className={`font-heading text-[clamp(1.5rem,7vw,2.6rem)] font-light leading-none tabular-nums ${
            isFinal ? 'text-white' : 'text-white/35'
          }`}
        >
          {String(index + 1).padStart(2, '0')}
        </motion.span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: at + 0.1 }}
          className={`mt-1 font-heading text-[clamp(0.7rem,3vw,0.9rem)] font-semibold tabular-nums ${
            isFinal ? 'text-white' : 'text-primary'
          }`}
        >
          {fixture.kickOff}
        </motion.span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 px-3 py-3 md:px-5">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: at + 0.05 }}
          className={`font-heading text-[9px] font-semibold uppercase tracking-[0.3em] ${
            isFinal ? 'text-white/75' : 'text-white/35'
          }`}
        >
          {fixture.label}
        </motion.span>

        {/* The two sides meeting at a "v" — the same collision the
            kick-off slide uses for the hour and the minutes. */}
        <div className="flex min-w-0 items-center gap-2 md:gap-3">
          <motion.span
            initial={reduced ? { opacity: 0 } : { opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: reduced ? 0.25 : 0.55, ease: EASE, delay: at + 0.2 }}
            className={`${side} text-left`}
          >
            {fixture.home}
          </motion.span>

          <motion.span
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reduced ? 0.2 : 0.4, ease: EASE, delay: at + 0.32 }}
            className={`shrink-0 font-heading text-[10px] font-semibold uppercase tracking-[0.2em] ${
              isFinal ? 'text-white/70' : 'text-primary'
            }`}
          >
            v
          </motion.span>

          <motion.span
            initial={reduced ? { opacity: 0 } : { opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: reduced ? 0.25 : 0.55, ease: EASE, delay: at + 0.2 }}
            className={`${side} text-right`}
          >
            {fixture.away}
          </motion.span>
        </div>
      </div>

      {/* The final is the payoff, so it gets the light — once, as it
          lands, rather than a loop running under the type. */}
      {isFinal && !reduced && (
        <motion.span
          aria-hidden
          initial={{ opacity: 0, x: '-110%' }}
          animate={{ opacity: [0, 1, 0], x: '110%' }}
          transition={{ duration: 1.2, ease: 'easeInOut', delay: at + 0.5 }}
          className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent"
        />
      )}
    </motion.div>
  );
}

/**
 * The bracket, drawn the way a coach draws it.
 *
 * One SVG rather than a CSS grid of boxes. The connectors animate by
 * `pathLength`, so the lines genuinely draw from the teams toward the
 * trophy and arrive in the order the competition runs, which a grid of
 * divs fading in cannot express.
 *
 * ─── Two of them ──────────────────────────────────────────────────────
 * A bracket is a left-to-right shape, and the wide one squeezed into a
 * portrait column renders about 200px tall in a 700px viewport with
 * the team names at nine pixels. It scaled, but it was not readable,
 * which is why this slide used to be the reason the trailer asked
 * phones to turn sideways.
 *
 * So there are two, swapped by CSS at `md`. The tall one runs the same
 * competition down the screen instead of across it: two seeds, their
 * semi, the final in the middle, then the other semi and its two
 * seeds, read top to bottom. Same lines, same draw order, same
 * meaning — it just flows the other way.
 *
 * Both are rendered and one is hidden, rather than picked in
 * JavaScript, so there is no mount flicker and no hydration guess
 * about viewport width.
 */
function RoadSlide() {
  const narrow = useIsNarrow();

  return (
    <section className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden px-3">
      <PitchBackdrop delay={0.1} />
      <Floodlights count={narrow ? 2 : 3} delay={0.2} />
      <EdgeVignette />
      <Grain />

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE }}
        className="relative font-heading text-[10px] font-semibold uppercase tracking-[0.42em] text-primary"
      >
        The road to the final
      </motion.p>

      <BracketTall />
      <BracketWide />

      {/* The caption under the bracket. It arrives last, once the
          shape has drawn, and says the thing the diagram cannot: that
          all of this happens in one evening. */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE, delay: 2.3 }}
        className="relative mt-4 px-4 text-center font-heading text-[clamp(0.7rem,3vw,0.9rem)] font-semibold uppercase tracking-[0.3em] text-white/45 md:mt-6"
      >
        <Shine delay={3}>Two semis, one final, one night</Shine>
      </motion.p>
    </section>
  );
}

/**
 * How long one run of light takes to cross the bracket, and how long
 * it waits before setting off again.
 *
 * The slide holds 9.5s and the lines finish drawing at about 2s. Three
 * runs at 1.5s with a 1.1s gap fills the rest without the loop ever
 * being obvious, because each run starts from a different seed.
 */
const RUN = { start: 2.1, duration: 1.5, gap: 1.1 } as const;
const runDelay = (i: number) => RUN.start + i * 0.26;

/** Shared by both brackets: a connector that draws itself. */
function useBracketDraw(reduced: boolean) {
  return (delay: number) => ({
    initial: reduced ? { pathLength: 1, opacity: 0 } : { pathLength: 0, opacity: 1 },
    animate: { pathLength: 1, opacity: 1 },
    transition: { duration: reduced ? 0.01 : 0.5, ease: EASE, delay },
  });
}

/**
 * The trophy end. Positioned by its parent, identical in both.
 *
 * It used to pop in at 1.7s and then hold a dead frame for the rest of
 * the slide. Now the arrival carries a spark and a ring, and the glow
 * behind it breathes on a cycle long enough that it never repeats
 * inside the hold — so the thing every line on the slide points at is
 * also the only thing still moving when the lines are finished.
 */
function BracketTrophy({
  className,
  delay,
}: {
  readonly className: string;
  readonly delay: number;
}) {
  const reduced = useReducedMotion() ?? false;

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reduced ? 0.3 : 0.7, ease: EASE, delay }}
      className={className}
    >
      <motion.span
        aria-hidden
        animate={
          reduced
            ? { opacity: 0.35 }
            : { opacity: [0.2, 0.55, 0.3, 0.5], scale: [0.9, 1.15, 1, 1.1] }
        }
        transition={
          reduced
            ? { duration: 0.3 }
            : { duration: 6, ease: 'easeInOut', delay, times: [0, 0.3, 0.65, 1] }
        }
        className="absolute h-24 w-24 rounded-full bg-primary/35 blur-2xl"
      />

      <PulseRing delay={delay + 0.1} size="14vmin" />
      <SparkBurst delay={delay + 0.1} count={12} />

      <span className="relative h-12 w-12 md:h-20 md:w-20">
        <Image src={CUP.crest} alt="" fill sizes="80px" className="object-contain" />
      </span>
      <span className="relative font-heading text-[9px] font-semibold uppercase tracking-[0.26em] text-white/60">
        <Shine delay={delay + 0.5}>{CUP.name}</Shine>
      </span>
    </motion.div>
  );
}

/**
 * The phone bracket: the same competition read downwards.
 *
 * Seeds are full-width so a fifteen-character team name still has room
 * at a readable size — at 390px across, the 25px type in this viewBox
 * lands at about sixteen real pixels. The connectors leave each seed
 * from a third of the way in rather than its centre, so the pair's two
 * lines do not lie on top of each other on their way down.
 */
function BracketTall() {
  const reduced = useReducedMotion() ?? false;
  const drawAt = useBracketDraw(reduced);
  const teams = CUP.zones.map((z) => z.name);

  // Centres, in the 600x900 viewBox. Two seeds, a semi, the final in
  // the middle, the other semi, two seeds.
  const seedY = [70, 160, 740, 830];
  const semiY = [300, 600];

  return (
    <div className="relative mt-4 w-full max-w-sm md:hidden">
      <svg
        viewBox="0 0 600 900"
        className="h-auto w-full"
        role="img"
        aria-label="Tournament bracket"
      >
        <g fill="none" stroke="currentColor" strokeWidth={2.5} className="text-white/35">
          {/* Seeds into their semi. Out of the near edge, down to a
              shared rail, in to the centre, then into the box. */}
          <motion.path d="M160 101 V250 H300 V275" {...drawAt(0.5)} />
          <motion.path d="M440 191 V250 H300 V275" {...drawAt(0.6)} />
          <motion.path d="M160 709 V650 H300 V625" {...drawAt(0.7)} />
          <motion.path d="M440 799 V650 H300 V625" {...drawAt(0.8)} />
          {/* Semis into the final. */}
          <motion.path d="M300 325 V392" {...drawAt(1.15)} />
          <motion.path d="M300 575 V508" {...drawAt(1.27)} />
        </g>

        {/* Light running the whole way from each seed to the final.
            These are the full routes rather than the segments above —
            a pulse that stops at the semi and restarts reads as two
            separate things, where one that carries through reads as a
            side advancing. */}
        <g>
          {[
            'M160 101 V250 H300 V392',
            'M440 191 V250 H300 V392',
            'M160 709 V650 H300 V508',
            'M440 799 V650 H300 V508',
          ].map((d, i) => (
            <TravellingLight
              key={d}
              d={d}
              delay={runDelay(i)}
              duration={RUN.duration}
              repeatDelay={RUN.gap}
              strokeWidth={3.5}
            />
          ))}
        </g>

        {teams.map((team, i) => (
          <motion.g
            key={team}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: i < 2 ? -24 : 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0.25 : 0.5, ease: EASE, delay: 0.2 + i * 0.1 }}
          >
            <rect
              x="40"
              y={seedY[i]! - 31}
              width="520"
              height="62"
              rx="3"
              className="fill-white/4 stroke-white/20"
              strokeWidth={1.5}
            />
            {/* The accent bar lights as the run passes this seed, so
                the four plates fire in the order the light leaves
                them rather than all sitting lit. */}
            <motion.rect
              x="40"
              y={seedY[i]! - 31}
              width="5"
              height="62"
              className="fill-primary"
              animate={reduced ? { opacity: 1 } : { opacity: [0.45, 1, 0.45] }}
              transition={
                reduced
                  ? { duration: 0 }
                  : {
                      duration: RUN.duration + RUN.gap,
                      repeat: Infinity,
                      delay: runDelay(i),
                      times: [0, 0.18, 1],
                      ease: 'easeOut',
                    }
              }
            />
            <text
              x="300"
              y={seedY[i]! + 9}
              textAnchor="middle"
              className="fill-white font-heading text-[27px] uppercase"
              style={{ letterSpacing: '0.04em' }}
            >
              {team}
            </text>
          </motion.g>
        ))}

        {semiY.map((y, i) => (
          <motion.g
            key={`sflabel-${y}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45, ease: EASE, delay: 1.0 + i * 0.12 }}
          >
            <rect
              x="200"
              y={y - 25}
              width="200"
              height="50"
              rx="3"
              className="fill-white/3 stroke-white/15"
              strokeWidth={1.5}
            />
            <text
              x="300"
              y={y + 8}
              textAnchor="middle"
              className="fill-white/55 font-heading text-[22px] uppercase"
              style={{ letterSpacing: '0.16em' }}
            >
              SEMI {i === 0 ? 'I' : 'II'}
            </text>
          </motion.g>
        ))}
      </svg>

      {/* The final sits dead centre, where the two halves meet. */}
      <BracketTrophy
        delay={1.62}
        className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
      />
    </div>
  );
}

/** The desktop bracket: left to right, the way it is drawn on a board. */
function BracketWide() {
  const reduced = useReducedMotion() ?? false;
  const drawAt = useBracketDraw(reduced);
  const teams = CUP.zones.map((z) => z.name);

  // Four seeds at the left, two semi joins, one final, trophy at the
  // right. Coordinates are in the 1000x560 viewBox below.
  const seedY = [90, 190, 370, 470];
  const semiY = [140, 420];

  return (
    <div className="relative mt-5 hidden w-full max-w-5xl md:block">
      <svg
        viewBox="0 0 1000 560"
        className="h-auto w-full"
        role="img"
        aria-label="Tournament bracket"
      >
        <g fill="none" stroke="currentColor" strokeWidth={2} className="text-white/35">
          {seedY.map((y, i) => (
            <motion.path
              key={`seed-${y}`}
              d={`M330 ${y} H430 V${semiY[i < 2 ? 0 : 1]}`}
              {...drawAt(0.5 + i * 0.1)}
            />
          ))}
          {semiY.map((y, i) => (
            <motion.path key={`semi-${y}`} d={`M560 ${y} H660 V280`} {...drawAt(1.15 + i * 0.12)} />
          ))}
          <motion.path d="M660 280 H780" {...drawAt(1.5)} />
        </g>

        {/* The full route from each seed through its semi to the
              trophy — see the note on the tall bracket. */}
        <g>
          {seedY.map((y, i) => (
            <TravellingLight
              key={`run-${y}`}
              d={`M330 ${y} H430 V${semiY[i < 2 ? 0 : 1]} H660 V280 H780`}
              delay={runDelay(i)}
              duration={RUN.duration}
              repeatDelay={RUN.gap}
              strokeWidth={3}
            />
          ))}
        </g>

        {/* Seeds */}
        {teams.map((team, i) => (
          <motion.g
            key={team}
            initial={reduced ? { opacity: 0 } : { opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: reduced ? 0.25 : 0.5, ease: EASE, delay: 0.2 + i * 0.1 }}
          >
            <rect
              x="20"
              y={seedY[i]! - 26}
              width="310"
              height="52"
              rx="3"
              className="fill-white/[0.04] stroke-white/20"
              strokeWidth={1.5}
            />
            {/* Lights as the run passes — see the tall bracket. */}
            <motion.rect
              x="20"
              y={seedY[i]! - 26}
              width="4"
              height="52"
              className="fill-primary"
              animate={reduced ? { opacity: 1 } : { opacity: [0.45, 1, 0.45] }}
              transition={
                reduced
                  ? { duration: 0 }
                  : {
                      duration: RUN.duration + RUN.gap,
                      repeat: Infinity,
                      delay: runDelay(i),
                      times: [0, 0.18, 1],
                      ease: 'easeOut',
                    }
              }
            />
            <text
              x="44"
              y={seedY[i]! + 7}
              className="fill-white font-heading text-[25px] uppercase"
              style={{ letterSpacing: '0.04em' }}
            >
              {team}
            </text>
          </motion.g>
        ))}

        {/* Semi-final joins */}
        {semiY.map((y, i) => (
          <motion.g
            key={`sflabel-${y}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45, ease: EASE, delay: 1.0 + i * 0.12 }}
          >
            <rect
              x="430"
              y={y - 22}
              width="130"
              height="44"
              rx="3"
              className="fill-white/[0.03] stroke-white/15"
              strokeWidth={1.5}
            />
            <text
              x="495"
              y={y + 6}
              textAnchor="middle"
              className="fill-white/55 font-heading text-[19px] uppercase"
              style={{ letterSpacing: '0.16em' }}
            >
              SEMI {i === 0 ? 'I' : 'II'}
            </text>
          </motion.g>
        ))}

        <motion.text
          x="720"
          y="258"
          textAnchor="middle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.62 }}
          className="fill-primary font-heading text-[19px] uppercase"
          style={{ letterSpacing: '0.22em' }}
        >
          FINAL
        </motion.text>
      </svg>

      {/* The trophy end, in DOM rather than SVG so it can use the
            crest image and a real blur. */}
      <BracketTrophy
        delay={1.72}
        className="absolute right-[1%] top-1/2 flex -translate-y-1/2 flex-col items-center gap-1.5"
      />
    </div>
  );
}

/**
 * The sign-off, and the vote.
 *
 * This is the slide the trailer rests on. Once the sequence ends it
 * stays here, which is the whole reason the poll lives on it: as its
 * own slide the vote held for five seconds and then disappeared for
 * the rest of the running time, so nobody could realistically have
 * cast one. Here it is available for as long as the viewer looks.
 *
 * The closing line still comes first and still gets the largest type
 * on the screen — the date is what someone has to leave with, and the
 * poll is what they might do while they are here.
 *
 * The tally is live — see `use-cup-poll.ts` and `lib/cup-poll.ts`. One
 * vote per device, and tapping a different side changes it rather than
 * adding a second.
 */
function FinaleSlide({ card }: { readonly card: (typeof AMBIANCE)[number] }) {
  const { counts, total, myVote, vote, ready, pending, error } = useCupPoll();
  const reduced = useReducedMotion() ?? false;
  const zones = CUP.zones.map((z) => z.name);

  return (
    <section className="absolute inset-0 flex flex-col items-center justify-center overflow-y-auto px-5 py-12 md:px-10">
      <PitchBackdrop delay={0.2} />
      <EdgeVignette />
      <Grain />

      <div className="relative w-full max-w-xl">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="text-center font-heading text-[clamp(1.6rem,6.5vw,3.4rem)] font-light uppercase leading-[1.0] text-white"
        >
          <Shine delay={0.5}>{card.line}</Shine>
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.12 }}
          className="text-center font-heading text-[clamp(1.6rem,6.5vw,3.4rem)] font-light uppercase leading-[1.0] text-primary"
        >
          {card.accent}
        </motion.p>

        <ChalkSweep delay={0.4} className="mx-auto mt-5 w-2/3" />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="mt-7 text-center font-heading text-[10px] font-semibold uppercase tracking-[0.42em] text-primary"
        >
          Before you go
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.62 }}
          className="mt-2 text-center font-heading text-[clamp(1.1rem,4.5vw,1.9rem)] font-light uppercase leading-tight text-white"
        >
          Who lifts it?
        </motion.h2>

        {/* ─── Above the tap zones ─────────────────────────────────
            `TapZones` in `cup-trailer` is a full-screen z-30 overlay
            of two navigation buttons, so anything interactive inside a
            slide is unreachable by default — every tap on a bar was
            landing on "forward" and advancing the trailer instead of
            voting. The vote was never broken; it was never called.

            z-35 clears the tap zones and still sits under the controls
            and progress bar at z-40, so replay and mute keep working
            over the top of the poll. */}
        <div className="relative z-[35] mt-5 flex flex-col gap-2">
          {zones.map((zone, i) => {
            const votes = counts[zone] ?? 0;
            const share = total > 0 ? (votes / total) * 100 : 0;
            const mine = myVote === zone;
            const shown = ready && Boolean(myVote);
            return (
              <motion.button
                key={zone}
                type="button"
                onClick={() => vote(zone)}
                aria-pressed={mine}
                aria-label={shown ? `${zone}, ${share.toFixed(0)} per cent, ${votes} votes` : zone}
                disabled={pending}
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.45, ease: EASE, delay: 0.7 + i * 0.06 }}
                whileTap={{ scale: 0.985 }}
                className={`relative overflow-hidden rounded-sm border px-4 py-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-progress ${
                  mine ? 'border-primary' : 'border-white/15 hover:border-white/40'
                }`}
              >
                {/* The bar is the background, so the name always sits
                    on top of it rather than next to it.

                    `scaleX` on a full-width bar, not an animated
                    `width`: width is laid out and painted on every
                    frame, and four of them filling at once on a phone
                    is four layout passes a frame for no reason. */}
                <motion.span
                  aria-hidden
                  className={`absolute inset-y-0 left-0 w-full origin-left ${
                    mine ? 'bg-primary/35' : 'bg-white/10'
                  }`}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: shown ? share / 100 : 0 }}
                  // Staggered, so the result reads left to right as four
                  // results coming in rather than one block appearing.
                  transition={{ duration: 0.7, ease: EASE, delay: shown ? i * 0.08 : 0 }}
                />

                {/* A light running along the leading edge of the bar the
                    viewer picked, so their own choice keeps moving after
                    the others have settled. */}
                {mine && shown && !reduced && (
                  <motion.span
                    aria-hidden
                    className="absolute inset-y-0 left-0 w-full origin-left"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: share / 100 }}
                    transition={{ duration: 0.7, ease: EASE }}
                  >
                    <motion.span
                      className="absolute inset-y-0 right-0 w-px bg-primary"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </motion.span>
                )}

                <span className="relative flex items-baseline justify-between gap-3">
                  <span className="font-heading text-[clamp(0.82rem,2.8vw,1.05rem)] uppercase tracking-[0.08em] text-white">
                    {zone}
                  </span>
                  {/* Share and count together, the way a result board
                      prints them: 68% (300). The count is what makes
                      the percentage mean anything — 68% of four votes
                      is not a result. */}
                  {shown && (
                    <motion.span
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: EASE, delay: 0.45 + i * 0.08 }}
                      className="shrink-0 font-heading text-[13px] tabular-nums text-white/85"
                    >
                      {share.toFixed(0)}%
                      <span className="ml-1.5 text-[11.5px] text-white/45">({votes})</span>
                    </motion.span>
                  )}
                </span>
              </motion.button>
            );
          })}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.1 }}
          className={`mt-4 text-center text-[11.5px] leading-relaxed ${
            error ? 'text-primary/90' : 'text-white/35'
          }`}
        >
          {error ??
            (pending
              ? 'Counting…'
              : myVote
                ? `${total} ${total === 1 ? 'vote' : 'votes'} so far. Tap another side to change yours.`
                : 'Tap a side to call it.')}
        </motion.p>
      </div>
    </section>
  );
}
