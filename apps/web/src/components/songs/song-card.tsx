'use client';

import { AnimatePresence, motion } from 'framer-motion';

import type { PublicSong } from './songs-content';
import { Engagement } from '@/components/ui/engagement';

import Link from 'next/link';

import { downloadFile } from '@/lib/download-file';

import { SongCover } from './song-cover';
import { usePlayer } from './player-context';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

function PlayIcon({ className }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7L8 5z" />
    </svg>
  );
}
function PauseIcon({ className }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}
function DownloadIcon({ className }: { readonly className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
    </svg>
  );
}

function formatDuration(seconds: number | null): string {
  if (!seconds || !Number.isFinite(seconds)) return '';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

interface Props {
  readonly song: PublicSong;
  readonly index: number;
}

/**
 * Card for a single song in the browse grid. Cover image (or a
 * lettered fallback), title + performer, a play/pause pill that
 * flips to "Playing…" state when this song is the docked player's
 * current track, and a tiny download icon. Hovering nudges the card up
 * and reveals a subtle glow on the cover.
 */
export function SongCard({ song, index }: Props) {
  const player = usePlayer();
  const isCurrent = player.current?.id === song.id;
  const isPlaying = isCurrent && player.isPlaying;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.55, delay: 0.04 + (index % 8) * 0.04, ease }}
      className="group relative flex flex-col overflow-hidden rounded-xs border border-black/8 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-500 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_18px_40px_-12px_rgba(139,21,51,0.16)]"
    >
      <div className="relative aspect-square overflow-hidden bg-black/90">
        <SongCover
          src={song.coverUrl}
          title={song.title}
          className="object-cover object-top transition-transform duration-1000 group-hover:scale-105"
        />

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-transparent"
        />

        {/* Now-playing badge */}
        <AnimatePresence>
          {isCurrent && (
            <motion.div
              key="badge"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-xs bg-primary/95 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.22em] text-white backdrop-blur-sm"
            >
              <NowPlayingDots active={isPlaying} />
              {isPlaying ? 'Playing' : 'Paused'}
            </motion.div>
          )}
        </AnimatePresence>

        {song.durationSeconds && (
          <span className="absolute right-3 top-3 rounded-xs bg-black/55 px-2 py-0.5 font-mono text-[10.5px] tabular-nums text-white backdrop-blur-sm">
            {formatDuration(song.durationSeconds)}
          </span>
        )}

        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 text-white">
          <div className="min-w-0">
            <Link
              href={`/songs/${song.slug}`}
              className="block truncate font-heading font-light leading-tight text-white transition-colors hover:text-white/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              style={{ fontSize: '1rem', letterSpacing: '-0.005em' }}
            >
              {song.title}
            </Link>
            <p className="mt-1 truncate text-[11.5px] font-medium uppercase tracking-[0.24em] text-white/75">
              {song.performer ?? '-'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => (isCurrent ? player.toggle() : player.play(song))}
            aria-label={isPlaying ? `Pause ${song.title}` : `Play ${song.title}`}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-primary shadow-lg transition-all duration-300 hover:scale-110 hover:bg-primary hover:text-white"
          >
            {isPlaying ? (
              <PauseIcon className="h-5 w-5" />
            ) : (
              <PlayIcon className="h-5 w-5 translate-x-[1px]" />
            )}
          </button>
        </div>
      </div>

      <div className="flex items-start justify-between gap-3 border-t border-black/8 bg-white/95 p-4">
        <div className="min-w-0">
          {song.description && (
            <p className="line-clamp-2 text-[12.5px] leading-[1.55] text-black/60">
              {song.description}
            </p>
          )}
          {/* No `countView` here. It used to be set as a stand-in for a
              play count we did not have, so scrolling past a card counted
              as reading the song. Now that plays are counted properly,
              that proxy only inflates views — and the two numbers sit
              side by side, where the contradiction would show. A view is
              opening the song; that is the detail page's to record. */}
          <Engagement kind="song" entityId={song.id} showPlays size="sm" className="mt-2" />
        </div>
        {/* A button, not a link: `<a download>` is ignored cross-origin,
            and the audio lives on Supabase Storage. See lib/download-file. */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void downloadFile(song.audioUrl, song.title);
          }}
          aria-label={`Download ${song.title}`}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-xs bg-black/5 text-black/60 transition-colors hover:bg-primary hover:text-white"
        >
          <DownloadIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.article>
  );
}

/** Three dots that pulse in place when audio is playing. */
function NowPlayingDots({ active }: { readonly active: boolean }) {
  return (
    <span aria-hidden className="inline-flex items-end gap-[3px]">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="block w-[3px] rounded-full bg-white"
          initial={{ height: 4 }}
          animate={active ? { height: [4, 10, 6, 12, 5] } : { height: 4 }}
          transition={
            active
              ? { duration: 0.9 + i * 0.15, repeat: Infinity, ease: 'easeInOut', delay: i * 0.1 }
              : { duration: 0.2 }
          }
        />
      ))}
    </span>
  );
}
