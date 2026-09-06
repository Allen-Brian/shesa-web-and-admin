'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check, Pause, Play, Share2 } from 'lucide-react';
import { useState } from 'react';

import { Engagement } from '@/components/ui/engagement';

import { usePlayer } from './player-context';
import { SongCover } from './song-cover';
import type { PublicSong, PublicSongGroup } from './songs-content';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

/**
 * One song, in full: cover, credits, the play control, the words.
 *
 * The lyrics and description an editor types were being collected and
 * never shown — the browser only ever rendered a card. This is the page
 * a shared link opens, so it carries everything the CMS holds about the
 * track and a share button of its own.
 */
export function SongDetail({
  song,
  group,
}: {
  readonly song: PublicSong;
  readonly group: PublicSongGroup | null;
}) {
  const player = usePlayer();
  const [copied, setCopied] = useState(false);

  const isCurrent = player.current?.id === song.id;
  const isPlaying = isCurrent && player.isPlaying;

  const onPlay = () => {
    if (isCurrent) player.toggle();
    else player.play(song);
  };

  /**
   * Share sheet where the browser has one, clipboard everywhere else.
   * Both end with the visitor holding this page's URL, which opens the
   * song with its play button under the reader's thumb.
   */
  const onShare = async () => {
    const url = window.location.href;
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({ title: song.title, text: song.performer ?? undefined, url });
        return;
      } catch {
        /* Dismissed: fall through to the clipboard. */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      /* Nothing more to offer if the clipboard is unavailable. */
    }
  };

  return (
    <article className="relative bg-white pb-24 pt-32 md:pb-32 md:pt-40">
      <div className="mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <Link
          href="/songs"
          className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-black/50 transition-colors hover:text-primary"
        >
          <span aria-hidden>←</span> All songs
        </Link>

        <div className="mt-10 grid gap-10 md:grid-cols-12 md:gap-14">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease }}
            className="md:col-span-5"
          >
            <div className="relative aspect-square overflow-hidden rounded-xs bg-black/90 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.5)]">
              <SongCover
                src={song.coverUrl}
                title={song.title}
                priority
                sizes="(min-width: 768px) 40vw, 100vw"
                className="object-cover object-top"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease }}
            className="md:col-span-7"
          >
            {group && (
              <p className="font-heading text-[11px] font-medium uppercase tracking-[0.28em] text-primary">
                {group.name}
              </p>
            )}

            <h1
              className="mt-4 font-heading font-thin leading-[1.05] text-black"
              style={{ fontSize: 'clamp(2rem, 4.6vw, 3.75rem)', letterSpacing: '-0.02em' }}
            >
              {song.title}
            </h1>

            {song.performer && (
              <p className="mt-3 font-heading text-[15px] font-medium uppercase tracking-[0.24em] text-black/55">
                {song.performer}
              </p>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onPlay}
                className="group inline-flex items-center gap-3 rounded-xs bg-primary px-7 py-4 text-sm font-medium tracking-wide text-primary-foreground shadow-[0_20px_60px_-15px_rgba(139,21,51,0.5)] transition-transform duration-500 hover:-translate-y-0.5"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4 fill-current" aria-hidden />
                ) : (
                  <Play className="h-4 w-4 fill-current" aria-hidden />
                )}
                {isPlaying ? 'Pause' : 'Play this song'}
              </button>

              <button
                type="button"
                onClick={onShare}
                className="inline-flex items-center gap-2.5 rounded-xs border border-black/15 px-5 py-4 text-sm font-medium tracking-wide text-black/70 transition-colors duration-300 hover:border-primary hover:text-primary"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-primary" aria-hidden />
                ) : (
                  <Share2 className="h-4 w-4" aria-hidden />
                )}
                {copied ? 'Link copied' : 'Share'}
              </button>

              <Engagement kind="song" entityId={song.id} countView className="ml-1" />
            </div>

            {song.description && (
              <p className="mt-9 max-w-2xl text-[16px] leading-[1.85] text-black/70">
                {song.description}
              </p>
            )}
          </motion.div>
        </div>

        {song.lyrics && (
          <motion.section
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.8, ease }}
            className="mt-16 md:mt-24"
          >
            <p className="font-heading text-sm font-medium uppercase tracking-[0.28em] text-primary">
              Lyrics
            </p>

            {/* `whitespace-pre-line` keeps the editor's line and verse
                breaks, which is the whole shape of a lyric. */}
            <div className="mt-8 max-w-3xl rounded-xs border border-black/8 bg-black/2 p-6 md:p-10">
              <p className="whitespace-pre-line text-[16px] leading-loose text-black/75">
                {song.lyrics}
              </p>
            </div>
          </motion.section>
        )}
      </div>
    </article>
  );
}
