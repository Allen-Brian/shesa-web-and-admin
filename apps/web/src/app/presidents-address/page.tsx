import type { Metadata } from 'next';

import { PRESIDENTS_ADDRESS } from '@/components/president/presidents-address-content';
import { PresidentsLetter } from '@/components/president/presidents-letter';

export const metadata: Metadata = {
  title: PRESIDENTS_ADDRESS.title,
  description: PRESIDENTS_ADDRESS.excerpt,
  alternates: { canonical: '/presidents-address' },
  openGraph: {
    title: PRESIDENTS_ADDRESS.title,
    description: PRESIDENTS_ADDRESS.excerpt,
    url: '/presidents-address',
    type: 'website',
  },
};

/**
 * The President General's address in full. Off-nav by design — reached
 * from the home-page excerpt, the way the Strategic Plan page is.
 */
export default function PresidentsAddressPage() {
  return <PresidentsLetter />;
}
