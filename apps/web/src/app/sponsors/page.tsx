import type { Metadata } from 'next';

import { BecomeASponsor } from '@/components/sponsors/become-a-sponsor';
import { RollOfHonour } from '@/components/sponsors/roll-of-honour';
import { SponsorsHero } from '@/components/sponsors/sponsors-hero';
import { TiersSection } from '@/components/sponsors/tiers-section';

export const metadata: Metadata = {
  title: 'Sponsors',
  description:
    'The institutions, chapters, and businesses who carry the SHESA year, from Platinum partners to community backers.',
  alternates: { canonical: '/sponsors' },
  openGraph: {
    title: 'Sponsors',
    description:
      'The institutions, chapters, and businesses who carry the SHESA year, from Platinum partners to community backers.',
    url: '/sponsors',
    type: 'website',
  },
};

export default function SponsorsPage() {
  return (
    <>
      <SponsorsHero />
      <TiersSection />
      <RollOfHonour />
      <BecomeASponsor />
    </>
  );
}
