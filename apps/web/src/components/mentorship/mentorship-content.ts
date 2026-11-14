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
  readonly icon:
    | 'briefcase'
    | 'stethoscope'
    | 'cpu'
    | 'scale'
    | 'megaphone'
    | 'hand-heart'
    | 'banknote'
    | 'graduation-cap'
    | 'landmark'
    | 'shield'
    | 'hard-hat';
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
    field: 'Technology and digital',
    blurb:
      'Software, data, IT and digital products, from people doing it for a living to people learning it.',
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
  {
    slug: 'ngo',
    name: 'SHESANGO',
    field: 'NGOs and international organisations',
    blurb:
      'For Shesans working in NGOs, INGOs, foundations and development programmes, and anyone heading that way.',
    forYouIf: [
      'You work for an NGO or INGO',
      'You run programmes or projects',
      'You want to work in development',
    ],
    invite: 'https://chat.whatsapp.com/IeRFznGieB3LxP8bsbLVUi',
    icon: 'hand-heart',
  },
  {
    slug: 'fin',
    name: 'SHESAFIN',
    field: 'Finance',
    blurb:
      'Bankers, accountants, auditors, investors and everyone else who works with money for a living.',
    forYouIf: [
      'You work in banking or accounting',
      'You are studying finance',
      'You want advice on a finance career',
    ],
    invite: 'https://chat.whatsapp.com/CDLaOpEgpab9Du3HTWP2YZ',
    icon: 'banknote',
  },
  {
    slug: 'edu',
    name: 'SHESAEDU',
    field: 'Education',
    blurb:
      'Teachers, lecturers, deans, administrators and researchers: everyone who shapes how others learn.',
    forYouIf: ['You teach or lecture', 'You lead a school or faculty', 'You are training to teach'],
    invite: 'https://chat.whatsapp.com/CQCEPTnFx1Y3bHGBjkHzP1',
    icon: 'graduation-cap',
  },
  {
    slug: 'gov',
    name: 'SHESAGOV',
    field: 'Government and public office',
    blurb:
      'Mayors, parliamentarians, governors, civil servants and Shesans serving in public life.',
    forYouIf: [
      'You hold public office',
      'You work in the civil service',
      'You are considering public service',
    ],
    invite: 'https://chat.whatsapp.com/Cute1WIHnKM6RmxdVxmpQw',
    icon: 'landmark',
  },
  {
    slug: 'secu',
    name: 'SHESASECU',
    field: 'Security and defence',
    blurb:
      'Officers and personnel of the military, police and security services, from colonels to new recruits.',
    forYouIf: [
      'You serve in the forces',
      'You work in security',
      'You are considering a career in service',
    ],
    invite: 'https://chat.whatsapp.com/KWukHaIYJsKDpHuM9hDlUp',
    icon: 'shield',
  },
  {
    slug: 'eng',
    name: 'SHESAENG',
    field: 'Engineering',
    blurb:
      'Civil, mechanical, electrical, petroleum and every other kind of engineer, practising or in training.',
    forYouIf: [
      'You are a practising engineer',
      'You are an engineering student',
      'You manage projects or sites',
    ],
    invite: 'https://chat.whatsapp.com/C7P9DgVaIwhKOPH14twGUF',
    icon: 'hard-hat',
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
