import { AMBIANCE, COLD_OPEN, CUP, RUNTIME_MS, SECONDS_PER_PLAYER, type Zone } from './cup-content';

/**
 * The running order, and how the 150 seconds are divided between it.
 *
 * ─── Weights, written as seconds ──────────────────────────────────────
 * A slide declares how much of the trailer it deserves relative to the
 * others, and the engine divides `RUNTIME_MS` in proportion. That is
 * what keeps the running time at exactly 150 seconds when a zone or a
 * player is added: everything else compresses to pay for it, rather
 * than the trailer quietly becoming 190 seconds.
 *
 * The numbers below are written as the seconds each slide is *meant*
 * to get, and they are tuned to sum to 150. So while the content is
 * what it is, the normalisation is the identity and the table reads as
 * a running order you can check with a stopwatch. Change the content
 * and the ratios still hold.
 *
 * `MIN_SLIDE_MS` guards the floor, and `planRuntime` reports when the
 * floor was hit rather than silently squeezing a slide past legibility.
 */

export type SlideKind =
  | 'cold-open'
  | 'name'
  | 'prize'
  | 'ambiance'
  | 'fixtures'
  | 'road'
  | 'zone'
  | 'players'
  | 'stadium'
  | 'date'
  | 'time'
  | 'gallery'
  | 'contacts'
  | 'finale';

export interface Slide {
  readonly id: string;
  readonly kind: SlideKind;
  /** Share of the running time, relative to every other slide. */
  readonly weight: number;
  /** Set on `zone` and `players` slides. */
  readonly zone?: Zone;
  /** Set on `cold-open` slides. */
  readonly text?: string;
  /** Set on `ambiance` slides. */
  readonly ambiance?: (typeof AMBIANCE)[number];
}

/** Below this a slide cannot be read, however tight the budget. */
const MIN_SLIDE_MS = 1200;

/**
 * Seconds per slide. These are the dial to turn when the pacing is
 * wrong. They are ratios under the hood, so nudging one does not break
 * the total; it just takes time from everything else.
 *
 * The zone cards are deliberately the shortest thing with words on
 * them. A zone slide is a signpost — a name and two or three regions —
 * and it is immediately followed by twelve seconds of that zone's
 * faces, so holding it longer only delays what it is announcing.
 *
 * `players` is set from `SECONDS_PER_PLAYER` rather than typed in,
 * because the reel divides its slide between the squad and three
 * seconds a face was an explicit decision, not a by-product.
 */
const SECONDS = {
  coldOpenCard: 2.5,
  name: 2.5,
  prize: 4.5,
  ambiance: 3.0,
  fixtures: 6.5,
  road: 7.0,
  zone: 4.0,
  /**
   * The run of cards between the last squad and the stadium. Shorter
   * than the single card after the bracket, because they arrive four
   * in a row: at 2s each the block reads as four separate statements,
   * at 1.5s it reads as one accelerating build, which is what a run of
   * cards back to back is for.
   */
  ambianceRun: 3.0,
  /**
   * The closing card, which also carries the poll.
   *
   * It is the slide the trailer comes to rest on: once its time is up
   * the sequence ends and this stays on screen indefinitely with the
   * replay control. That is exactly why the vote lives here. As a
   * separate slide the poll held for five seconds and then vanished
   * for the rest of the trailer, so nobody could ever have voted in
   * it; on the resting slide it is available for as long as the
   * viewer cares to look at it.
   *
   * The eight seconds are the old sign-off and the old poll slide
   * added together, so merging them cost the running order nothing.
   */
  finale: 6.0,
  stadium: 5.0,
  date: 2.75,
  time: 3.25,
  /**
   * The archive montage carries the slack.
   *
   * Every other hold here was chosen deliberately, and the player
   * reels are fixed by `SECONDS_PER_PLAYER`. Those together come to
   * 110s, so the montage fills the gap to the 150s running time
   * rather than each other slide being nudged off the figure it was
   * given.
   *
   * ─── The montage paid for the rest of the trailer ───────────────────
   * The cold open went to 2.5s a card, the atmosphere cards to 3s,
   * and each zone to 4s. That is 13.7s, and all of it came off
   * `gallery`, which dropped from 56.3 to 42.6 and from 38% of the
   * trailer to 28%. The clips were re-cut to fit rather than letting the tail of
   * the reel stop playing — see `ARCHIVE_CLIPS`.
   *
   * ─── Where the time went the round before ───────────────────────────
   * The zone cards, the player reel, the date and the kick-off were
   * all given more room, which cost 7.86s that had to come out of
   * everything else. The cold open, the atmosphere cards, the
   * bracket, the fixtures, the sign-off, the contacts and the stadium
   * each gave some back. `prize` and `name` were left alone: they are
   * the two the trailer is built around.
   *
   * `stadium` was 4.5s across eight photographs — 0.56s each, which
   * is a flicker rather than a walk round the ground. Its list is now
   * four plates at 1.25s each, and the extra half second came off the
   * montage, which had the most to spare.
   *
   * ─── This was wrong for a while ─────────────────────────────────────
   * As clips and players were added the table drifted to 162s. The
   * weights are ratios, so the trailer still ran 150s — but every
   * slide played at 92.6% of its stated figure, which is why
   * animations tuned to these numbers were being clipped. Bringing it
   * back to 150 came out of here, out of `ambianceRun` and out of
   * `stadium`, and it bought the date and the kick-off real time back
   * rather than nominal time.
   *
   * It is also the only genuinely elastic slide: it is a three-frame
   * collage on a rolling cycle, so it plays for however long it is
   * given with however many photographs exist.
   */
  gallery: 44.85,
  contacts: 2.75,
} as const;

/**
 * The numbers above are tuned to sum to exactly 150 for the content
 * currently in `cup-content.ts`, which makes the normalisation below
 * the identity and the requested figures exact: a cold-open card is
 * 2.0s and not 2.03s, a player holds 1.5s and not 1.52s.
 *
 * They are still ratios. Change the content and the total stays 150
 * while these drift off their stated seconds, which is the right
 * trade: the running time is the promise, the individual holds are the
 * preference.
 */

/**
 * The one atmosphere card that keeps its old place, immediately after
 * the bracket. "Ninety minutes, no second leg" is the caption to the
 * road it has just drawn, so it belongs there rather than in the run
 * at the end. Matched by id so reordering `AMBIANCE` cannot silently
 * move a different card into the slot.
 */
const CARD_AFTER_ROAD = 'amb-stake';

/**
 * The card the trailer finishes on, after the archive. Held out of
 * the run in the middle for the same reason as `CARD_AFTER_ROAD`:
 * matched by id so reordering `AMBIANCE` cannot move a different card
 * into the closing slot.
 */
const CARD_FINALE = 'amb-bethere';

/**
 * Every weight in the running order, players included, in seconds.
 *
 * The player reels are the one block whose length is not in `SECONDS`
 * — it comes from `SECONDS_PER_PLAYER` and the size of each squad —
 * which made the table above look like it summed to less than it did.
 * This computes the real figure so the arithmetic can be checked at a
 * glance, and `assertRuntime` below shouts if it drifts off 150.
 */
export function totalWeightSeconds(): number {
  const cards = AMBIANCE.length;
  return (
    COLD_OPEN.length * SECONDS.coldOpenCard +
    SECONDS.name +
    SECONDS.prize +
    SECONDS.fixtures +
    SECONDS.road +
    SECONDS.ambiance +
    // Two cards are placed by hand — one after the bracket, one at the
    // very end — so only the rest run at the shorter block hold.
    (cards - 2) * SECONDS.ambianceRun +
    SECONDS.finale +
    CUP.zones.length * SECONDS.zone +
    CUP.zones.reduce((sum, zone) => sum + playersSeconds(zone), 0) +
    SECONDS.stadium +
    SECONDS.date +
    SECONDS.time +
    SECONDS.gallery +
    SECONDS.contacts
  );
}

/**
 * Whether the weights are written as literal seconds.
 *
 * When they sum to the running time the normalisation in
 * `planRuntime` is the identity, so a slide written as 2.5 really
 * holds for 2.5s. When they do not, every hold is scaled and the
 * numbers in the table stop meaning seconds — which is easy to do by
 * accident while tuning and impossible to see by reading.
 */
export function weightsAreLiteralSeconds(runtimeMs = RUNTIME_MS): boolean {
  return Math.abs(totalWeightSeconds() - runtimeMs / 1000) < 0.01;
}

/** One zone's reel: every player gets `SECONDS_PER_PLAYER`. */
function playersSeconds(zone: Zone): number {
  return Math.max(1, zone.players.length) * SECONDS_PER_PLAYER;
}

/**
 * The running order.
 *
 * Atmosphere cards are placed rather than sprinkled: one after the
 * prize to let it land, one as the zones begin, one at the halfway
 * point of the reels where attention sags, and one immediately before
 * the stadium so the venue arrives off the back of a held breath.
 */
export function buildSlides(): Slide[] {
  const slides: Slide[] = COLD_OPEN.map((text, i) => ({
    id: `cold-${i}`,
    kind: 'cold-open' as const,
    weight: SECONDS.coldOpenCard,
    text,
  }));

  slides.push({ id: 'name', kind: 'name', weight: SECONDS.name });
  slides.push({ id: 'prize', kind: 'prize', weight: SECONDS.prize });

  // What the night actually is, before who is in it.
  slides.push({ id: 'fixtures', kind: 'fixtures', weight: SECONDS.fixtures });
  slides.push({ id: 'road', kind: 'road', weight: SECONDS.road });

  const ambianceCard = (card: (typeof AMBIANCE)[number], weight: number): Slide => ({
    id: card.id,
    kind: 'ambiance',
    weight,
    ambiance: card,
  });

  const afterRoad = AMBIANCE.find((c) => c.id === CARD_AFTER_ROAD);
  if (afterRoad) slides.push(ambianceCard(afterRoad, SECONDS.ambiance));

  // Each zone names itself, then hands straight to its own faces, so a
  // viewer meets a region and its players together rather than holding
  // four zone names in their head until a single combined reel. The
  // run is unbroken: nothing is allowed between a zone and its squad,
  // or between one zone and the next.
  CUP.zones.forEach((zone) => {
    slides.push({ id: `zone-${zone.name}`, kind: 'zone', weight: SECONDS.zone, zone });
    slides.push({
      id: `players-${zone.name}`,
      kind: 'players',
      weight: playersSeconds(zone),
      zone,
    });
  });

  // The rest of the atmosphere cards, together, once the last squad
  // has been seen. They used to be dealt out between the sections as
  // breathers; collected here they do the opposite job — four short
  // slams back to back, building out of the reels and into the
  // stadium. The two seconds saved by running them faster go to the
  // archive montage, so Contacts still begins at 2:20.
  AMBIANCE.filter((c) => c.id !== CARD_AFTER_ROAD && c.id !== CARD_FINALE).forEach((card) => {
    slides.push(ambianceCard(card, SECONDS.ambianceRun));
  });

  slides.push({ id: 'stadium', kind: 'stadium', weight: SECONDS.stadium });
  slides.push({ id: 'date', kind: 'date', weight: SECONDS.date });
  slides.push({ id: 'time', kind: 'time', weight: SECONDS.time });

  slides.push({ id: 'contacts', kind: 'contacts', weight: SECONDS.contacts });

  // The archive closes the advert: once the night has been explained
  // and the viewer has been asked for something, the last word is what
  // these tournaments have looked like before.
  slides.push({ id: 'gallery', kind: 'gallery', weight: SECONDS.gallery });

  const finale = AMBIANCE.find((c) => c.id === CARD_FINALE);
  slides.push({
    id: 'finale',
    kind: 'finale',
    weight: SECONDS.finale,
    ambiance: finale,
  });

  return slides;
}

export interface TimedSlide extends Slide {
  readonly durationMs: number;
  /** Milliseconds from the start of the trailer to this slide's start. */
  readonly startMs: number;
}

export interface RuntimePlan {
  readonly slides: readonly TimedSlide[];
  readonly totalMs: number;
  /** True when a slide hit `MIN_SLIDE_MS` and the total had to stretch. */
  readonly overflowed: boolean;
}

/**
 * Divides `runtimeMs` across the running order by weight.
 *
 * Two passes. The first hands every slide its proportional share. If
 * nothing fell below the floor, that is the answer and the total is
 * exact. If something did, it is pinned at the floor and the rest
 * redistribute — which can push the total past the target, and
 * `overflowed` says so rather than hiding it.
 */
export function planRuntime(slides: readonly Slide[], runtimeMs = RUNTIME_MS): RuntimePlan {
  const totalWeight = slides.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight <= 0 || slides.length === 0) {
    return { slides: [], totalMs: 0, overflowed: false };
  }

  const raw = slides.map((s) => (s.weight / totalWeight) * runtimeMs);
  const pinned = raw.map((ms) => ms < MIN_SLIDE_MS);
  const overflowed = pinned.some(Boolean);

  let durations = raw;
  if (overflowed) {
    const pinnedTotal = pinned.reduce((sum, isPinned) => sum + (isPinned ? MIN_SLIDE_MS : 0), 0);
    const freeWeight = slides.reduce((sum, s, i) => sum + (pinned[i] ? 0 : s.weight), 0);
    const freeTime = Math.max(0, runtimeMs - pinnedTotal);
    durations = slides.map((s, i) =>
      pinned[i] ? MIN_SLIDE_MS : freeWeight > 0 ? (s.weight / freeWeight) * freeTime : MIN_SLIDE_MS,
    );
  }

  let cursor = 0;
  const timed = slides.map((slide, i) => {
    const durationMs = Math.round(durations[i] ?? MIN_SLIDE_MS);
    const withTiming: TimedSlide = { ...slide, durationMs, startMs: Math.round(cursor) };
    cursor += durationMs;
    return withTiming;
  });

  return { slides: timed, totalMs: Math.round(cursor), overflowed };
}
