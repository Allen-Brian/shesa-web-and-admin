import type { Metadata } from 'next';

import { AgmAbout } from '@/components/agm/agm-about';
import { AgmHero } from '@/components/agm/agm-hero';
import { AgmProgramme } from '@/components/agm/agm-programme';
import { AgmRecap } from '@/components/agm/agm-recap';
import { AgmVenue } from '@/components/agm/agm-venue';
import { PartnersBillboard } from '@/components/home/partners-billboard';

/**
 * AGM 2026, after the event.
 *
 * The assembly closed on 15 November 2026, so the registration, attire
 * and funding forms are no longer rendered. Their components and actions
 * stay in the repo: the receipt and confirmation pages for people who
 * already paid still depend on them. The page now leads with what the
 * recap will hold (`AgmRecap`, anchored at `#recap`).
 */
export const metadata: Metadata = {
  title: 'AGM 2026 \u00b7 The Yaound\u00e9 Assembly',
  description:
    'The Sacred Heart Alumni AGM 2026 in Yaound\u00e9 is over. Photos, film, resolutions and results are coming. Here first.',
  alternates: { canonical: '/agm-2026' },
  openGraph: {
    title: 'AGM 2026 \u00b7 The Yaound\u00e9 Assembly',
    description:
      'The Sacred Heart Alumni AGM 2026 in Yaound\u00e9 is over. Photos, film, resolutions and results are coming. Here first.',
    url: '/agm-2026',
    type: 'website',
  },
};

export default function Agm2026Page() {
  return (
    <>
      <AgmHero />
      <AgmRecap />
      <AgmAbout />
      <AgmProgramme />
      <AgmVenue />
      {/* Partner boards always sit last, immediately above the footer. */}
      <PartnersBillboard />
    </>
  );
}
