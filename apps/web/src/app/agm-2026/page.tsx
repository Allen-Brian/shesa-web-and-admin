import type { Metadata } from 'next';

import { AgmAbout } from '@/components/agm/agm-about';
import { AgmHero } from '@/components/agm/agm-hero';
import { AgmProgramme } from '@/components/agm/agm-programme';
import { AgmVenue } from '@/components/agm/agm-venue';
import { AttireSection } from '@/components/agm/attire-section';
import { FundingSection } from '@/components/agm/funding-section';
import { RegistrationSection } from '@/components/agm/registration-section';
import { SponsorBridge } from '@/components/agm/sponsor-bridge';
import { PartnersBillboard } from '@/components/home/partners-billboard';

export const metadata: Metadata = {
  title: 'AGM 2026 \u00b7 The Yaound\u00e9 Assembly',
  description:
    'The Sacred Heart Alumni AGM 2026 comes to Yaoundé, three days of assembly, ceremony, and handover. Register now.',
  alternates: { canonical: '/agm-2026' },
  openGraph: {
    title: 'AGM 2026 \u00b7 The Yaound\u00e9 Assembly',
    description:
      'The Sacred Heart Alumni AGM 2026 comes to Yaound\u00e9, three days of assembly, ceremony, and handover. Register now.',
    url: '/agm-2026',
    type: 'website',
  },
};

interface Search {
  readonly error?: string;
}

export default async function Agm2026Page({
  searchParams,
}: {
  readonly searchParams: Promise<Search>;
}) {
  const { error } = await searchParams;
  return (
    <>
      <AgmHero />
      <AgmAbout />
      <AgmProgramme />
      <FundingSection initialError={error} />
      <SponsorBridge />
      <RegistrationSection initialError={error} />
      <AttireSection initialError={error} />
      <AgmVenue />
      {/* Partner boards always sit last, immediately above the footer. */}
      <PartnersBillboard />
    </>
  );
}
