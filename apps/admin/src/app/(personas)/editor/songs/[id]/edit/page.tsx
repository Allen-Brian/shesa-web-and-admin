import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Music } from 'lucide-react';

import { loadEditorSongs } from '../../load-songs';
import { SongForm } from '../../widgets/song-form';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Editor — Edit song' };

interface Params {
  readonly params: Promise<{ id: string }>;
}

export default async function EditSongPage({ params }: Params) {
  const { id } = await params;
  const { songs, groups } = await loadEditorSongs();
  const song = songs.find((s) => s.id === id);
  if (!song) notFound();

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
          Edit song
        </h1>
        <p className="text-xs text-muted-foreground">{song.title}</p>
      </div>

      <SongForm groups={groups} editing={song} />
    </section>
  );
}
