import type { Metadata } from 'next';

import { AlbumGrid } from '@/components/gallery/album-grid';
import { GalleryHero } from '@/components/gallery/gallery-hero';

export const metadata: Metadata = {
  title: 'Gallery · SHESA',
  description:
    'The unfiltered SHESA archive — reunions, ceremonies, community drives, and the moments in between.',
};

export default function GalleryPage() {
  return (
    <>
      <GalleryHero />
      <AlbumGrid />
    </>
  );
}
