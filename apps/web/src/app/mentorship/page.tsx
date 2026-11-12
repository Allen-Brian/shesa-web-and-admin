import type { Metadata } from 'next';

import { CircleGrid } from '@/components/mentorship/circle-grid';
import { MentorshipHero } from '@/components/mentorship/mentorship-hero';
import { ShareBlock } from '@/components/mentorship/share-block';

const description =
  'SHESA mentorship circles on WhatsApp, split by field: business, health, technology and law. Find the room that matches what you do and join it.';

export const metadata: Metadata = {
  title: 'Mentorship',
  description,
  alternates: { canonical: '/mentorship' },
  openGraph: {
    title: 'Mentorship',
    description,
    url: '/mentorship',
    type: 'website',
  },
};

export default function MentorshipPage() {
  return (
    <>
      <MentorshipHero />
      <CircleGrid />
      <ShareBlock />
    </>
  );
}
