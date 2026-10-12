import { Music } from 'lucide-react';

import { loadEditorSongs } from './load-songs';
import { SongsListView } from './widgets/songs-list-view';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Editor — Songs' };

export default async function EditorSongsPage() {
  const { songs, groups } = await loadEditorSongs();

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <header className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Content
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <Music className="h-6 w-6" />
          Songs
        </h1>
        <p className="text-sm text-muted-foreground">
          The SHESA songbook. Groups organise the catalogue; every song surfaces on the public Songs
          page with a lightweight player + optional lyrics + download.
        </p>
      </header>

      <SongsListView songs={songs} groups={groups} />
    </section>
  );
}
