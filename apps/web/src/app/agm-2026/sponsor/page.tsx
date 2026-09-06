import type { Metadata } from 'next';

import { AgmSponsorAudience } from '@/components/agm-sponsor/agm-sponsor-audience';
import { AgmSponsorHero } from '@/components/agm-sponsor/agm-sponsor-hero';
import { CommercialTiers } from '@/components/agm-sponsor/commercial-tiers';
import { PartnerCategories } from '@/components/agm-sponsor/partner-categories';
import { SponsorRequestDeck } from '@/components/agm-sponsor/sponsor-request-deck';
import { TargetSectors } from '@/components/agm-sponsor/target-sectors';
import { PartnersStadium } from '@/components/home/partners-stadium';

export const metadata: Metadata = {
  title: 'AGM 2026 Partnerships',
  description:
    'Partner with the SHESA AGM 2026 in Yaoundé, institutional, diplomatic, corporate, and media partnership routes for one of Cameroon’s most influential three-day gatherings.',
  alternates: { canonical: '/agm-2026/sponsor' },
  openGraph: {
    title: 'AGM 2026 Partnerships',
    description:
      'Partner with the SHESA AGM 2026 in Yaound\u00e9, institutional, diplomatic, corporate, and media partnership routes for one of Cameroon\u2019s most influential three-day gatherings.',
    url: '/agm-2026/sponsor',
    type: 'website',
  },
};

export default function AgmSponsorPage() {
  return (
    <>
      <AgmSponsorHero />
      <AgmSponsorAudience />
      <PartnerCategories />
      <CommercialTiers />
      <TargetSectors />
      <SponsorRequestDeck />
      {/* Partner boards always sit last, immediately above the footer. */}
      <PartnersStadium />
    </>
  );
}
