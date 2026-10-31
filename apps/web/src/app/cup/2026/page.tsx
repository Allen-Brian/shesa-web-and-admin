import type { Metadata } from 'next';

import { CupTrailer } from '@/components/cup/cup-trailer';
import { CUP, SHARE_DESCRIPTION } from '@/components/cup/cup-content';

/**
 * The tournament trailer, shared by link only.
 *
 * Unlisted rather than secret: there is nothing sensitive here, it
 * simply should not turn up in a search result or the sitemap before
 * the campaign is announced. `robots` keeps it out of the index,
 * `robots.ts` keeps crawlers off the path, and nothing in the site
 * navigation links to it.
 *
 * Everything on the page is currently placeholder content. See
 * `components/cup/cup-content.ts`, which is the only file that needs
 * editing when the real facts arrive.
 */
export const metadata: Metadata = {
  title: `${CUP.name} ${CUP.edition}`,
  description: SHARE_DESCRIPTION,
  alternates: { canonical: '/cup/2026' },
  robots: { index: false, follow: false },
  openGraph: {
    title: `${CUP.name} ${CUP.edition}`,
    description: SHARE_DESCRIPTION,
    url: '/cup/2026',
    type: 'website',
  },
};

export default function CupTrailerPage() {
  return <CupTrailer />;
}
