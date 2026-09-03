/**
 * Partner boards, shared by every partner-strip variant so the four
 * designs are compared on identical content.
 *
 * ARTWORK IS NOT IN THE REPO YET. `public/partners/` does not exist, so
 * every board currently falls back to a wordmark set in the brand
 * colour. Drop each brand's official file in and set `logo` below and
 * that board switches to real artwork with no other change. Take the
 * files from each company's own brand/press page rather than a web
 * search — usage terms travel with the asset, and a logo used without
 * permission is a trademark problem, not a design one.
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
  /** Wordmark colour inside the white logo chip. */
  readonly chip: string;
  readonly href?: string;
}

export const partners: readonly Partner[] = [
  {
    name: 'MTN',
    tag: 'Telecommunications',
    // MTN's own long-standing slogan.
    message: 'Everywhere you go.',
    bg: '#FFCC00',
    fg: '#0b0b0b',
    chip: '#0b0b0b',
  },
  {
    name: 'CAMTEL',
    tag: 'Telecommunications',
    // PLACEHOLDER — factual description, not CAMTEL's own wording.
    message: "Cameroon's national telecommunications operator.",
    bg: '#00AEEF',
    fg: '#04263a',
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
