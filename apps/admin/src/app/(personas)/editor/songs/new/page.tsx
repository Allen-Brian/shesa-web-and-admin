import Link from 'next/link';
import { ArrowLeft, Music } from 'lucide-react';

import { loadEditorSongs } from '../load-songs';
import { SongForm } from '../widgets/song-form';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Editor — New song' };

export default async function NewSongPage() {
  const { groups } = await loadEditorSongs();

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Link
          href="/editor/songs"
          className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Songs
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <Music className="h-6 w-6" />
          New song
        </h1>
      </div>

      <SongForm groups={groups} />
    </section>
  );
}
