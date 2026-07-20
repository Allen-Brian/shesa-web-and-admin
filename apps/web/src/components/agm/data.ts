/**
 * Static content for the AGM 2026 landing page. The page is temporary
 * (removed after the event) so we deliberately keep the content here
 * in-repo rather than in the CMS.
 */

export const AGM_META = {
  edition: '2026',
  themeLine: 'The Yaoundé Assembly',
  tagline: 'Where the story writes its next chapter.',
  dates: 'Fri 20 — Sun 22 November 2026',
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
    date: '20 November',
    sessions: [
      { time: '14:00', title: 'Arrival & badge pickup', detail: 'Palais des Congrès · Main foyer' },
      { time: '17:00', title: 'Opening cocktail', detail: 'Hosted by the AGM committee' },
      {
        time: '19:30',
        title: 'Cultural welcome night',
        detail: 'Traditional performances + dinner',
      },
    ],
  },
  {
    day: 'Saturday',
    date: '21 November',
    sessions: [
      {
        time: '09:00',
        title: 'General Assembly session I',
        detail: 'Reports of the outgoing executive',
      },
      {
        time: '11:30',
        title: 'Chapter roundtables',
        detail: 'National, sector, and diaspora tables',
      },
      { time: '14:00', title: 'General Assembly session II', detail: 'Elections and resolutions' },
      { time: '19:30', title: 'The Grand Gala', detail: 'Scholarship awards + dinner' },
    ],
  },
  {
    day: 'Sunday',
    date: '22 November',
    sessions: [
      { time: '10:00', title: 'Foundation Mass', detail: 'Basilique Marie-Reine des Apôtres' },
      { time: '13:00', title: 'Closing lunch', detail: 'Palais des Congrès · Terrace' },
      { time: '16:00', title: 'Departure', detail: 'Farewells and next-AGM handover' },
    ],
  },
];

export interface AgmPricingTier {
  readonly key: string;
  readonly label: string;
  readonly amountXaf: number;
  readonly caption: string;
  readonly perks: readonly string[];
}

export const AGM_PRICING: readonly AgmPricingTier[] = [
  {
    key: 'standard',
    label: 'Standard',
    amountXaf: 25_000,
    caption: 'The everyone-welcome pass',
    perks: ['Access to all three days', 'Cocktail + welcome night', 'Grand Gala + dinner'],
  },
  {
    key: 'patron',
    label: 'Patron',
    amountXaf: 100_000,
    caption: 'For those who lift the room',
    perks: [
      'Everything in Standard',
      'Reserved seating at the Gala',
      'Named in the AGM programme',
      "Access to the Patron's lounge",
    ],
  },
  {
    key: 'benefactor',
    label: 'Benefactor',
    amountXaf: 500_000,
    caption: 'Underwrite a scholarship seat',
    perks: [
      'Everything in Patron',
      'Named scholarship award in your honour',
      'Table of six at the Gala',
      'Private board briefing',
    ],
  },
];

export const PAYMENT_OPTIONS = [
  { value: 'mtn-momo', label: 'MTN Mobile Money' },
  { value: 'orange-money', label: 'Orange Money' },
  { value: 'card', label: 'Card (Visa / MasterCard)' },
  { value: 'bank-transfer', label: 'Bank transfer' },
  { value: 'cash-on-site', label: 'Pay on arrival' },
] as const;

export type PaymentOption = (typeof PAYMENT_OPTIONS)[number]['value'];
