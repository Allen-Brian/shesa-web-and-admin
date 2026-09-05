/**
 * The one campaign the popup flyer advertises.
 *
 * To run a different event later, edit this object — `id` labels the
 * campaign for anyone reading the code. Set `active: false` to take
 * the flyer down entirely.
 */

export interface PromoHighlight {
  /** Big day numeral, e.g. "13". */
  readonly day: string;
  readonly month: string;
  readonly title: string;
  readonly detail: string;
}

export interface PromoCampaign {
  readonly id: string;
  readonly active: boolean;
  readonly ribbon: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly subtitle: string;
  /** Big date lockup, split so the numerals can be set large. */
  readonly dateRange: string;
  readonly monthYear: string;
  readonly venue: string;
  readonly city: string;
  readonly body: string;
  readonly highlights: readonly PromoHighlight[];
  /** Small print under the buttons — price, early bird, deadline. */
  readonly footnote: string;
  /** Backdrop image, a path under `public/`. */
  readonly image: string;
  readonly cta: { readonly label: string; readonly href: string };
  readonly secondary?: { readonly label: string; readonly href: string };
  /**
   * Route prefixes the flyer stays off. A prefix suppresses the path
   * itself and everything beneath it.
   */
  readonly suppressedPaths: readonly string[];
}

export const ACTIVE_PROMO: PromoCampaign = {
  id: 'agm-2026',
  active: true,
  ribbon: 'Registration open',
  eyebrow: 'SHESA presents',
  title: 'AGM 2026',
  subtitle: 'The Yaoundé Assembly',
  dateRange: '13 – 15',
  monthYear: 'November 2026',
  venue: 'Palais des Congrès',
  city: 'Yaoundé, Cameroon',
  body: 'Three days. One tournament, one assembly, one grand celebration — the largest gathering of Sacred Heart alumni yet.',
  highlights: [
    {
      day: '13',
      month: 'Fri',
      title: 'SHESA Regional Football Tournament',
      detail: 'Prize pool of 1,000,000 XAF.',
    },
    {
      day: '14',
      month: 'Sat',
      title: 'Ceremony, Assembly & Gala',
      detail: 'Mass, march past, the business session, then the gala night.',
    },
    {
      day: '15',
      month: 'Sun',
      title: 'Thanksgiving',
      detail: 'We close the way we opened, together.',
    },
  ],
  footnote: 'Tickets 20,000 XAF · Early bird until 30 September 2026',
  image: '/agm_flyer.jpeg',
  cta: { label: 'Get your ticket (20, 000 XAF)', href: '/agm-2026#register' },
  secondary: { label: 'See the full programme', href: '/agm-2026' },
  /**
   * The whole AGM subtree — landing page, sponsor pitch, confirmation
   * and receipt — plus the standalone receipt. Advertising the AGM to
   * someone already reading about it is noise, and interrupting a
   * payment confirmation with a modal is worse than noise.
   */
  suppressedPaths: ['/agm-2026', '/receipt'],
};
