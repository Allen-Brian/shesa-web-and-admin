/**
 * Partner boards, shared by every partner-strip variant.
 *
 * The roster follows the AGM 2026 sponsors flyer: DIRA and MTN, plus the
 * Investment Promotion Agency, Hope Circle Foundation, STV, CRTV, Vista
 * Print, St Mary's International College University and MDDT.
 *
 * ARTWORK: every logo except CRTV's is in `public/partners/`. IPA, St
 * Mary's and Vista Print were cropped from the official sponsors flyer;
 * Hope Circle, STV and MDDT came as files from the Exco. CRTV has no file
 * yet and falls back to a wordmark in its brand colour: drop the
 * official logo into `public/partners/` and set `logo` below.
 *
 * MESSAGES: MTN's ("Everywhere you go"), Vista Print's ("Quality matters
 * here") and St Mary's motto are the partners' own words, taken from
 * their marks. The rest are plain descriptions standing in until each
 * partner sends its own line; they are marked PLACEHOLDER.
 *
 * There is no partners table yet. When one lands, load these server side
 * and pass them in the way Events / Projects do.
 */

export interface Partner {
  readonly name: string;
  /**
   * Path under `public/partners/`, e.g. `/partners/mtn.svg`. Leave unset
   * until the file is actually there — a path to a missing file renders
   * a broken image, the wordmark fallback does not.
   */
  readonly logo?: string;
  /** Small tag above the message — product line, campaign, or sector. */
  readonly tag: string;
  /** The partner's own message on the board. */
  readonly message: string;
  /** Board background, brand colour. */
  readonly bg: string;
  /** Text colour that sits on `bg`. */
  readonly fg: string;
  /** Wordmark colour inside the logo chip. */
  readonly chip: string;
  /** Chip background. Defaults to white; set it when the artwork needs
   *  its brand's ground (MTN's current mark is monochrome-on-yellow). */
  readonly plate?: string;
  readonly href?: string;
}

export const partners: readonly Partner[] = [
  {
    name: 'DIRA',
    logo: '/partners/DIRA.png',
    tag: 'IT Conglomerate',
    message: 'Empowering Africa with next-generation software solutions.',
    bg: '#0a1628',
    fg: '#ffffff',
    chip: '#3b82f6',
    plate: '#0a1628',
    href: 'https://diracmr.com',
  },
  {
    name: 'MTN',
    logo: '/partners/mtn.png',
    // The 2022 mark is monochrome and is laid on the brand's yellow.
    plate: '#FFCC00',
    tag: 'Telecommunications',
    // MTN's own long-standing slogan.
    message: 'Everywhere you go.',
    bg: '#FFCC00',
    fg: '#0b0b0b',
    chip: '#0b0b0b',
  },
  {
    name: 'IPA',
    logo: '/partners/ipa.png',
    tag: 'Investment Promotion Agency',
    // PLACEHOLDER: factual description, not IPA's own wording.
    message: 'Bringing investment to Cameroon.',
    bg: '#232f72',
    fg: '#ffffff',
    chip: '#232f72',
  },
  {
    name: 'Hope Circle Foundation',
    logo: '/partners/hope-circle.png',
    tag: 'Foundation',
    // PLACEHOLDER: factual description, not the foundation's own wording.
    message: 'Community care and support, in good hands.',
    bg: '#a99cf0',
    fg: '#1f1f29',
    chip: '#26262f',
  },
  {
    name: 'STV',
    logo: '/partners/stv.png',
    tag: 'Television',
    // PLACEHOLDER: factual description, not STV's own wording.
    message: 'Private television, broadcasting across Cameroon.',
    bg: '#1f6fb5',
    fg: '#ffffff',
    chip: '#1f6fb5',
  },
  {
    name: 'CRTV',
    tag: 'Public broadcaster',
    // PLACEHOLDER: factual description, not CRTV's own wording.
    message: 'Cameroon Radio Television, the national broadcaster.',
    bg: '#0b3c8c',
    fg: '#ffffff',
    chip: '#0b3c8c',
  },
  {
    name: 'Vista Print',
    logo: '/partners/vista.png',
    tag: 'Printing',
    // Vista Print's own line, from its logo.
    message: 'Quality matters here.',
    bg: '#1d3c96',
    fg: '#ffffff',
    chip: '#f26722',
  },
  {
    name: "St Mary's",
    logo: '/partners/stmarys.png',
    tag: 'International College University',
    // The university's motto, from its crest: "source of learning and of
    // character".
    message: 'Fons studiorum et morum.',
    bg: '#7a1f2b',
    fg: '#ffffff',
    chip: '#7a1f2b',
  },
  {
    name: 'MDDT',
    logo: '/partners/mddt.png',
    tag: 'Civil society',
    // The movement's own name, spelled out from its mark.
    message: 'Movement for Democracy, Development & Transparency.',
    bg: '#1d7a3c',
    fg: '#ffffff',
    chip: '#1d7a3c',
  },
] as const;
