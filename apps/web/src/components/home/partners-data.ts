/**
 * Partner boards, shared by every partner-strip variant so the four
 * designs are compared on identical content.
 *
 * ARTWORK: MTN and CAMTEL carry their real logos, both taken from
 * Wikimedia Commons files marked public domain (simple shapes and text
 * are below the threshold of copyright). That covers the *file*; the
 * marks themselves are registered trademarks, so displaying a company
 * as a partner still needs that company's permission.
 *
 * Pamol and betPawa have no logo on Commons and fall back to a wordmark
 * in the brand colour. To finish them, drop an official file into
 * `public/partners/` and set `logo` below — from the company's own
 * brand/press page, not an image search, since usage terms travel with
 * the asset.
 *
 * TAGLINES: only MTN's is the company's own. The other three are plain
 * descriptions of what the business does, standing in until the real
 * wording arrives from each partner. They are marked below.
 *
 * There is no partners table yet — when one lands, load these server
 * side and pass them in the way Events / Projects do.
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
    name: 'CAMTEL',
    logo: '/partners/camtel.png',
    tag: 'Telecommunications',
    // PLACEHOLDER — factual description, not CAMTEL's own wording.
    message: "Cameroon's national telecommunications operator.",
    // White board: the mark is cyan and now prints straight onto the
    // board rather than onto a plate, so the board has to be its ground.
    bg: '#ffffff',
    fg: '#0b2a3a',
    chip: '#0079A8',
  },
  {
    name: 'Pamol',
    tag: 'Agro-industry',
    // PLACEHOLDER — factual description, not Pamol's own wording.
    message: 'Palm oil grown and milled in the South West.',
    bg: '#0E5B34',
    fg: '#ffffff',
    chip: '#0E5B34',
  },
  {
    name: 'betPawa',
    tag: 'Sports betting',
    // PLACEHOLDER — factual description, not betPawa's own wording.
    message: 'Sports betting across Africa.',
    bg: '#1B7A3E',
    fg: '#ffffff',
    chip: '#1B7A3E',
  },
] as const;
