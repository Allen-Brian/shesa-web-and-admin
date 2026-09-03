/**
 * AGM 2026 sponsorship + partnership content. Sourced from the
 * internal SHESA AGM 2026 Sponsor Target List (July 2026) but
 * deliberately anonymised for public display: only categories,
 * offices, and public organisations appear here, no named
 * individuals or internal "warm contact" annotations.
 *
 * The commercial tier cards intentionally omit prices, per the
 * outreach guide, suggested tier amounts are an internal planning
 * position, not a public price list. The public CTA points to the
 * partnership deck request instead.
 */

export interface AudienceItem {
  readonly key: string;
  readonly label: string;
  readonly detail: string;
}

export const AUDIENCE_IN_THE_ROOM: readonly AudienceItem[] = [
  {
    key: 'head-of-government',
    label: 'Head of Government',
    detail: 'Opening remarks by the Prime Ministry, the AGM’s highest-profile institutional slot.',
  },
  {
    key: 'ministers',
    label: 'Cabinet ministers',
    detail:
      'Portfolio ministries covering the economy, external relations, territorial administration, and professional training.',
  },
  {
    key: 'ambassadors',
    label: 'Ambassadors & High Commissioners',
    detail:
      'Diplomatic missions with active alumni chapters, the United States, United Kingdom, Canada, Germany, and Switzerland.',
  },
  {
    key: 'executives',
    label: 'C-suite executives',
    detail:
      'Chairs, CEOs, and country directors of Cameroon’s leading banks, telecoms, energy and FMCG players.',
  },
  {
    key: 'diaspora',
    label: 'International alumni chapters',
    detail:
      'Delegations flying in from the SHESA branches in the US, UK, Canada, and Germany, a high-net-worth diaspora audience.',
  },
  {
    key: 'alumni',
    label: '400+ professional alumni',
    detail:
      'Registered SHESANs spanning finance, law, medicine, engineering, public service, and the creative industries.',
  },
];

export interface PartnerCategory {
  readonly key: 'institutional' | 'diplomatic' | 'corporate' | 'media';
  readonly title: string;
  readonly nature: string;
  readonly description: string;
  readonly examples: readonly string[];
  readonly cta: string;
}

export const PARTNER_CATEGORIES: readonly PartnerCategory[] = [
  {
    key: 'institutional',
    title: 'Institutional partners',
    nature: 'Protocol · not paid',
    description:
      'Government ministries, state agencies, and the Prime Ministry engage as institutional partners, carrying keynote and opening slots that align SHESA with the national development narrative. Not a paid tier: participation is by protocol invitation.',
    examples: [
      'Prime Ministry (Head of Government)',
      'Ministry of the Economy, Planning and Regional Development (MINEPAT)',
      'Ministry of External Relations (MINREX)',
      'Ministry of Territorial Administration (MINAT)',
      'Ministry of Employment and Professional Training (MINFORPA)',
      'Ministry of Public Contracts (MINARMP)',
      'Investment Promotion Agency (API)',
    ],
    cta: 'Institutional participation is confirmed through the SHESA Secretariat.',
  },
  {
    key: 'diplomatic',
    title: 'Diplomatic missions',
    nature: 'Bilateral engagement · not paid',
    description:
      'Embassies and High Commissions of countries with an active SHESA chapter join as bilateral partners, framed around diaspora engagement and cross-border professional exchange. Not a paid tier.',
    examples: [
      'United States Embassy · Yaoundé',
      'British High Commission · Yaoundé',
      'High Commission of Canada · Yaoundé',
      'Embassy of the Federal Republic of Germany · Yaoundé',
      'Embassy of Switzerland · Yaoundé',
    ],
    cta: 'Diplomatic invitations are extended through the SHESA Secretariat.',
  },
  {
    key: 'corporate',
    title: 'Corporate partners',
    nature: 'Commercial tiers apply',
    description:
      'Banks, telecoms, energy majors, FMCG, and sports operators sponsor the AGM through the tier structure below. Each tier trades brand visibility, hospitality, and access for a defined level of commercial support.',
    examples: [
      'Telecommunications operators',
      'Commercial and pan-African banks',
      'Energy majors and parastatals',
      'FMCG and beverage brands',
      'Sports federations and betting operators',
    ],
    cta: 'Request the partnership deck for tier amounts and full benefits.',
  },
  {
    key: 'media',
    title: 'Media partners',
    nature: 'In-kind · coverage traded',
    description:
      'Broadcast and print media join as accreditation partners, trading coverage for protocol placement, access to spokespeople, and content rights. Not a paid tier.',
    examples: [
      'National television and radio broadcasters',
      'Private television networks with national reach',
      'Faith-aligned broadcasters covering Mass segments',
      'Print and digital newsrooms with a professional readership',
    ],
    cta: 'Accreditation is handled by the SHESA Communications Team.',
  },
];

export interface CommercialTier {
  readonly key: 'naming' | 'platinum' | 'gold' | 'silver' | 'exhibition';
  readonly label: string;
  readonly headline: string;
  readonly summary: string;
  readonly benefits: readonly string[];
  readonly accent: 'primary' | 'platinum' | 'gold' | 'silver' | 'bronze';
}

export const COMMERCIAL_TIERS: readonly CommercialTier[] = [
  {
    key: 'naming',
    label: 'Naming Partner',
    headline: 'The AGM 2026 is presented by you.',
    summary:
      'A single partner shares the headline slot with SHESA. Reserved for a category leader whose brand can carry the assembly’s public identity.',
    benefits: [
      'Presenting billing across every AGM asset, printed, digital, on-stage.',
      'Headline placement on the connectivity spine of the assembly.',
      'Executive briefing with the SHESA board and diaspora chapter leads.',
      'Naming rights on a session or venue zone of your choice.',
      'Featured integration into the SHESA Connect platform launch.',
    ],
    accent: 'primary',
  },
  {
    key: 'platinum',
    label: 'Platinum',
    headline: 'Front-of-house alongside the anchor partners.',
    summary:
      'For institutions positioning themselves as anchor sponsors, premium visibility, executive access, and a strong content moment.',
    benefits: [
      'Premium logo placement across stage backdrop, brochure, and digital assets.',
      'Full-page feature in the AGM brochure.',
      'Reserved hospitality: a ten-seat table across the gala and formal sessions.',
      'Dedicated moment on the programme: welcome remarks or a sponsor showcase.',
      'Access to the diaspora chapter breakfast for direct executive engagement.',
    ],
    accent: 'platinum',
  },
  {
    key: 'gold',
    label: 'Gold',
    headline: 'Strong visibility across the three-day arc.',
    summary:
      'A prominent commercial partner tier that spans the tournament, the ceremony, and the gala, with a solid hospitality allocation.',
    benefits: [
      'Prime placement on the AGM stage backdrop and printed programme.',
      'Half-page feature in the AGM brochure.',
      'Six-seat gala table.',
      'Recognition at the opening ceremony.',
      'Speaking slot at the sponsor showcase.',
    ],
    accent: 'gold',
  },
  {
    key: 'silver',
    label: 'Silver',
    headline: 'Community partner. Solid presence, sensible scale.',
    summary:
      'A broad tier for partners who back the AGM without needing a headline slot, logo visibility, brochure feature, and gala seats.',
    benefits: [
      'Logo on the AGM website and printed programme.',
      'Quarter-page feature in the AGM brochure.',
      'Four-seat gala table.',
      'Feature in the SHESA quarterly newsletter.',
      'Recognition at the sponsor thank-you segment.',
    ],
    accent: 'silver',
  },
  {
    key: 'exhibition',
    label: 'Exhibition Partner',
    headline: 'A booth on the exhibition floor.',
    summary:
      'For partners whose activation is a physical stand: product demos, sign-ups, giveaways. Focused on the exhibition zone rather than the main stage.',
    benefits: [
      'Reserved exhibition footprint in the AGM village.',
      'Two brand ambassadors accredited across the three days.',
      'Logo in the sponsor grid on the AGM website and programme.',
      'Two seats at the gala.',
      'Inclusion in the sponsor sweep on SHESA channels.',
    ],
    accent: 'bronze',
  },
];

export interface TargetSector {
  readonly key: string;
  readonly title: string;
  readonly angle: string;
}

export const TARGET_SECTORS: readonly TargetSector[] = [
  {
    key: 'telecom',
    title: 'Telecommunications',
    angle:
      'Official connectivity partner for the assembly, the operator powering the network in front of ministers, ambassadors, and executives.',
  },
  {
    key: 'banking',
    title: 'Banking & Financial Services',
    angle:
      'Client acquisition across SHESA’s executive membership and diaspora remittance corridors, premium visibility with a high-net-worth audience.',
  },
  {
    key: 'energy',
    title: 'Energy & National Champions',
    angle:
      'National-champion visibility aligned with SHESA’s national-development partnership narrative and infrastructure themes.',
  },
  {
    key: 'fmcg',
    title: 'FMCG & Beverage',
    angle:
      'Official partner of the Gala Dinner, brand in the hands of the assembly’s most influential audience across two nights.',
  },
  {
    key: 'sports',
    title: 'Sports & Betting',
    angle:
      'Natural tie-in to the Friday Regional Football Tournament, jerseys, signage, and the trophy moment.',
  },
  {
    key: 'insurance',
    title: 'Insurance & Wealth',
    angle:
      'Direct match with the SHESA welfare initiative and the Trust Fund narrative, long-horizon products for a stable professional cohort.',
  },
];

export const SPONSOR_META = {
  eyebrow: 'AGM 2026 · Partnerships',
  headline: 'Partner with the SHESA AGM 2026.',
  subhead:
    'Three days. Palais des Congrès. Yaoundé. Ministers, ambassadors, C-suite executives, and 400+ professional alumni, in one room, on one programme.',
  dates: 'Friday 13, Sunday 15 November 2026',
  venue: 'Palais des Congrès de Yaoundé',
} as const;
