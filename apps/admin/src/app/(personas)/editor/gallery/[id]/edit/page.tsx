import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Images } from 'lucide-react';

import { loadAlbumMedia, loadEditorGallery } from '../../load-gallery';
import { AlbumForm } from '../../widgets/album-form';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Editor — Edit album' };

interface Params {
  readonly params: Promise<{ id: string }>;
}

/** Edit-album page for the Editor persona. */
export default async function EditAlbumPage({ params }: Params) {
  const { id } = await params;
  const [{ albums, categories, events, organs }, media] = await Promise.all([
    loadEditorGallery(),
    loadAlbumMedia(id),
  ]);
  const album = albums.find((a) => a.id === id);
  if (!album) notFound();

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Link
          href="/editor/gallery"
          className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Gallery
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <Images className="h-6 w-6" />
          Edit album
        </h1>
        <p className="text-xs text-muted-foreground">{album.title}</p>
      </div>

      <AlbumForm
        categories={categories}
        events={events}
        organs={organs}
        editing={album}
        media={media}
      />
    </section>
  );
}
