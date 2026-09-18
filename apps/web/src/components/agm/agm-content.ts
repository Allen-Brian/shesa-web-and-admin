/**
 * Static content for the AGM 2026 landing page. The page is temporary
 * (removed after the event) so we deliberately keep the content here
 * in-repo rather than in the CMS.
 */

export const AGM_META = {
  edition: '2026',
  themeLine: 'The Yaoundé Assembly',
  tagline: 'Three days. One tournament, one assembly, one grand celebration.',
  dates: 'Fri 13, Sun 15 November 2026',
  city: 'Yaoundé, Cameroon',
  venue: 'Palais des Congrès · Yaoundé',
  registrationOpens: 'Registration is open',
  earlyBird: 'Early bird tickets until 30 September 2026',
} as const;

export interface AgmScheduleItem {
  readonly day: string;
  readonly date: string;
  readonly sessions: readonly {
    readonly time: string;
    readonly title: string;
    readonly detail: string;
  }[];
}

export const AGM_SCHEDULE: readonly AgmScheduleItem[] = [
  {
    day: 'Friday',
    date: '13 November · Regional Football Tournament',
    sessions: [
      {
        time: '15:00',
        title: 'Grassfield vs Coastal',
        detail: 'NW · SW · West Branches take on Douala + South. Prize pool: 1,000,000 XAF.',
      },
      {
        time: '15:00',
        title: 'Centre vs Northern',
        detail: 'Yaoundé + East Branches face the Northern Cluster.',
      },
      {
        time: '18:30',
        title: 'Batch meetings',
        detail: 'Each batch gathers for its annual convocation, venues shared on-site.',
      },
    ],
  },
  {
    day: 'Saturday · Ceremony',
    date: '14 November · Palais des Congrès · Dress: new SHESA uniform',
    sessions: [
      { time: '08:30', title: 'Mass', detail: 'Opening service at Palais des Congrès.' },
      { time: '09:30', title: 'March past', detail: 'Branches and batches parade in formation.' },
      { time: '10:00', title: 'Breakfast', detail: 'Served in the main hall.' },
      {
        time: '10:30',
        title: 'Arrival of dignitaries',
        detail:
          'Diplomatic missions, ministers, the Governor of the Centre Region, and special invitees.',
      },
      { time: '11:00', title: 'Anthems', detail: 'National Anthem followed by the SHESA Anthem.' },
      { time: '11:10', title: 'Welcome remarks', detail: 'By the President General.' },
      { time: '11:20', title: 'Remarks by the Arch-Bishop', detail: '' },
      {
        time: '11:25',
        title: 'Keynote address',
        detail:
          '“Leveraging alumni associations as a driving force for economic empowerment, social cohesion, and nation-building.” By H.E. Paul Tasong or H.E. Mbayu Felix.',
      },
      { time: '11:35', title: 'Cultural dance & display', detail: '' },
      {
        time: '11:45',
        title: 'Opening remarks',
        detail: 'By the Prime Minister, Head of Government.',
      },
      { time: '11:55', title: 'Group photos + exhibition', detail: '' },
      { time: '12:20', title: 'Departure of dignitaries', detail: '' },
    ],
  },
  {
    day: 'Saturday · AGM',
    date: '14 November · Business session',
    sessions: [
      {
        time: '12:20',
        title: 'AGM, opening',
        detail: 'Opening remarks by the President General.',
      },
      {
        time: '12:30',
        title: 'Minutes & report',
        detail: 'Presented by the Secretary General.',
      },
      {
        time: '13:00',
        title: 'Financial report + fiscal budget',
        detail: 'Presented by the Treasurer.',
      },
      { time: '13:20', title: 'Presentation of SHESA projects', detail: '' },
      { time: '13:40', title: 'Plenary discussion', detail: '' },
      { time: '14:30', title: 'Adoption of the constitution', detail: '' },
      {
        time: '15:30',
        title: 'Resolutions + closing remarks',
        detail: 'By the President General.',
      },
    ],
  },
  {
    day: 'Saturday · Gala',
    date: '14 November · Evening',
    sessions: [
      {
        time: '19:00',
        title: 'Gala · arrival of guests',
        detail: 'Delegates, guests, dignitaries.',
      },
      { time: '19:30', title: 'SHESA Anthem', detail: '' },
      { time: '19:40', title: 'Gala opening remarks', detail: 'By the President General.' },
      {
        time: '19:45',
        title: 'SHESA-Connect launch',
        detail: 'Presentation of the SHESA-Connect project.',
      },
      {
        time: '20:00',
        title: 'Dinner + cultural competitions',
        detail: 'Branches and batches compete for the cultural night trophy.',
      },
      { time: '21:00', title: 'Awards + keynote', detail: '' },
      { time: '22:00', title: 'Dance floor opens', detail: 'Dance. Dance. Dance.' },
    ],
  },
  {
    day: 'Sunday',
    date: '15 November · Thanksgiving',
    sessions: [
      {
        time: '10:00',
        title: 'Thanksgiving Mass',
        detail: 'Closing service of gratitude before departure.',
      },
    ],
  },
];

/**
 * Flat unit price for the AGM 2026 ticket. Kept in one place so the
 * form's total calculation, the pricing panel, and the marketing
 * copy all read the same number. Multiple tickets scale linearly.
 */
export const AGM_TICKET_UNIT_PRICE_XAF = 20_000;

/**
 * Attire package price, a custom-tailored piece the buyer specifies
 * measurements for at purchase time. Also flat.
 */
export const AGM_ATTIRE_UNIT_PRICE_XAF = 55_000;

/**
 * Attire sizes offered. Lives here (not in the server-action file)
 * because Next's 'use server' rule strips non-async-function exports
 *, importing an array from a 'use server' module gives you a
 * proxy object without .map at runtime.
 */
export const ATTIRE_SIZES = ['S', 'M', 'L', 'XL', 'XXL'] as const;
export type AttireSize = (typeof ATTIRE_SIZES)[number];

/**
 * Funding tiers for AGM 2026. Each tier is a RANGE, not a fixed
 * amount: `minAmountXaf` is the lower bound and `amountXaf` is the
 * upper bound of the tier's slice. Whatever the donor gives lands in
 * whichever slice contains their number; the receipt + finance
 * campaign are chosen from that. The top tier (Platinum) is
 * unbounded, so any amount at or above its floor still counts as
 * Platinum.
 */
export interface AgmFundingTier {
  readonly key: 'bronze' | 'silver' | 'gold' | 'platinum';
  readonly label: string;
  /** Lower bound of the tier's range in XAF (inclusive). */
  readonly minAmountXaf: number;
  /**
   * Upper bound of the tier's range in XAF (inclusive). Also the
   * "headline" number shown large on the card. For the unbounded
   * top tier this doubles as the suggested contribution ceiling.
   */
  readonly amountXaf: number;
  /** True for the top tier — amounts above `amountXaf` still count as this tier. */
  readonly unbounded?: boolean;
  readonly caption: string;
}

export const AGM_FUNDING_TIERS: readonly AgmFundingTier[] = [
  {
    key: 'bronze',
    label: 'Bronze',
    minAmountXaf: 1,
    amountXaf: 50_000,
    caption: 'For every alumnus who wants a seat at the table.',
  },
  {
    key: 'silver',
    label: 'Silver',
    minAmountXaf: 50_001,
    amountXaf: 250_000,
    caption: 'For those who back the association behind the scenes.',
  },
  {
    key: 'gold',
    label: 'Gold',
    minAmountXaf: 250_001,
    amountXaf: 1_000_000,
    caption: 'For patrons who move the needle.',
  },
  {
    key: 'platinum',
    label: 'Platinum',
    minAmountXaf: 1_000_001,
    amountXaf: 5_000_000,
    unbounded: true,
    caption: 'For benefactors who leave a mark.',
  },
];

/**
 * Map a donation amount (XAF) to the tier that owns it. Bronze
 * catches 1-50,000; Silver 50,001-250,000; Gold 250,001-1,000,000;
 * Platinum everything above. Amounts of zero or less fall to Bronze
 * so the form never has an undefined tier state — validation on the
 * server still rejects zero-amount submissions.
 */
export function tierForAmount(amountXaf: number): AgmFundingTier['key'] {
  if (!Number.isFinite(amountXaf) || amountXaf <= 0) return 'bronze';
  for (const t of AGM_FUNDING_TIERS) {
    if (t.unbounded) return t.key;
    if (amountXaf <= t.amountXaf) return t.key;
  }
  return 'platinum';
}

/**
 * How the visitor wants to settle — not *which* payment method.
 *
 * The method question is gone. It used to list MTN, Orange, card and bank
 * transfer, and then Tranzak's checkout asked again; the two answers could
 * disagree, and the one that mattered was always Tranzak's. So the payer
 * picks their method once, on the gateway's page, and we record what they
 * actually used.
 *
 * What is left is the one thing Tranzak cannot answer: whether they are
 * paying at all right now, or handing cash to the secretariat on the day.
 */
/**
 * How an AGM payment can be made. Paying on arrival was removed — every
 * form now goes through the gateway — but the list is kept as a list so
 * a second method can return without reshaping the forms.
 */
export const PAYMENT_OPTIONS = [
  { value: 'pay-now', label: 'Pay now (Mobile Money, card, or bank)' },
] as const;

export type PaymentOption = (typeof PAYMENT_OPTIONS)[number]['value'];
