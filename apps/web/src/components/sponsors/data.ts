/**
 * Static sponsor content. Kept in-repo (not CMS), sponsors are
 * curated by hand and change rarely.
 */

export interface SponsorTier {
  readonly slug: 'platinum' | 'gold' | 'silver' | 'bronze';
  readonly name: string;
  readonly headline: string;
  readonly amount: string;
  readonly perks: readonly string[];
  readonly accent: 'primary' | 'gold' | 'silver' | 'bronze';
}

export interface Sponsor {
  readonly name: string;
  readonly tier: SponsorTier['slug'];
  readonly city: string;
  readonly note?: string;
}

export const sponsorTiers: readonly SponsorTier[] = [
  {
    slug: 'platinum',
    name: 'Platinum',
    headline: 'The founding tier',
    amount: '5,000,000 XAF+',
    perks: [
      'Headline billing on every AGM asset',
      'Full-page profile in the AGM brochure',
      'Ten-seat gala table for two nights',
      "Named scholarship in your organisation's honour",
      'Executive briefing with the SHESA board',
    ],
    accent: 'primary',
  },
  {
    slug: 'gold',
    name: 'Gold',
    headline: 'Anchor partners',
    amount: '2,500,000 XAF+',
    perks: [
      'Prime placement on the AGM stage backdrop',
      'Half-page profile in the AGM brochure',
      'Six-seat gala table',
      'Recognition at the opening ceremony',
      'Speaking slot at the sponsor showcase',
    ],
    accent: 'gold',
  },
  {
    slug: 'silver',
    name: 'Silver',
    headline: 'Community partners',
    amount: '1,000,000 XAF+',
    perks: [
      'Logo on the AGM website and printed programme',
      'Quarter-page profile in the AGM brochure',
      'Four-seat gala table',
      'Feature in the SHESA quarterly newsletter',
    ],
    accent: 'silver',
  },
  {
    slug: 'bronze',
    name: 'Bronze',
    headline: 'Everyone else who lifts us',
    amount: '250,000 XAF+',
    perks: [
      'Logo on the AGM website',
      'Listed in the printed programme',
      'Two seats at the gala',
      'Thank-you post on the SHESA channels',
    ],
    accent: 'bronze',
  },
];

/**
 * Illustrative roll of sponsors. Replace names / edit list ahead of
 * every AGM, this file is the source of truth for the printed
 * brochure and the Sponsors page alike.
 */
export const sponsors: readonly Sponsor[] = [
  { name: 'Ecobank Cameroon', tier: 'platinum', city: 'Douala' },
  { name: 'MTN Foundation', tier: 'platinum', city: 'Yaoundé' },
  { name: 'Orange Cameroun', tier: 'gold', city: 'Douala' },
  { name: 'Guinness Cameroon', tier: 'gold', city: 'Douala' },
  { name: 'Alucam', tier: 'gold', city: 'Edéa' },
  { name: 'Bocom Petroleum', tier: 'silver', city: 'Douala' },
  { name: 'SABC', tier: 'silver', city: 'Douala' },
  { name: 'Bicec', tier: 'silver', city: 'Douala' },
  { name: 'Nachtigal Hydro Power', tier: 'silver', city: 'Yaoundé' },
  { name: 'Mansfeld Enterprises', tier: 'bronze', city: 'Bamenda' },
  { name: 'Sacred Heart Alumni Bamenda', tier: 'bronze', city: 'Bamenda' },
  { name: 'Cameroon Airlines Corporation', tier: 'bronze', city: 'Douala' },
  { name: 'SHESA London Chapter', tier: 'bronze', city: 'London' },
  { name: 'SHESA Berlin Chapter', tier: 'bronze', city: 'Berlin' },
  { name: 'SHESA USA Chapter', tier: 'bronze', city: 'Washington DC' },
];
