import { Images } from 'lucide-react';

import { loadEditorGallery } from './load-gallery';
import { AlbumsListView } from './widgets/albums-list-view';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Editor — Gallery' };

/** Gallery list page for the Editor persona. */
export default async function EditorGalleryPage() {
  const { albums, categories, events } = await loadEditorGallery();

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <header className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Content
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <Images className="h-6 w-6" />
          Gallery
        </h1>
        <p className="text-sm text-muted-foreground">
          Albums shown on the public Gallery page. Each album groups photos and videos, and can be
          linked to a Site Event so the event page shows a “View album” button.
        </p>
      </header>

      <AlbumsListView albums={albums} categories={categories} events={events} />
    </section>
  );
}
