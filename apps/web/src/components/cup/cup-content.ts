/**
 * Every fact and every timing for the Quartier trailer, in one file.
 *
 * ─── What is real ─────────────────────────────────────────────────────
 * Every name here is a real person, and all sixteen players now have
 * their own photograph. Nothing on this page is a placeholder any
 * more; it took several rounds to get there, and the reason it is
 * worth stating at the top is that an invented player is
 * indistinguishable from a real one once it is on screen.
 *
 * Positions and honours are left off wherever they were not supplied,
 * rather than filled in. A made-up position on a named man is exactly
 * the kind of placeholder that survives to production.
 *
 * Replacing the content is meant to be the whole job: edit this file,
 * change nothing else.
 *
 * ─── On the running time ──────────────────────────────────────────────
 * The trailer runs for exactly `RUNTIME_MS` no matter what is in here.
 * Slides carry a *weight*, not a duration, and the engine divides the
 * running time between them in proportion. Add a zone or a player and
 * everything else compresses slightly to make room; the trailer is
 * still 150 seconds. See `cup-slides.ts`.
 */

export interface Contact {
  readonly name: string;
  /**
   * Optional, and genuinely absent for one zone rather than filled
   * with a placeholder. A fake number on a page telling people to
   * call it is worse than no number: it reads as real, someone dials
   * it, and whoever owns it gets the calls.
   */
  readonly phone?: string;
}

export interface Player {
  readonly name: string;
  /** What the stands actually call him. Shown large on the open panel. */
  readonly nickname?: string;
  /**
   * Optional: the squad lists that come back from the zones do not
   * always carry one, and a made-up position on a real person is
   * worse than no position at all.
   */
  readonly position?: string;
  readonly house?: string;
  readonly batch?: string;
  /** Honours, most recent first. e.g. "Sacred Heart Ballon d'Or 2022". */
  readonly accolades: readonly string[];
  /**
   * Portrait. Optional and absent on every placeholder — see the note
   * at the top. With no image the panel renders a generated plate that
   * animates identically, so the mechanic can be judged now.
   */
  readonly image?: string;
  /**
   * Where to crop the photograph, as a CSS `object-position`.
   *
   * These are candid match pictures, not studio portraits: one is a
   * full-body celebration with the face a third of the way down, the
   * next is a running shot with the head near the top edge. A single
   * crop rule beheads half of them, so each picture carries its own.
   * Defaults to `50% 25%`, which suits most action framing.
   */
  readonly focus?: string;
}

export interface Zone {
  /** Official draw label from the fixtures flyer, e.g. "Zone One". */
  readonly designation: string;
  /**
   * The zone's identity, and the name its side plays under. Named for
   * the terrain its regions share rather than for a town — see the
   * note above the zone list.
   */
  readonly name: string;
  readonly regions: readonly string[];
  /** The branch holding the captaincy for this zone. */
  readonly captaincy: string;
  /** The marquee players, shown in the expanding reel. */
  readonly players: readonly Player[];
  /** The one person to call about this zone. */
  readonly contact: Contact;
}

export const CUP = {
  name: 'Quartier',
  edition: '2026',
  /** The tournament opens the AGM; see components/agm/agm-content.ts. */
  occasion: '2026 SHESA AGM',

  /** Winner takes all. There is no runner-up purse. */
  prize: {
    winner: 1_000_000,
    currency: 'XAF',
  },

  /** Friday 13 November, matching the AGM programme's opening day. */
  kickOff: '2026-11-13T15:00:00+01:00',

  venue: {
    name: 'Stade GP Melen',
    area: 'Melen',
    city: 'Yaoundé',
    country: 'Cameroon',
  },

  /** Pitch photography. Real, and carrying no identifiable faces. */
  stadium: [
    '/cup/stadium/stadium-01.jpg',
    '/cup/stadium/stadium-02.jpg',
    '/cup/stadium/stadium-03.jpg',
    '/cup/stadium/stadium-04.jpg',
    '/cup/stadium/stadium-05.jpg',
    '/cup/stadium/stadium-06.jpg',
    '/cup/stadium/stadium-07.jpg',
    '/cup/stadium/stadium-08.jpg',
  ],

  crest: '/shesa.png',

  /**
   * ─── On the zone names ───────────────────────────────────────────────
   * Each zone spans several regions, so it cannot be called after a
   * town without the rest of the zone reading as an afterthought. A
   * side named for Mankon does not belong to the West, and one named
   * for Douala does not belong to the South.
   *
   * So every zone is named for something all of its regions share:
   * the Atlantic seaboard, the seat of the capital, the western
   * Grassfields, and the mountain country of the South West. Nobody is
   * left out of a landscape they actually live in, and `Grassfields`
   * is already the word the AGM programme uses for that cluster.
   *
   * `Rocky Mountains` is Mount Cameroon, which stands over Buea,
   * Limbe and Tiko and is the South West's own emblem. A mountain
   * name rather than a coastal one, because Zone One already fronts
   * the Atlantic and two coastal sides would be indistinguishable on
   * a team sheet.
   *
   * `designation` keeps the official Zone One to Zone Four from the
   * fixtures flyer, because that is what the draw and the schedule
   * are written in.
   */
  zones: [
    {
      designation: 'Zone One',
      name: 'The Atlantic',
      regions: ['Littoral', 'South'],
      captaincy: 'Douala',
      // Real squad, with photographs. Note the files are `.jpeg` here
      // where every other squad's are `.jpg`.
      //
      // Players one and four came without a house or batch; those
      // fields are left off rather than guessed, and the reel drops
      // the line rather than printing an empty one.
      players: [
        // Also this zone's contact, below.
        {
          name: 'Kenah Yannick',
          nickname: 'Yanko',
          accolades: [],
          image: '/cup/players/douala-player-one.jpeg',
          // Upright, alone in frame, running left to right.
          focus: '50% 28%',
        },
        {
          name: 'Teche David',
          nickname: 'Busquets',
          house: 'St Francis',
          batch: 'Batch 2015',
          accolades: [],
          image: '/cup/players/douala-player-two.jpeg',
          // A team-mate stands behind him to the left; the crop sits
          // right of centre to keep the man on the ball.
          focus: '62% 32%',
        },
        {
          name: 'Tsekima Franklin',
          nickname: 'Tsekima',
          house: 'St Peters',
          batch: 'Batch 2011',
          accolades: [],
          image: '/cup/players/douala-player-three.jpeg',
          // The one landscape shot in this squad, so it crops hardest
          // on a phone. He is near the middle, which helps.
          focus: '48% 42%',
        },
        // ⚠ Nickname is spelled as it was supplied. If "Invisible"
        // was meant, it is one letter — and it is set in 4rem type.
        {
          name: 'Ngome Samuel',
          nickname: 'Invisble',
          accolades: [],
          image: '/cup/players/douala-player-four.jpeg',
          focus: '48% 28%',
        },
      ],
      contact: { name: 'Kenah Yannick', phone: '+237 6 75 41 16 85' },
    },
    {
      designation: 'Zone Two',
      name: 'La Capitale',
      regions: ['Centre', 'East', 'North'],
      captaincy: 'Yaoundé',
      // Real squad. No positions or honours supplied yet, and both are
      // optional rather than invented — a made-up position on a named
      // person is the sort of placeholder that survives to production.
      players: [
        {
          name: 'NUMEN Narcisse',
          nickname: 'Pa Tum',
          house: "St John's",
          batch: 'Batch 2004',
          accolades: [],
          image: '/cup/players/yde-player-one.jpg',
          focus: '50% 32%',
        },
        {
          name: 'NANA Leslie',
          nickname: 'NANI',
          house: "St John's",
          batch: 'Batch 2004',
          accolades: [],
          image: '/cup/players/yde-player-two.jpg',
          focus: '50% 18%',
        },
        {
          name: 'Njoh Akah Brian',
          nickname: 'Lacarta',
          house: 'St Thomas',
          batch: 'Batch 2010/2011',
          accolades: [],
          image: '/cup/players/yde-player-three.jpg',
          focus: '50% 14%',
        },
        {
          name: 'Yancho Henry Damase',
          nickname: 'Uncle D',
          house: 'St Francis',
          batch: 'Batch 2004',
          accolades: [],
          image: '/cup/players/yde-player-four.jpg',
          focus: '50% 16%',
        },
      ],
      contact: { name: 'Numen Narcisse', phone: '+237 6 79 68 71 49' },
    },
    {
      designation: 'Zone Three',
      name: 'The Grassfields',
      regions: ['North West', 'West'],
      captaincy: 'Bamenda',
      // Real squad. `focus` is per photograph because these are match
      // pictures: two of them have other players in frame, so the crop
      // has to favour the subject horizontally as well as vertically.
      players: [
        {
          name: 'Numen Emmanuel',
          nickname: 'Fenty',
          house: 'St Thomas',
          batch: 'Batch 2015',
          accolades: [],
          image: '/cup/players/bda-player-one.jpg',
          focus: '33% 33%',
        },
        {
          name: 'Nji Aloysius',
          nickname: 'Sancho',
          house: 'St Peters',
          batch: 'Batch 2012',
          accolades: [],
          image: '/cup/players/bda-player-two.jpg',
          focus: '48% 30%',
        },
        {
          name: 'ACHOH JUNIOR',
          nickname: 'ACHOH',
          house: 'St Francis',
          batch: 'Batch 2018',
          accolades: [],
          image: '/cup/players/bda-player-three.jpg',
          focus: '37% 20%',
        },
        {
          name: 'Colman Awantoh',
          nickname: 'Izzy Miles',
          house: "St John's",
          batch: 'Batch 2015',
          accolades: [],
          image: '/cup/players/bda-player-four.jpg',
          focus: '42% 18%',
        },
      ],
      contact: { name: 'Yousi Emmanuel', phone: '+237 6 82 30 22 48' },
    },
    {
      designation: 'Zone Four',
      name: 'Rocky Mountains',
      // Real squad, all four, with photographs. Positions and honours
      // are left off rather than invented — see the note on `Player`.
      regions: ['South West', 'Limbe', 'Kumba', 'Tiko'],
      captaincy: 'Buea',
      players: [
        // Real, and the zone's captain — the `captain` contact below
        // is the same man.
        {
          name: 'Kulu Rostand',
          nickname: 'Rusty',
          house: "St John's",
          batch: 'Batch 2009',
          accolades: [],
          image: '/cup/players/buea-player-1.jpg',
          // Portrait, shot from behind with the stand filling the top
          // third. Cropping any higher loses him to the roof; the name
          // across his shoulders does the identifying.
          focus: '55% 42%',
        },
        {
          name: 'Godson Tendongze',
          nickname: 'Subzy',
          house: 'St Francis',
          batch: 'Batch 2007',
          accolades: [],
          image: '/cup/players/buea-player-2.jpg',
          // Landscape, with four other players in frame. The crop has
          // to favour him left of centre or it lands on the defender.
          focus: '38% 16%',
        },
        {
          name: 'Ian Nangha M.',
          nickname: 'Yoro',
          house: 'St Thomas',
          batch: 'Batch 2012',
          accolades: [],
          image: '/cup/players/buea-player-three.jpg',
          // Two men in this frame — one sliding in low on the left,
          // one standing on the ball at the right. The crop takes the
          // standing player, who is the one in focus and in
          // possession. Swap to about '28% 62%' if that is the wrong
          // one.
          focus: '70% 28%',
        },
        {
          name: 'Tancho Eko',
          nickname: 'Peperouso',
          house: 'St Thomas',
          batch: 'Batch 2012',
          accolades: [],
          image: '/cup/players/buea-player-four.jpg',
          // The one clean single-subject portrait in the whole set:
          // upright, centred, nobody else in frame. Standing full
          // length though, so the crop still has to come up to find
          // his face.
          focus: '50% 30%',
        },
      ],
      contact: { name: 'Takwi Azong', phone: '+237 6 83 34 72 80' },
    },
  ] satisfies readonly Zone[],
} as const;

/**
 * The archive reel, in the order the media plays.
 *
 * ─── Ordering ─────────────────────────────────────────────────────────
 * The filename used to be the index. It no longer can be: the folder
 * now holds a `1.mp4` and a `1.jpeg`, a `3.mp4` and a `3.jpeg`, and so
 * on down to ten, so a number names two different pieces of media.
 *
 * So the reel is built instead of listed. The clips run first, in
 * their numbered order, and the stills follow as a shuffled burst.
 *
 * ─── Timing ───────────────────────────────────────────────────────────
 * Every hold is declared rather than read off the video element at
 * runtime, because the trailer is time-boxed: a reel whose length
 * depended on how fast a file buffered would push the running order
 * around on a slow connection. `onEnded` is wired as a backstop.
 *
 * A hold has to stay under the clip's real length, which is why three
 * of them sit at 4.5s — see the comments against the list.
 */
interface ArchiveBase {
  readonly src: string;
  /**
   * Where to crop, as a CSS `object-position`.
   *
   * The montage is full-bleed, so on a phone held upright a landscape
   * photograph loses most of its width and a centred crop lands on
   * whatever happened to be in the middle of the frame — usually grass.
   * This points the crop at the thing worth seeing: the player on the
   * ball, the keeper, the celebration. Defaults to `50% 45%`, which is
   * where the action sits in most of these.
   */
  readonly focus?: string;
  /**
   * An override used only on phone-width screens.
   *
   * One crop is usually enough, because both screens crop the same
   * picture in the same direction and differ only in how much. The
   * exception is very wide material: `10.mp4` is 2.4:1, so a laptop
   * shows about three quarters of its width where a phone held
   * upright shows roughly a quarter. A value that frames that shot
   * nicely on a laptop lands on empty pitch on a phone.
   *
   * Set it only when the two screens genuinely want different parts
   * of the frame. Left out, `focus` is used for both.
   */
  readonly focusNarrow?: string;
}

export type ArchiveItem =
  | ({ readonly kind: 'image' } & ArchiveBase)
  | ({
      readonly kind: 'video';
      readonly seconds: number;
      /**
       * Where in the clip to start, in seconds. Omit to start at the
       * top.
       *
       * This plays a segment rather than trimming the file, so the
       * source keeps its full quality and the choice stays
       * reversible. The cost is that the browser still fetches the
       * whole clip for the few seconds shown, which is worth trimming
       * properly once there is a tool to do it with.
       */
      readonly startSeconds?: number;
    } & ArchiveBase);

/** Crop used when a piece of media does not name its own. */
export const ARCHIVE_DEFAULT_FOCUS = '50% 45%';

/**
 * The clips, in the order they play.
 *
 * Order matters here and is left alone: footage has a shape, and a
 * goal landing before the build-up to it reads as a mistake. The
 * numbers are the filenames.
 *
 * Each `seconds` is a hold, and a hold has to stay *under* the clip's
 * real length — at or above it the clip reaches its end, `onEnded`
 * fires, and the reel advances on top of its own timer. Five seconds
 * is the house figure; the clips that cannot carry it are marked.
 *
 * `9.mp4` is missing on purpose: it is byte-for-byte the same file as
 * `7.mp4`. The pair has survived three renumberings now — delete one
 * of them and this comment can go.
 *
 * ─── Why the holds vary ───────────────────────────────────────────────
 * Eleven clips at five seconds each would be 55s against a 40s
 * montage, so the holds are graded by what each clip carries. The
 * walk-out leads at 4.5s; the anthem and the line-up get 3.75; the
 * rest sit between 2.5 and 3.5. That is shorter than this reel used
 * to run, and it is the right trade — eleven clips is a lot of
 * footage for forty seconds, and a montage that lingers stops being
 * a montage. One clip cannot reach any house figure at all and is
 * marked as the exception it is.
 *
 * Each `focus` was read off a frame of the clip rather than guessed —
 * several of these were shot on a phone held upright and are mostly
 * sky, so a centred crop lands on cloud.
 */
const ARCHIVE_CLIPS: readonly ArchiveItem[] = [
  // 10.67s, 360x640 upright. Teams walking out, stand behind.
  { kind: 'video', src: '/cup/archive/1.mp4', seconds: 4.5, focus: '50% 45%' },
  // 5.93s, 576x1024 upright. Match play from the stand, action
  // centre-right. Carries a burned-in story caption across the top.
  { kind: 'video', src: '/cup/archive/2.mp4', seconds: 3.25, focus: '58% 55%' },
  // 6.27s, 1024x576. The side lined up arm in arm, full width.
  { kind: 'video', src: '/cup/archive/3.mp4', seconds: 3.75, focus: '50% 42%' },
  // 5.47s, 576x1024 upright. Indoor pitch, the shot being struck.
  { kind: 'video', src: '/cup/archive/4.mp4', seconds: 3.25, focus: '52% 54%' },
  // 4.58s, 832x464. Players running across a dry pitch, spread wide.
  { kind: 'video', src: '/cup/archive/5.mp4', seconds: 2.75, focus: '48% 55%' },
  // 7.67s, 576x1024 upright. Half the frame is sky, so sit low.
  { kind: 'video', src: '/cup/archive/6.mp4', seconds: 3.25, focus: '50% 62%' },
  // 8.17s, 1024x576. The anthem. A head fills the right of frame, so
  // the crop favours the line of players.
  { kind: 'video', src: '/cup/archive/7.mp4', seconds: 3.75, focus: '45% 45%' },
  // 5.23s, 576x1024 upright. Same story caption as 2.
  { kind: 'video', src: '/cup/archive/8.mp4', seconds: 3.25, focus: '48% 58%' },
  // ⚠ 3.20s — the exception. Every other clip clears the house hold
  // with room; this one cannot, so it takes 2.5s and the margin is
  // 0.7s. Do not raise it without re-checking the clip is still this
  // short: at or above its real length the clip ends, `onEnded`
  // fires, and the reel double-advances past the next one.
  //
  // 480x848 upright, two players duelling for the ball centre-left.
  { kind: 'video', src: '/cup/archive/10.mp4', seconds: 2.5, focus: '32% 42%' },
  // 4.93s, 1280x720. Dust kicking up on a dry pitch, action centre-right.
  { kind: 'video', src: '/cup/archive/11.mp4', seconds: 3.25, focus: '58% 52%' },
  // 5.74s, 832x464. A night match under the lights, play centre-right
  // and low in the frame. The only floodlit footage in the reel, and
  // the last thing the montage shows.
  { kind: 'video', src: '/cup/archive/12.mp4', seconds: 3.5, focus: '58% 58%' },
];

/**
 * The stills, as a pool rather than a sequence.
 *
 * Their order is shuffled on every viewing, so the numbering here is
 * only there to make the list easy to check against the folder. The
 * filenames collide with the clips — `1`, `3`, `6`, `8`, `9` and `10`
 * each name both a video and a photograph — which is the other reason
 * the names cannot be the running order any more.
 */
const ARCHIVE_STILLS: readonly ArchiveItem[] = [
  // Each `focus` was read off the photograph rather than guessed: it
  // points at whoever has the ball, or at the middle of the group in
  // the team shots. On a phone that is the difference between the
  // montage showing a player and showing a patch of pitch.
  { kind: 'image', src: '/cup/archive/1.jpeg', focus: '42% 30%' }, // chesting it down
  { kind: 'image', src: '/cup/archive/8.jpg', focus: '38% 40%' }, // the stand, hands on head
  { kind: 'image', src: '/cup/archive/9.jpg', focus: '45% 45%' }, // the sliding challenge
  { kind: 'image', src: '/cup/archive/12.jpg', focus: '52% 45%' }, // running onto it
];

/** How long a still holds. Short on purpose: the stills are a burst. */
export const ARCHIVE_IMAGE_SECONDS = 0.75;

/** Fisher-Yates, on a copy. */
function shuffled<T>(items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * One pass of the reel: every clip in its numbered order, then the
 * stills as a shuffled burst.
 *
 * The footage is the substance and it leads. The photographs close it
 * out at three quarters of a second each — long enough to actually see
 * what is in one, short enough that eleven still read as a burst
 * rather than a slideshow.
 *
 * ─── Why the stills are shuffled ──────────────────────────────────────
 * The burst is the part of the pass nearest the edge: trim anything,
 * or add clips until the pass overruns its slot, and the stills are
 * what gets lost. Dealing them fresh each viewing means no single
 * photograph is permanently the one that misses out, and the montage
 * is not identical twice.
 *
 * Pass `random: false` for the declared order — the reel's first render
 * uses it so that a server render and the first client render agree.
 */
export function buildArchiveReel(random = true): ArchiveItem[] {
  return [...ARCHIVE_CLIPS, ...(random ? shuffled(ARCHIVE_STILLS) : ARCHIVE_STILLS)];
}

/**
 * One pass of the reel, in seconds.
 *
 * Currently 40.00 against the montage's 40s slot — eleven clips at
 * 37.0 and four stills at 3.0. Exactly full: everything plays once
 * and the slide cuts away as the last still ends, so there is no
 * wrap to see.
 *
 * Keep it that way. The slot is `gallery` in `cup-slides.ts`, and
 * the weights there are tuned to sum to exactly 150 — so taking more
 * for the montage means taking it off another slide, and letting the
 * pass overrun means the tail of the stills burst stops playing.
 */
export function archiveSeconds(): number {
  return [...ARCHIVE_CLIPS, ...ARCHIVE_STILLS].reduce(
    (sum, item) => sum + (item.kind === 'video' ? item.seconds : ARCHIVE_IMAGE_SECONDS),
    0,
  );
}

/** How long the whole trailer runs, start to finish. */
export const RUNTIME_MS = 150_000;

/**
 * Seconds each marquee player holds the open panel.
 *
 * At 1.5s the reel is a flick-through rather than a read: you catch a
 * face, a nickname and a shape, and the detail is there for anyone who
 * taps a panel to hold it. That is a deliberate trade — twenty players
 * at a readable pace would be most of the trailer.
 */
export const SECONDS_PER_PLAYER = 1.5;

/**
 * The night's schedule. Four teams means two semi-finals and a final,
 * all on the same evening.
 *
 * Written out rather than derived from the zones: who meets whom is a
 * draw, not an ordering, and a draw is a decision somebody makes.
 */
export const FIXTURES = [
  {
    label: 'Semi-final One',
    home: 'La Capitale',
    away: 'Rocky Mountains',
    kickOff: '15:00',
  },
  {
    label: 'Semi-final Two',
    home: 'The Atlantic',
    away: 'The Grassfields',
    kickOff: '15:00',
  },
  {
    label: 'The Final',
    home: 'Winner, Semi One',
    away: 'Winner, Semi Two',
    kickOff: '17:30',
  },
] as const;

/**
 * Atmosphere cards.
 *
 * Short, loud, and carrying no information at all — which is the
 * point. They sit between the sections that do carry information and
 * give the eye somewhere to rest, the way a trailer cuts to a wide
 * shot between two close-ups. `quartier` is the tournament's own name
 * and the Cameroonian word for a neighbourhood, so the copy leans on
 * the double meaning.
 */
export const AMBIANCE = [
  { id: 'amb-roots', line: 'EVERY QUARTIER', accent: 'HAS A SIDE.' },
  { id: 'amb-stake', line: 'NINETY MINUTES.', accent: 'NO SECOND LEG.' },
  { id: 'amb-pride', line: 'YOU DO NOT PLAY', accent: 'FOR YOURSELF.' },
  { id: 'amb-noise', line: 'BRING THE', accent: 'WHOLE QUARTIER.' },
  { id: 'amb-night', line: 'ONE NIGHT', accent: 'DECIDES IT.' },
  /**
   * The sign-off, and the slide the trailer comes to rest on. It
   * repeats the date because that is the one thing a viewer has to
   * leave with, and a closing card is the last chance to give it.
   */
  { id: 'amb-bethere', line: 'BE THERE.', accent: '13 NOVEMBER.' },
] as const;

/**
 * Sample tallies for the closing poll.
 *
 * Placeholder, like everything else in this file, and labelled as such
 * on screen. They exist so the bars have something to animate against
 * — not to suggest anybody has voted. Connecting the poll to real
 * storage is a separate piece of work; see `use-cup-poll.ts`.
 */
export const SAMPLE_VOTES: Readonly<Record<string, number>> = {
  'The Atlantic': 412,
  'La Capitale': 388,
  'The Grassfields': 331,
  'Rocky Mountains': 274,
};

/** Derived counts, so no sentence has to hard-code a number. */
export const ZONE_COUNT = CUP.zones.length;
export const TEAM_COUNT = CUP.zones.length;

const NUMBER_WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
] as const;

/** `4` → `'four'`. Falls back to digits past twelve. */
export function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

export function capitalise(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/** The three cards of the cold open, before the name lands. */
export const COLD_OPEN: readonly string[] = [
  'ONE TOURNAMENT.',
  `${numberWord(ZONE_COUNT).toUpperCase()} ZONES.`,
  'ONE NIGHT.',
];

export const SHARE_DESCRIPTION =
  `${capitalise(numberWord(TEAM_COUNT))} teams. ` +
  `${capitalise(numberWord(ZONE_COUNT))} zones. ` +
  `One night in ${CUP.venue.city}.`;

/**
 * The soundtrack. Put the file at `apps/web/public/cup-sound.m4a`.
 *
 * It is not in the repository yet, and that is handled rather than
 * assumed: a missing file resolves to silence, the synthesised cues
 * still fire, and nothing logs an error or shows a broken-audio icon.
 *
 * Cut it to `RUNTIME_MS`. The track in the repository runs 149.6s
 * against a 150s trailer, which is what it should be: the music
 * resolves and the closing slide sits in silence for a beat. It is
 * played once rather than looped, so a short track trails off rather
 * than seaming back to its intro.
 *
 * Safari and Chrome both play `audio/mp4`, so .m4a is a safe container.
 */
export const MUSIC_SRC = '/cup-sound.m4a';

/** `1000000` → `'1,000,000'`. */
export function formatPrize(value: number): string {
  return new Intl.NumberFormat('en-GB').format(Math.round(value));
}
