import type { Metadata } from 'next';

import { ReelPlayer } from '@/components/platforms/reel-player';

/**
 * The SHESA Digital pitch, for EXCO and funders — a timed, voiced reel
 * that stands in for the slide deck.
 *
 * Unlisted, like the cup trailer: it carries the engagement's figures,
 * so it stays out of search results (`robots` here and in `robots.ts`)
 * and nothing in the site links to it. Share the URL directly.
 *
 * Content lives in `components/platforms/platforms-content.ts`.
 */
export const metadata: Metadata = {
  title: 'SHESA Digital — The Six Platforms',
  description: 'Six integrated platforms. One digital institution.',
  alternates: { canonical: '/platforms/pitch' },
  robots: { index: false, follow: false },
};

export default function PlatformsPitchPage() {
  return <ReelPlayer mode="pitch" />;
}
