'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { ListMusic, Music4, Pause } from 'lucide-react';

import { EmptyState } from '@/components/ui/empty-state';

import type { PublicSong, PublicSongGroup } from './songs-content';
import { usePlayer } from './player-context';
import { SongAmbience } from './song-ambience';
import { SongCard } from './song-card';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, delay: i * 0.08, ease },
  }),
};

const ALL = 'All';

function SearchIcon({ className }: { readonly className?: string }) {
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
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

interface Props {
  readonly songs: readonly PublicSong[];
  readonly groups: readonly PublicSongGroup[];
}

/**
 * Search + group-filter + responsive grid of song cards. Feeds the
 * player's queue with the current filtered list so "next"/"prev" only
 * walks over songs the user is actually browsing.
 *
 * "Play all" runs that same filtered list, which is what makes it useful
 * rather than decorative: filter to a chapter, press it, and you hear
 * that chapter's songs and nothing else.
 *
 * The ambient wash is keyed to `isPlaying` rather than to this page, so
 * the songbook warms up wherever the visitor happened to press play —
 * most of them never reach a track's own page.
 */
export function SongsBrowser({ songs, groups }: Props) {
  const player = usePlayer();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<string>(ALL);

  if (songs.length === 0) {
    return (
      <section className="relative overflow-hidden py-24 text-black md:py-28">
        <div className="mx-auto max-w-3xl px-5 md:px-8 lg:px-12">
          <EmptyState
            icon={Music4}
            heading="The songbook is empty for now"
            body="Anthems, chapter songs, and cultural pieces will show up here as they're added to the SHESA archive."
            cta={{ label: 'Back to home', href: '/' }}
          />
        </div>
      </section>
    );
  }

  const filters = useMemo(() => [ALL, ...groups.map((g) => g.name)], [groups]);
  const groupById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return songs.filter((s) => {
      const groupName = groupById.get(s.groupId)?.name ?? '';
      if (filter !== ALL && groupName !== filter) return false;
      if (!q) return true;
      return (
        s.title.toLowerCase().includes(q) ||
        !!s.performer?.toLowerCase().includes(q) ||
        groupName.toLowerCase().includes(q)
      );
    });
  }, [songs, groupById, query, filter]);

  // Keep the player's queue in sync with what the user is currently browsing.
  useEffect(() => {
    player.setQueue(list);
  }, [list, player]);

  // The one button is play and pause, so it needs to know the run it
  // started is still the run that is playing — not merely that some song
  // is, which would be true after the visitor picked a different card.
  const runningNow = player.isQueueRunning && player.isPlaying;

  return (
    <section
      className="relative isolate overflow-hidden py-20 text-black md:py-24"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 3%, white) 0%, color-mix(in srgb, var(--color-primary) 5%, white) 100%)',
      }}
    >
      {/* `isolate` above is load-bearing: without a stacking context here
          the -z-10 wash escapes this section and paints behind its own
          background instead of on top of it. */}
      <SongAmbience active={player.isPlaying} veil="soft" />

      <div className="relative mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <div className="grid gap-8 md:grid-cols-12 md:items-end md:gap-14">
          <div className="md:col-span-8">
            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.6 }}
              variants={fadeUp}
              className="font-heading text-sm font-medium uppercase tracking-[0.28em] text-primary"
            >
              The Songbook
            </motion.p>
            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              custom={1}
              className="mt-5 font-heading font-thin leading-[1.05] text-black"
              style={{ fontSize: 'clamp(1.85rem, 3.8vw, 3.5rem)', letterSpacing: '-0.02em' }}
            >
              Find <span className="italic text-primary">the one.</span>
            </motion.h2>
          </div>
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={fadeUp}
            custom={2}
            className="max-w-md text-[15px] leading-[1.7] text-black/60 md:col-span-4"
          >
            Search by title, performer, or chapter, press play and it stays with you as you scroll.
          </motion.p>
        </div>

        {/* Search bar */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={fadeUp}
          custom={3}
          className="mt-10 flex flex-col gap-4 md:mt-12 md:flex-row md:items-center md:justify-between"
        >
          <label className="relative flex flex-1 items-center">
            <SearchIcon className="pointer-events-none absolute left-4 h-4 w-4 text-black/40" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search anthems, chapters, performers…"
              className="w-full rounded-xs border border-black/12 bg-white py-3.5 pl-11 pr-5 text-[14px] text-black placeholder:text-black/40 focus:border-primary focus:outline-none"
            />
          </label>

          <button
            type="button"
            onClick={runningNow ? player.pause : player.playAll}
            disabled={list.length === 0}
            className="inline-flex shrink-0 items-center justify-center gap-2.5 rounded-xs bg-primary px-6 py-3.5 text-[14px] font-medium tracking-wide text-primary-foreground transition-transform duration-500 hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-40"
          >
            {runningNow ? (
              <Pause className="h-4 w-4 fill-current" aria-hidden />
            ) : (
              <ListMusic className="h-4 w-4" aria-hidden />
            )}
            {runningNow ? 'Pause' : 'Play all'}
            <span className="tabular-nums opacity-70">({list.length})</span>
          </button>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={fadeUp}
          custom={4}
          className="mt-6 flex flex-wrap items-center gap-2"
        >
          {filters.map((f) => {
            const active = filter === f;
            const count =
              f === ALL
                ? songs.length
                : songs.filter((s) => groupById.get(s.groupId)?.name === f).length;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`inline-flex items-center gap-2 rounded-xs border px-4 py-2 text-[12.5px] font-medium tracking-wide transition-all ${
                  active
                    ? 'border-primary bg-primary text-white'
                    : 'border-black/12 bg-white text-black/70 hover:border-primary/40 hover:text-primary'
                }`}
              >
                <span>{f}</span>
                <span
                  className={`rounded-xs px-1.5 py-0.5 text-[10px] tabular-nums ${
                    active ? 'bg-white/25 text-white' : 'bg-black/5 text-black/50'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </motion.div>

        {/* Grid */}
        <div className="mt-12 md:mt-16">
          <AnimatePresence mode="popLayout">
            {list.length === 0 ? (
              <motion.p
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-xs border border-dashed border-black/15 bg-white p-10 text-center text-sm text-black/50"
              >
                No songs match “{query || filter}”.
              </motion.p>
            ) : (
              <motion.div
                key="grid"
                layout
                className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:grid-cols-4"
              >
                {list.map((song, i) => (
                  <SongCard key={song.id} song={song} index={i} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
