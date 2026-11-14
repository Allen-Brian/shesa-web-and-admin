/**
 * The mentorship circles, in one file.
 *
 * ─── Adding a circle ──────────────────────────────────────────────────
 * Add an entry here and it appears on the page. Nothing else needs to
 * change, and — this is the point — the printed QR code does not need
 * to be reissued, because it points at the page rather than at any one
 * group. See `ShareBlock`.
 *
 * ─── On the invite links ──────────────────────────────────────────────
 * WhatsApp hands out invite URLs with a tail of tracking parameters
 * (`?s=cl&p=i&mlu=4&ilr=4&iam=2`). They describe how the person who
 * copied the link got to it, they are not part of the invite, and they
 * are stripped here. The code after `chat.whatsapp.com/` is the whole
 * invite.
 *
 * An invite link can be revoked from inside WhatsApp by an admin. If a
 * circle stops accepting people, that is the first thing to check.
 *
 * ─── ⚠ On the descriptions ────────────────────────────────────────────
 * The group names came from the President General; the one-line
 * descriptions did not. They are inferred from the names so that
 * somebody arriving cold can tell which room is theirs, which is the
 * whole job of this page. Correct them — they are guesses about other
 * people's groups, and a wrong one sends someone to the wrong place.
 */

export interface MentorshipCircle {
  /** Stable key, used for the anchor link and as the React key. */
  readonly slug: string;
  /** The group's name: capitals, one word, as the Exco writes it. */
  readonly name: string;
  /** What the room is about, in two or three words. */
  readonly field: string;
  /** Who should be in it. Written to be read by somebody deciding. */
  readonly blurb: string;
  /** A handful of concrete examples, so nobody has to guess. */
  readonly forYouIf: readonly string[];
  /** The clean invite link, no tracking tail. */
  readonly invite: string;
  /** Lucide icon name, resolved in `circle-card.tsx`. */
  readonly icon: 'briefcase' | 'stethoscope' | 'cpu' | 'scale' | 'megaphone';
}

export const CIRCLES: readonly MentorshipCircle[] = [
  {
    slug: 'biz',
    name: 'SHESABIZ',
    field: 'Business and enterprise',
    blurb:
      'For ex-students building or running something of their own, and for anyone who wants to.',
    forYouIf: ['You run a business', 'You are raising capital', 'You have an idea and no map'],
    invite: 'https://chat.whatsapp.com/LOEI382Tsgd9D8Yk1KPLPV',
    icon: 'briefcase',
  },
  {
    slug: 'sante',
    name: 'SHESANTÉ',
    field: 'Health and medicine',
    blurb:
      'Doctors, nurses, pharmacists, students and everybody else working in or heading toward health.',
    forYouIf: ['You work in health', 'You are in medical school', 'You are choosing a speciality'],
    invite: 'https://chat.whatsapp.com/FqkkGGj3Cpz4Ke0WxzOFoj',
    icon: 'stethoscope',
  },
  {
    slug: 'tech',
    name: 'SHESATECH',
    field: 'Technology and engineering',
    blurb:
      'Software, hardware, data and engineering, from people doing it for a living to people learning it.',
    forYouIf: [
      'You write code or build systems',
      'You are switching into tech',
      'You are stuck on something',
    ],
    invite: 'https://chat.whatsapp.com/D6x9UyxECkEJA5Y5rxAvHM',
    icon: 'cpu',
  },
  {
    slug: 'legal',
    name: 'SHESALEGAL',
    field: 'Law and policy',
    blurb:
      'Lawyers, students of law, and anyone who needs to understand what the law actually says.',
    forYouIf: ['You practise law', 'You are at law school', 'You need to know where to start'],
    invite: 'https://chat.whatsapp.com/IvtIqxZVFfbHyy8ouCwj5f',
    icon: 'scale',
  },
  {
    slug: 'media',
    name: 'SHESAMEDIA',
    field: 'Media and communications',
    blurb:
      'Journalists, broadcasters, creators, designers and communicators, and anyone telling stories for a living.',
    forYouIf: [
      'You work in media or comms',
      'You create content',
      'You want to break into the industry',
    ],
    invite: 'https://chat.whatsapp.com/DjsYdHEH6LF0x5K0FU65Sr',
    icon: 'megaphone',
  },
];

/**
 * Where the QR code points, and what gets printed under it.
 *
 * Absolute and hard-coded rather than derived from the request, because
 * a QR has to work when it is on a wall and nothing is derivable.
 */
export const MENTORSHIP_URL = 'https://shesaconnect.com/mentorship';

/** Shown as text beside the code, for anybody who would rather type it. */
export const MENTORSHIP_URL_LABEL = 'shesaconnect.com/mentorship';
