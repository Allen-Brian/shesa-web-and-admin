import type { Metadata } from 'next';

import { AgmAbout } from '@/components/agm/agm-about';
import { AgmHero } from '@/components/agm/agm-hero';
import { AgmProgramme } from '@/components/agm/agm-programme';
import { AgmVenue } from '@/components/agm/agm-venue';
import { AttireSection } from '@/components/agm/attire-section';
import { FundingSection } from '@/components/agm/funding-section';
import { RegistrationSection } from '@/components/agm/registration-section';

export const metadata: Metadata = {
  title: 'AGM 2026 — The Yaoundé Assembly · SHESA',
  description:
    'The Sacred Heart Alumni AGM 2026 comes to Yaoundé — three days of assembly, ceremony, and handover. Register now.',
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
      <AgmVenue />
      <RegistrationSection initialError={error} />
      <AttireSection initialError={error} />
      <FundingSection initialError={error} />
    </>
  );
}
