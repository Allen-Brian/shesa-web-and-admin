/**
 * Partner boards, shared by every partner-strip variant so the four
 * designs are compared on identical content.
 *
 * PLACEHOLDER CONTENT. The brands below are targets, not signed
 * partners, and every message is invented copy standing in for what a
 * real partner would supply. Both the artwork and the wording need to
 * come from the partner (and be cleared) before this goes live.
 *
 * There is no partners table yet — when one lands, load these server
 * side and pass them in the way Events / Projects do.
 */

export interface Partner {
  readonly name: string;
  /**
   * Path under `public/partners/`. Until a brand's real artwork is
   * cleared and dropped in, boards fall back to a wordmark set in the
   * brand colour, so nothing renders broken.
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
    tag: 'Mobile Money',
    message: 'Pay your AGM ticket in seconds with MoMo.',
    bg: '#FFCC00',
    fg: '#0b0b0b',
    chip: '#0b0b0b',
  },
  {
    name: 'orange',
    tag: 'Orange Money',
    message: 'Send it home from anywhere in the world.',
    bg: '#FF7900',
    fg: '#ffffff',
    chip: '#FF7900',
  },
  {
    name: 'UBA',
    tag: "Africa's global bank",
    message: 'Open a diaspora account without leaving your city.',
    bg: '#D2232A',
    fg: '#ffffff',
    chip: '#D2232A',
  },
  {
    name: 'Access Bank',
    tag: 'AccessMore',
    message: 'Banking that follows you home and back again.',
    bg: '#00478F',
    fg: '#ffffff',
    chip: '#00478F',
  },
  {
    name: 'Ecobank',
    tag: 'Ecobank Xpress',
    message: 'One app across thirty-three African markets.',
    bg: '#00A651',
    fg: '#ffffff',
    chip: '#00874A',
  },
  {
    name: 'CAMTEL',
    tag: 'Blue Home Fibre',
    message: 'Fibre fast enough for the whole compound.',
    bg: '#00AEEF',
    fg: '#04263a',
    chip: '#0079A8',
  },
  {
    name: 'Afriland First Bank',
    tag: 'SME banking',
    message: 'Growth finance for alumni-run businesses.',
    bg: '#0E3B2E',
    fg: '#ffffff',
    chip: '#0E3B2E',
  },
  {
    name: 'Guinness',
    tag: 'Proud backer',
    message: 'Behind the assembly, and the reunion after it.',
    bg: '#101010',
    fg: '#F2D08A',
    chip: '#101010',
  },
] as const;
