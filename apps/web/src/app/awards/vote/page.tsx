import type { Metadata } from 'next';

import { BallotPage } from '@/components/awards/ballot-page';

export const metadata: Metadata = {
  title: 'Vote · SHESA Leadership Awards',
  description:
    'Cast your ballot in the SHESA Leadership Awards 2026. One vote per person, results presented at the AGM.',
  alternates: { canonical: '/awards/vote' },
};

/** Never cached: a ballot is per-device and the window turns on the clock. */
export const dynamic = 'force-dynamic';

export default function VotePage() {
  return <BallotPage />;
}
