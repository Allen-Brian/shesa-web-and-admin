import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AlbumDetail } from '@/components/gallery/album-detail';
import { albums, findAlbum } from '@/components/gallery/data';

interface Params {
  readonly slug: string;
}

export function generateStaticParams() {
  return albums.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  readonly params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const album = findAlbum(slug);
  if (!album) return { title: 'Album · SHESA' };
  return {
    title: `${album.title} · SHESA Gallery`,
    description: album.description,
  };
}

export default async function AlbumPage({ params }: { readonly params: Promise<Params> }) {
  const { slug } = await params;
  const album = findAlbum(slug);
  if (!album) notFound();
  return <AlbumDetail album={album} />;
}
