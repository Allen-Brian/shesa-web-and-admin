/**
 * Every fact, every line of voiceover and every running order for the
 * SHESA Digital Platforms reels, in one file.
 *
 * Two reels are built from it:
 *
 *   /platforms/pitch   For EXCO and funders. Voiceover-driven: what is
 *                      already live, the six platforms, traction, the
 *                      revenue model and the investment. ~5 minutes.
 *   /platforms/screen  For the giant screens at the venue. No figures,
 *                      bigger type, music bed, loops forever. ~2 minutes.
 *
 * ─── Sources ──────────────────────────────────────────────────────────
 * The pitch deck "SHESA Digital Platforms" (DIRA, May 2026) and the
 * store addendum DIRA-ADDENDUM-2026-SHESA-001 (October 2026). Where the
 * two disagree, the addendum wins, because it is later: the ecosystem
 * is six platforms. The Phase I engagement is stated as ~20,000,000 XAF,
 * as instructed by DIRA (the contract sum is 18,750,000 XAF).
 *
 * ─── What is real and what is a preview ───────────────────────────────
 * The website, EXCO portal, admin console and Finance App are shown
 * with real screenshots of the running code (`/platforms/shots`). Most
 * admin screens were captured against the repository's demo seed, so
 * the member counts and names on them are fixtures, not SHESA's data.
 * The exception is `finance-transactions-live.jpg`, taken from the live
 * Finance portal with payer names hidden by the page's own toggle.
 *
 * SHESA Connect and the store are not in this repository, so they are
 * drawn in code and carry a "Design preview" tag on screen. Replace
 * either with real screenshots by adding `shots` to its entry below —
 * a platform with shots shows them instead of the drawn mockup.
 *
 * ─── Voiceover ────────────────────────────────────────────────────────
 * Each pitch scene carries its `vo` line. Record one file per scene and
 * drop it at `public/platforms/vo/<scene id>.mp3`. The reel measures each
 * file on load and holds the scene for as long as its line takes, so the
 * picture always waits for the voice. A scene with no file falls back
 * to a hold estimated from its word count. The full script, numbered,
 * is in `docs/product/platforms-reel-voiceover.md`.
 */

export type PlatformId = 'website' | 'exco' | 'admin' | 'connect' | 'finance' | 'store';

export interface Shot {
  readonly src: string;
  /** `scroll` pans a tall full-page capture top to bottom; `still` holds. */
  readonly motion: 'scroll' | 'still';
}

export interface Platform {
  readonly id: PlatformId;
  readonly name: string;
  /** The small red line above the name. */
  readonly kicker: string;
  readonly tagline: string;
  readonly features: readonly string[];
  /** The one line the venue reel shows, in very large type. */
  readonly venueLine: readonly [string, string];
  /** Shown in the browser frame's address bar. */
  readonly url?: string;
  /**
   * The badge under the name. ⚠ Check these before presenting: they
   * describe where each platform stands, and a funder will hold SHESA to
   * them.
   */
  readonly status: string;
  readonly device: 'browser' | 'phone';
  /** Real screenshots. Empty means the drawn mockup is shown. */
  readonly browserShots: readonly Shot[];
  readonly phoneShots: readonly Shot[];
}

export const PLATFORMS: readonly Platform[] = [
  {
    id: 'website',
    name: 'Public Website',
    kicker: 'Institutional presence',
    tagline: "SHESA's face to every funder, partner and member.",
    features: [
      'News, events, leadership and projects',
      'AGM registration and ticket payments',
      'Awards nominations and voting',
      'Mobile money checkout, built in',
    ],
    venueLine: ['EVERYTHING SHESA.', 'ONE ADDRESS.'],
    url: 'shesaconnect.com',
    status: 'Live',
    device: 'browser',
    browserShots: [
      { src: '/platforms/shots/website-home.jpg', motion: 'scroll' },
      { src: '/platforms/shots/website-agm.jpg', motion: 'scroll' },
    ],
    phoneShots: [{ src: '/platforms/shots/website-mobile.jpg', motion: 'scroll' }],
  },
  {
    id: 'exco',
    name: 'EXCO Portal',
    kicker: 'Content management',
    tagline: 'Officers publish for themselves. No developer required.',
    features: [
      'News, events, galleries and songs',
      'Leadership and organ pages',
      'Award ceremonies, ballots and results',
      'Role-based access and a full audit trail',
    ],
    venueLine: ['YOUR OFFICERS.', 'YOUR STORY.'],
    url: 'admin.shesaconnect.com/editor',
    status: 'Live',
    device: 'browser',
    browserShots: [
      { src: '/platforms/shots/exco-dashboard.jpg', motion: 'still' },
      { src: '/platforms/shots/exco-news.jpg', motion: 'still' },
      { src: '/platforms/shots/exco-events.jpg', motion: 'still' },
      { src: '/platforms/shots/exco-voting.jpg', motion: 'still' },
    ],
    phoneShots: [],
  },
  {
    id: 'admin',
    name: 'Admin Console',
    kicker: 'Governance nerve centre',
    tagline: 'Every branch on one dashboard. One source of truth.',
    features: [
      'Branches, chapters, batches and houses',
      'Members, memberships and invitations',
      'Events, announcements and settings',
      'An audit log on every change',
    ],
    venueLine: ['EVERY BRANCH.', 'ONE DASHBOARD.'],
    url: 'admin.shesaconnect.com/exco',
    status: 'Live',
    device: 'browser',
    browserShots: [
      { src: '/platforms/shots/admin-dashboard.jpg', motion: 'still' },
      { src: '/platforms/shots/admin-branches.jpg', motion: 'still' },
      { src: '/platforms/shots/admin-batches.jpg', motion: 'still' },
      { src: '/platforms/shots/admin-events.jpg', motion: 'still' },
    ],
    phoneShots: [],
  },
  {
    id: 'connect',
    name: 'SHESA Connect',
    kicker: 'Android + iOS',
    tagline: 'The app every Shesan installs.',
    features: [
      'A verified profile on a unique matricule',
      'Messaging, mentorship and a job board',
      'Events, AGM and official announcements',
      'Dues and donations by MoMo, Orange or card',
      'Offline-first, in English and French',
    ],
    venueLine: ['EVERY SHESAN.', 'IN YOUR POCKET.'],
    status: 'Mobile app',
    device: 'phone',
    browserShots: [],
    phoneShots: [],
  },
  {
    id: 'finance',
    name: 'Finance App',
    kicker: 'Financial transparency',
    tagline: 'Every franc visible, approved and auditable.',
    features: [
      'Contributions, charges and donations by branch',
      'MoMo and card payments integrated, live',
      'Expenses behind an approval chain',
      'One-click reports for the AGM and auditors',
    ],
    venueLine: ['EVERY FRANC.', 'ACCOUNTED FOR.'],
    url: 'admin.shesaconnect.com/finance',
    status: 'Live',
    device: 'browser',
    browserShots: [
      // Live production data (10 Nov 2026, 846K XAF collected), captured with "Hide names" on.
      { src: '/platforms/shots/finance-transactions-live.jpg', motion: 'still' },
      { src: '/platforms/shots/finance-contributions.jpg', motion: 'still' },
      { src: '/platforms/shots/finance-reports.jpg', motion: 'still' },
    ],
    phoneShots: [],
  },
  {
    id: 'store',
    name: 'SHESA Store',
    kicker: 'Official merchandise',
    tagline: 'Wear the crest, at home and in the diaspora.',
    features: [
      'Clothing, accessories, publications, stationery',
      'Checkout by MTN MoMo, Orange Money or card',
      'Order tracking from confirmed to delivered',
      'Catalogue and orders managed by SHESA',
    ],
    venueLine: ['WEAR THE CREST.', 'ONLINE, SOON.'],
    url: 'store.shesaconnect.com',
    status: 'New · in build',
    device: 'browser',
    browserShots: [],
    phoneShots: [],
  },
];

export function platform(id: PlatformId): Platform {
  const found = PLATFORMS.find((p) => p.id === id);
  if (!found) throw new Error(`Unknown platform ${id}`);
  return found;
}

/** The four pillars of the 2026–2030 Strategic Plan, and who delivers each. */
export const PILLARS = [
  {
    n: 'I',
    name: 'Governance & Institutional Unity',
    by: 'Admin Console · SHESA Connect',
  },
  {
    n: 'II',
    name: 'Member Engagement & Professional Network',
    by: 'SHESA Connect',
  },
  {
    n: 'III',
    name: 'Financial Sustainability & Credibility',
    by: 'Finance App · Store · Connect',
  },
  {
    n: 'IV',
    name: 'Strategic Partnerships & Societal Impact',
    by: 'Public Website · EXCO Portal',
  },
] as const;

/** Challenge named in the plan → what the platforms change. */
export const PROBLEMS = [
  { problem: 'Fragmented governance', answer: 'One governance nerve centre' },
  { problem: 'No verified member record', answer: 'Every Shesan in one verified place' },
  { problem: 'Opaque, dues-dependent finances', answer: 'Finances open, auditable, bankable' },
  { problem: 'Younger alumni drifting away', answer: 'Batches absorbed, not lost' },
] as const;

export const MEMBER_RECORD = {
  /** Placeholder identity — the same name the website's forms use. */
  name: 'Ndifon Peter',
  matricule: 'SH-2010-0417',
  house: 'St Thomas',
  batch: 'Batch 2010',
  yearIn: '2005',
  yearOut: '2010',
  branch: 'Shesa Yaoundé',
  facts: [
    'One unique matricule. Duplicates flagged at entry.',
    'Year in and year out at Sacred Heart.',
    'Every branch feeds one national register.',
    'Every change logged: who, when and why.',
    'SAHECO integration-ready API.',
  ],
} as const;

/** How the platforms feed one another. */
export const FLOWS = [
  { from: 'SHESA Connect', what: 'Dues & donations', to: 'Finance App' },
  { from: 'SHESA Store', what: 'Orders & payments', to: 'Finance App' },
  { from: 'Admin Console', what: 'Announcements', to: 'SHESA Connect' },
  { from: 'EXCO Portal', what: 'News & events', to: 'Public Website' },
] as const;

/**
 * What the platforms can do, stated as capabilities. Vendor and framework
 * names are deliberately left off: the audience is buying outcomes, and
 * a stack list invites the wrong conversation.
 */
export const TECH = [
  { name: 'MTN MoMo · Orange Money', role: 'Mobile money' },
  { name: 'Visa · Mastercard', role: 'Card payments for the diaspora' },
  { name: 'Android + iOS', role: 'One app, both stores' },
  { name: 'Bank-grade security', role: 'Encrypted, access-controlled' },
  { name: 'Fast everywhere', role: 'Global delivery network' },
  { name: 'Daily backups', role: 'Data owned by SHESA' },
  { name: 'Push notifications', role: 'Reach every member' },
  { name: 'Health monitoring', role: 'Problems caught early' },
] as const;

/** Revenue model, from the deck's projection. Millions of XAF. */
export const REVENUE = {
  years: [
    { label: 'Year 1', users: 1200, revenue: 0, net: 0, note: 'Free · build the network' },
    { label: 'Year 2', users: 3500, revenue: 4.6, net: 4.0, note: 'Soft fees' },
    { label: 'Year 3', users: 7000, revenue: 13.9, net: 13.2, note: 'All 8 streams' },
    { label: 'Year 4', users: 12000, revenue: 22.3, net: 21.45, note: 'Full stack' },
  ],
  streams: [
    'Platform fee · 1,000 XAF/yr',
    'Dues processing · 3%',
    'Event ticketing · 5%',
    'Announcements · 1,000 XAF',
    'Job listings · 2,500 XAF',
    'Business badge · 15,000 XAF/yr',
    'Sponsored posts · 25,000 XAF',
    'Donations · 1.5%',
  ],
  /** Not in the deck's projection, so shown without a figure. */
  plus: '+ merchandise sales through the store',
} as const;

export const INVESTMENT = {
  rows: [
    {
      label: 'Six integrated platforms',
      detail:
        'Website · EXCO Portal · Admin Console · SHESA Connect · Finance App · SHESA Store — incl. 3-year infrastructure reserve',
    },
  ],
  /** Rounded on purpose, and shown with a tilde. */
  total: 20_000_000,
  label: 'Total engagement',
  /** Set large beside the figure. */
  phase: 'Phase I',
  benchmark: 'International quotes for equivalent scope: USD 88,000 – 293,000',
} as const;

/**
 * What is already running in production. ⚠ Keep this honest: it is the
 * scene a funder will check.
 */
export const LIVE_NOW = [
  {
    name: 'Public Website',
    where: 'shesaconnect.com',
    points: [
      'AGM registration & tickets',
      'Awards nominations & voting',
      'News, events, leadership',
    ],
  },
  {
    name: 'Admin Console',
    where: 'admin.shesaconnect.com',
    points: ['Branches, batches & houses', 'Members & events', 'Every change audited'],
  },
  {
    name: 'Finance App',
    where: 'admin.shesaconnect.com/finance',
    points: [
      'MoMo & card payments integrated',
      'Real payments clearing daily',
      'Reports on demand',
    ],
  },
] as const;

/**
 * The projection said Year 1 brings in nothing; the pilot already moved
 * real money. `actual` is money collected through the platforms (the
 * Finance App's "Net collected" was 846K XAF on 10 Nov 2026), not
 * platform-fee revenue — the copy says "collected" for that reason.
 */
export const TRACTION = {
  projected: 0,
  /** Shown as "1,000,000+": the Finance App read 846K on 10 Nov 2026 and
   * is expected past a million by pitch day. */
  actual: 1_000_000,
  window: 'within two months of pilot launch',
} as const;

export const PROTECTIONS = [
  { title: 'Pay on delivery', body: 'Every payment tied to a signed-off milestone.' },
  { title: '90-day warranty', body: 'On every phase delivered.' },
  { title: 'SHESA owns it', body: 'Code, accounts, data, all in SHESA’s name.' },
  { title: 'No lock-in', body: 'Any competent developer can take over.' },
  { title: 'Data protected', body: 'Access controls and daily backups.' },
  { title: 'No scope creep', body: 'Changes only by written change order.' },
] as const;

export const KPIS = [
  { goal: 'G1', kpi: 'Digital member database operational', by: 'Admin Console · Connect' },
  { goal: 'G1', kpi: 'At least 400 registered members', by: 'Connect · 300+ ready to migrate' },
  { goal: 'G2', kpi: 'Networking platform, 50% active users', by: 'SHESA Connect' },
  { goal: 'G2', kpi: '1,000 Shesans in professional programmes', by: 'Connect mentorship' },
  { goal: 'G2', kpi: 'SAHECO student data integration', by: 'Member database API' },
  { goal: 'G3', kpi: 'SHESA Finance Application & annual audit', by: 'Finance App' },
  { goal: 'G3', kpi: 'Revenue diversification', by: 'Connect streams · Store' },
  { goal: 'G4', kpi: 'Unified brand & external visibility', by: 'Website · EXCO Portal' },
] as const;

export const CREDITS = {
  builder: 'DIRA — Digital Era',
  site: 'diracmr.com',
  email: 'info@diracmr.com',
  city: 'Bamenda, Cameroon',
} as const;

/** The address the venue reel sends people to, and encodes in its QR. */
export const VENUE_URL = 'https://www.shesaconnect.com';

/**
 * Music bed: an original, calm, forward-moving loop composed for these
 * reels (`public/platforms/bed.m4a`, ~64s, loops seamlessly). Replace the
 * file to change the music; if it is missing the reels run silent.
 */
export const MUSIC_SOURCES = ['/platforms/bed.m4a'] as const;

export const VO_DIR = '/platforms/vo';

// ─── Running orders ──────────────────────────────────────────────────

export type SceneKind =
  | 'cold'
  | 'title'
  | 'pillars'
  | 'problems'
  | 'proof'
  | 'ecosystem'
  | 'live'
  | 'traction'
  | 'platform'
  | 'record'
  | 'integration'
  | 'tech'
  | 'revenue'
  | 'investment'
  | 'protection'
  | 'kpis'
  | 'statement'
  | 'cta'
  | 'close';

export interface Scene {
  /** Also the voiceover file name: `public/platforms/vo/<id>.mp3`. */
  readonly id: string;
  readonly kind: SceneKind;
  readonly platform?: PlatformId;
  /** Lines for `cold`, or [line, accent] for `statement`. */
  readonly lines?: readonly string[];
  /** Voiceover. Pitch only. */
  readonly vo?: string;
  /** Fixed hold in seconds. Venue scenes always carry one. */
  readonly seconds?: number;
}

/**
 * The pitch, for EXCO and funders. ~650 words of voiceover, which reads
 * at about four and a half minutes.
 */
export const PITCH_SCENES: readonly Scene[] = [
  {
    id: '01-cold-open',
    kind: 'cold',
    lines: ['ONE ASSOCIATION.', 'FIFTEEN BRANCHES.', 'TEN THOUSAND SHESANS.'],
    vo: 'One association. More than fifteen branches. Over ten thousand Shesans, at home and across the world.',
  },
  {
    id: '02-title',
    kind: 'title',
    vo: 'This is SHESA Digital: six integrated platforms, built to carry the association through its 2026 to 2030 Strategic Plan.',
  },
  {
    id: '03-strategy',
    kind: 'pillars',
    vo: 'The plan rests on four pillars: governance and unity, member engagement, financial sustainability, and strategic partnerships. Every one of them needs a digital platform to deliver it. The platforms are not a line item in the plan. They are the plan.',
  },
  {
    id: '04-challenges',
    kind: 'problems',
    vo: 'The plan is honest about where we stand. Governance is fragmented across branches. There is no single, verified record of who a Shesan is. Finances lean on dues and are hard to audit. And younger alumni are drifting into batch-only circles.',
  },
  {
    id: '05-proof',
    kind: 'proof',
    vo: 'The demand is already here. More than three hundred Shesans entered their professional details into the mentorship database before any platform existed. They are not waiting to be convinced. They are waiting for a home.',
  },
  {
    id: '06-ecosystem',
    kind: 'ecosystem',
    vo: 'So we built one. Six platforms, on one shared foundation, around one member record.',
  },
  {
    id: '07-live-today',
    kind: 'live',
    vo: 'And this is not a promise. Three of the six are already live. The public website is serving members today. The admin console is running branches, members and events. And the Finance App is clearing real payments, with mobile money and card payments fully integrated.',
  },
  {
    id: '08-website',
    kind: 'platform',
    platform: 'website',
    vo: "First, the public website, SHESA's face to the world. News, events, leadership and projects. AGM registration, ticket payments and awards voting, all live today at shesaconnect dot com. It is the first thing every partner and funder sees.",
  },
  {
    id: '09-exco-portal',
    kind: 'platform',
    platform: 'exco',
    vo: 'Behind it, the EXCO portal. Verified officers publish news, events, galleries, leadership pages and award ballots themselves, with role-based access and a full audit trail. No developer required.',
  },
  {
    id: '10-admin-console',
    kind: 'platform',
    platform: 'admin',
    vo: 'The admin console is the nerve centre. Branches, chapters, batches and houses. Memberships, events and settings. Every branch on one dashboard, and every change logged.',
  },
  {
    id: '11-connect',
    kind: 'platform',
    platform: 'connect',
    vo: 'SHESA Connect is the app every Shesan installs, on Android and iOS. A verified profile on a unique matricule. Messaging, mentorship and a job board. Events and official announcements. Dues and donations paid in the app, by mobile money or card. And it keeps working offline.',
  },
  {
    id: '12-finance',
    kind: 'platform',
    platform: 'finance',
    vo: 'The Finance App makes the money visible, and it is live. Contributions, charges and donations for every branch. MoMo and card payments integrated, landing in real time. Expenses behind an approval chain. And audit-ready reports in one click.',
  },
  {
    id: '13-store',
    kind: 'platform',
    platform: 'store',
    vo: 'And the sixth platform: the SHESA online store. Official merchandise, from clothing to publications, for buyers at home and in the diaspora. Checkout by mobile money or international card, and every order tracked to the door.',
  },
  {
    id: '14-member-record',
    kind: 'record',
    vo: 'Underneath it all is one record per Shesan. A unique matricule. Year in and year out at Sacred Heart. Every branch feeding one national register, every change logged, and an interface ready for the college’s own records. Governments pay billions for systems like this. SHESA gets it as part of the platform.',
  },
  {
    id: '15-integration',
    kind: 'integration',
    vo: 'And the platforms talk to each other. A donation in Connect lands in the Finance ledger. A store order settles through the same books. An announcement from the console reaches every phone. One ecosystem, with no gaps to reconcile.',
  },
  {
    id: '16-capabilities',
    kind: 'tech',
    vo: 'It is built to production grade. Mobile money and card payments. One app for Android and iOS. Bank-grade security, daily backups, and data that SHESA owns outright.',
  },
  {
    id: '17-revenue',
    kind: 'revenue',
    vo: 'And it pays for itself. Our model keeps year one free, to build the network. From year two, light fees on dues, events and announcements. From year three, eight revenue streams, plus merchandise sales. A net surplus of thirteen million francs in year three, and over twenty-one million in year four.',
  },
  {
    id: '18-ahead-of-plan',
    kind: 'traction',
    vo: 'Those projections turned out to be cautious. They assumed nothing coming in during year one. Within two months of the pilot launch, over a million francs has already been collected through the platform.',
  },
  {
    id: '19-investment',
    kind: 'investment',
    vo: 'The investment: around twenty million francs for Phase One. All six platforms, including a three-year infrastructure reserve, paid against delivered milestones, for work international firms price at many times that.',
  },
  {
    id: '20-protection',
    kind: 'protection',
    vo: 'SHESA is protected at every step. Payment only on delivered milestones. A ninety-day warranty on every phase. And on full payment, SHESA owns every line of code, every account and every record.',
  },
  {
    id: '21-kpis',
    kind: 'kpis',
    vo: 'Every KPI in the 2026 to 2030 Strategy that needs a database, a platform or a digital system is delivered here.',
  },
  {
    id: '22-close',
    kind: 'close',
    vo: 'One Shesan. One record. One institution. One SHESA, one dream. SHESA Digital: built by Shesans, for Shesans.',
  },
];

/** The venue loop. No voiceover, no figures, ~2 minutes. */
export const SCREEN_SCENES: readonly Scene[] = [
  {
    id: 'cold',
    kind: 'cold',
    lines: ['ONE ASSOCIATION.', 'ONE RECORD.', 'ONE INSTITUTION.'],
    seconds: 7.5,
  },
  { id: 'title', kind: 'title', seconds: 6.5 },
  { id: 'ecosystem', kind: 'ecosystem', seconds: 8 },
  { id: 'six', kind: 'statement', lines: ['SIX PLATFORMS.', 'BUILT BY SHESANS.'], seconds: 4.5 },
  { id: 'website', kind: 'platform', platform: 'website', seconds: 11 },
  { id: 'exco', kind: 'platform', platform: 'exco', seconds: 10 },
  { id: 'admin', kind: 'platform', platform: 'admin', seconds: 10 },
  { id: 'connect', kind: 'platform', platform: 'connect', seconds: 12 },
  { id: 'finance', kind: 'platform', platform: 'finance', seconds: 10 },
  { id: 'store', kind: 'platform', platform: 'store', seconds: 11 },
  { id: 'record', kind: 'record', seconds: 9 },
  { id: 'cta', kind: 'cta', seconds: 10 },
  { id: 'close', kind: 'close', seconds: 7 },
];

/** Words per second for the fallback hold when a scene has no audio. */
const VO_WORDS_PER_SECOND = 2.5;

/** The hold for a scene before any audio is measured. */
export function baseSeconds(scene: Scene): number {
  if (scene.seconds) return scene.seconds;
  const words = scene.vo?.split(/\s+/).filter(Boolean).length ?? 0;
  return Math.max(5, words / VO_WORDS_PER_SECOND + 1.5);
}

export function formatXaf(value: number): string {
  return new Intl.NumberFormat('en-GB').format(Math.round(value));
}
