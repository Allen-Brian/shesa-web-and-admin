'use client';

import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

import type { Player, Zone } from './cup-content';

/**
 * The marquee players, as a reel of panels that take turns opening.
 *
 * The screen is divided between the zone's players. One panel holds
 * roughly three quarters of the width and the rest are squeezed into
 * what is left; when the open one closes, the next takes its place.
 * Open, it shows the face, the nickname in full size, the name, the
 * position, the house and batch, and the honours. Closed, a panel is
 * a sliver with the name running vertically up it, so the viewer can
 * see who is still to come.
 *
 * ─── How the proportion is held ───────────────────────────────────────
 * `flexGrow`, not width. The open panel is given a grow factor equal
 * to three times the number of closed panels, which lands it at 75% of
 * the row for any squad size, and the remainder is shared evenly. With
 * five players that is 12 against four 1s. Animating width percentages
 * would need every panel to know the squad size and would fight the
 * flex container at the sub-pixel level.
 *
 * On a phone the row becomes a column and the identical grow factors
 * apply to height instead. Five vertical slivers on a 400px screen
 * would be 80px of face each, which is not a portrait.
 */

const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

/**
 * The shared grade.
 *
 * These photographs come from four different matches: one under
 * floodlights on green turf, one on red earth at dusk, one in morning
 * mist, one in flat afternoon light. Dropped side by side in a reel
 * they read as four unrelated pictures, which is what a grade is for.
 *
 * It is applied in CSS rather than baked into the files, so it is
 * reversible, costs no build step, and can be tuned against the real
 * layout instead of guessed at in an editor. The originals stay
 * untouched on disk.
 *
 * Saturation is pulled down and contrast pushed up — broadcast sport
 * grading, essentially — and a burgundy wash on `soft-light` gives
 * every frame the same cast without flattening skin tones the way a
 * `color` blend would.
 */
const GRADE = {
  open: 'contrast(1.12) saturate(0.82) brightness(0.95)',
  closed: 'grayscale(1) contrast(1.2) brightness(0.72)',
} as const;

/** Strength of the burgundy wash. Higher reads as a duotone. */
const TINT_OPEN = 0.2;
const TINT_CLOSED = 0.3;

/** Open panel takes `OPEN_SHARE` of the strip; the rest split the gap. */
const OPEN_SHARE = 0.75;

export function PlayerReel({
  zone,
  /** The whole slide's duration, divided between the players. */
  durationMs,
  /** Restarts the reel from the first player when the slide changes. */
  slideId,
  paused,
}: {
  readonly zone: Zone;
  readonly durationMs: number;
  readonly slideId: string;
  readonly paused: boolean;
}) {
  const reduced = useReducedMotion() ?? false;
  const [open, setOpen] = useState(0);
  const count = zone.players.length;
  const perPlayerMs = count > 0 ? durationMs / count : durationMs;

  // Back to the first player whenever the slide changes, so a replay
  // or a jump backwards does not resume mid-squad.
  useEffect(() => {
    setOpen(0);
  }, [slideId]);

  useEffect(() => {
    if (paused || count <= 1) return;
    const id = window.setTimeout(() => {
      setOpen((prev) => (prev + 1) % count);
    }, perPlayerMs);
    return () => window.clearTimeout(id);
  }, [open, paused, perPlayerMs, count, slideId]);

  // 12 against four 1s with a squad of five. Derived so a squad of
  // three or seven still lands the open panel at the same share.
  const openGrow = count > 1 ? (OPEN_SHARE * (count - 1)) / (1 - OPEN_SHARE) : 1;

  return (
    <div className="flex h-full w-full flex-col gap-1 md:flex-row">
      {zone.players.map((player, i) => (
        <ReelPanel
          key={player.name}
          player={player}
          index={i}
          isOpen={i === open}
          grow={i === open ? openGrow : 1}
          reduced={reduced}
          onSelect={() => setOpen(i)}
        />
      ))}
    </div>
  );
}

function ReelPanel({
  player,
  index,
  isOpen,
  grow,
  reduced,
  onSelect,
}: {
  readonly player: Player;
  readonly index: number;
  readonly isOpen: boolean;
  readonly grow: number;
  readonly reduced: boolean;
  readonly onSelect: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      aria-label={player.position ? `${player.name}, ${player.position}` : player.name}
      aria-expanded={isOpen}
      animate={{ flexGrow: grow }}
      transition={reduced ? { duration: 0 } : { duration: 0.75, ease: EASE }}
      style={{ flexGrow: grow, flexBasis: 0 }}
      className={`group relative min-h-0 min-w-0 overflow-hidden rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
        isOpen ? 'bg-neutral-900' : 'bg-neutral-950'
      }`}
    >
      {player.image ? (
        <>
          {/* A slow push on the open panel.

              The reel holds a face for a second and a half and the
              panel was a still photograph for all of it, which on a
              screen where everything else is moving reads as a frame
              that has frozen. The move is small — four per cent over
              the whole hold — because the point is that the picture is
              alive, not that it is zooming. */}
          <motion.div
            className="absolute inset-0"
            animate={{ scale: reduced || !isOpen ? 1 : 1.04 }}
            transition={{ duration: reduced ? 0 : 4, ease: 'linear' }}
          >
            <Image
              src={player.image}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 75vw"
              // Crop point comes from the photograph, not from a rule —
              // see `Player.focus`. `object-top` beheaded the full-body
              // shots and `object-center` cropped the faces off the
              // running ones.
              style={{
                objectPosition: player.focus ?? '50% 25%',
                filter: isOpen ? GRADE.open : GRADE.closed,
              }}
              className={`object-cover transition-all duration-700 ${
                isOpen ? 'scale-100' : 'scale-110'
              }`}
              quality={75}
              priority={index === 0}
            />
          </motion.div>
          {/* The unifying cast. Sits on the photograph only, under the
              readability wash and the type. */}
          <span
            aria-hidden
            className="absolute inset-0 bg-primary mix-blend-soft-light transition-opacity duration-700"
            style={{ opacity: isOpen ? TINT_OPEN : TINT_CLOSED }}
          />
        </>
      ) : (
        <PlatePlaceholder index={index} isOpen={isOpen} />
      )}

      {/* Readability wash. Heavier when open, because that is when
          there is type sitting on top of the picture. */}
      <span
        aria-hidden
        className={`absolute inset-0 transition-opacity duration-700 ${
          isOpen
            ? 'bg-gradient-to-t from-black via-black/55 to-black/15 opacity-100'
            : 'bg-black/55 opacity-100'
        }`}
      />

      <AnimatePresence mode="wait">
        {isOpen ? (
          <OpenDetail key="open" player={player} index={index} reduced={reduced} />
        ) : (
          <ClosedSpine key="closed" player={player} index={index} />
        )}
      </AnimatePresence>
    </motion.button>
  );
}

/** Everything the viewer gets while the panel is open. */
function OpenDetail({
  player,
  index,
  reduced,
}: {
  readonly player: Player;
  readonly index: number;
  readonly reduced: boolean;
}) {
  const rise = (delay: number) => ({
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, transition: { duration: 0.15 } },
    transition: { duration: reduced ? 0.2 : 0.55, ease: EASE, delay },
  });

  return (
    <motion.div
      key="open"
      className="absolute inset-0 flex flex-col justify-end gap-2 p-5 md:p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
    >
      {/* The squad number, enormous and nearly invisible behind the
          type. It is the one thing that changes size between panels,
          so it tells you the reel moved even out of the corner of
          your eye. */}
      <motion.span
        aria-hidden
        initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.3 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: reduced ? 0.2 : 0.9, ease: EASE }}
        className="pointer-events-none absolute right-4 top-2 font-heading text-[28vh] font-light leading-none text-white/[0.06]"
      >
        {String(index + 1).padStart(2, '0')}
      </motion.span>

      <motion.p
        {...rise(0.08)}
        className="font-heading text-[10px] font-semibold uppercase tracking-[0.36em] text-primary"
      >
        {/* The position is optional, so the separator goes with it
            rather than leaving a dangling middot. */}
        {String(index + 1).padStart(2, '0')}
        {player.position ? ` · ${player.position}` : ''}
      </motion.p>

      {player.nickname && (
        <motion.p
          {...rise(0.14)}
          className="font-heading text-[clamp(1.8rem,6vw,4.2rem)] font-light uppercase leading-[0.95] text-white"
        >
          “{player.nickname}”
        </motion.p>
      )}

      <motion.p
        {...rise(0.2)}
        className="font-heading text-[clamp(0.95rem,2.4vw,1.5rem)] font-light uppercase tracking-[0.16em] text-white/85"
      >
        {player.name}
      </motion.p>

      {/* Two players came without a house or batch, so this line can
          be empty — it collapses rather than leaving a gap. */}
      {(player.house || player.batch) && (
        <motion.p {...rise(0.26)} className="text-[13px] text-white/55">
          {[player.house, player.batch].filter(Boolean).join('  ·  ')}
        </motion.p>
      )}

      {player.accolades.length > 0 && (
        <motion.ul {...rise(0.32)} className="mt-1 flex flex-col gap-1">
          {player.accolades.map((accolade) => (
            <li
              key={accolade}
              className="flex items-baseline gap-2 text-[12.5px] leading-snug text-white/75"
            >
              <span aria-hidden className="h-1 w-1 shrink-0 rounded-full bg-primary" />
              {accolade}
            </li>
          ))}
        </motion.ul>
      )}
    </motion.div>
  );
}

/**
 * A closed panel. The name runs up the sliver on desktop, where the
 * panel is tall and narrow; on a phone the panel is short and wide, so
 * it stays horizontal.
 */
function ClosedSpine({ player, index }: { readonly player: Player; readonly index: number }) {
  return (
    <motion.div
      key="closed"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      className="absolute inset-0 flex items-center justify-center p-2"
    >
      <span className="font-heading text-[10px] font-semibold uppercase tracking-[0.3em] text-white/45 md:[writing-mode:vertical-rl] md:rotate-180">
        <span className="text-primary">{String(index + 1).padStart(2, '0')}</span>
        <span className="mx-2 md:my-2 md:mx-0 md:block" aria-hidden>
          ·
        </span>
        {player.nickname ?? player.name}
      </span>
    </motion.div>
  );
}

/** Stands in for a portrait that does not exist yet. */
function PlatePlaceholder({ index, isOpen }: { readonly index: number; readonly isOpen: boolean }) {
  return (
    <span aria-hidden className="absolute inset-0 bg-neutral-950">
      <span
        className="absolute inset-0"
        style={{
          background: `radial-gradient(70% 60% at 50% ${isOpen ? '34%' : '50%'}, color-mix(in srgb, var(--color-primary) ${isOpen ? 42 : 22}%, transparent) 0%, transparent 72%)`,
        }}
      />
      {isOpen && (
        <span className="absolute inset-x-0 top-[12%] text-center font-heading text-[26vh] font-light leading-none text-white/[0.05]">
          {String(index + 1).padStart(2, '0')}
        </span>
      )}
    </span>
  );
}
