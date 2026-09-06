'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Images } from 'lucide-react';

import { EmptyState } from '@/components/ui/empty-state';

import { MetricsBadge, MetricsProvider } from '@/components/ui/metrics-badge';

import type { Album } from './gallery-content';
import { ALL_CATEGORY } from './gallery-content';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, delay: i * 0.08, ease },
  }),
};

interface AlbumGridProps {
  readonly albums: readonly Album[];
  readonly categories: readonly string[];
}

export function AlbumGrid({ albums, categories }: AlbumGridProps) {
  const [filter, setFilter] = useState<string>(ALL_CATEGORY);

  const filters = useMemo(() => [ALL_CATEGORY, ...categories], [categories]);

  const list = useMemo(
    () => (filter === ALL_CATEGORY ? albums : albums.filter((a) => a.category === filter)),
    [albums, filter],
  );

  if (albums.length === 0) {
    return (
      <section
        className="relative overflow-hidden py-24 text-black md:py-28"
        style={{
          background:
            'linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 3%, white) 0%, color-mix(in srgb, var(--color-primary) 5%, white) 100%)',
        }}
      >
        <div className="mx-auto max-w-3xl px-5 md:px-8 lg:px-12">
          <EmptyState
            icon={Images}
            heading="No albums in the archive yet"
            body="Photos from reunions, ceremonies, and community drives will land here once the first album is uploaded."
            cta={{ label: 'Back to home', href: '/' }}
          />
        </div>
      </section>
    );
  }

  return (
    <section
      className="relative overflow-hidden py-20 text-black md:py-24"
      style={{
        background:
          'linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 3%, white) 0%, color-mix(in srgb, var(--color-primary) 5%, white) 100%)',
      }}
    >
      <div className="mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <div className="grid gap-8 md:grid-cols-12 md:items-end md:gap-14">
          <div className="md:col-span-8">
            <motion.p
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.6 }}
              variants={fadeUp}
              className="font-heading text-sm font-medium uppercase tracking-[0.28em] text-primary"
            >
              The Albums
            </motion.p>

            <motion.h2
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={fadeUp}
              custom={1}
              className="mt-5 font-heading font-thin leading-[1.05] text-black"
              style={{
                fontSize: 'clamp(1.85rem, 3.8vw, 3.5rem)',
                letterSpacing: '-0.02em',
              }}
            >
              Pick a <span className="italic text-primary">memory.</span>
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
            Every album downloads in full. Filter by the kind of gathering you're after.
          </motion.p>
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={fadeUp}
          custom={3}
          className="mt-10 flex flex-wrap items-center gap-2 md:mt-12"
        >
          {filters.map((c) => {
            const active = filter === c;
            const count =
              c === ALL_CATEGORY ? albums.length : albums.filter((a) => a.category === c).length;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setFilter(c)}
                className={`inline-flex items-center gap-2 rounded-xs border px-4 py-2 text-[12.5px] font-medium tracking-wide transition-all ${
                  active
                    ? 'border-primary bg-primary text-white'
                    : 'border-black/12 bg-white text-black/70 hover:border-primary/40 hover:text-primary'
                }`}
              >
                <span>{c}</span>
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
                No albums yet in this category.
              </motion.p>
            ) : (
              <motion.div
                key="grid"
                layout
                className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:gap-6 lg:grid-cols-3"
              >
                <MetricsProvider kind="album" ids={list.map((a) => a.id)}>
                  {list.map((album, i) => (
                    <motion.div
                      key={album.slug}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 12 }}
                      transition={{ duration: 0.5, delay: 0.05 + (i % 6) * 0.06, ease }}
                    >
                      <AlbumCard album={album} />
                    </motion.div>
                  ))}
                </MetricsProvider>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function AlbumCard({ album }: { readonly album: Album }) {
  const photoCount = album.media.filter((m) => m.type === 'photo').length;
  const videoCount = album.media.filter((m) => m.type === 'video').length;

  return (
    <Link
      href={`/gallery/${album.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-xs border border-black/8 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-500 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_18px_40px_-12px_rgba(139,21,51,0.16)]"
    >
      <div className="relative aspect-4/3 overflow-hidden">
        <Image
          src={album.cover}
          alt={album.title}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          quality={75}
          className="object-cover transition-transform duration-1000 group-hover:scale-105"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.7) 100%)',
          }}
        />
        <span className="absolute right-3 top-3 rounded-xs bg-black/55 px-2.5 py-1 font-heading text-[10px] font-medium uppercase tracking-[0.22em] text-white backdrop-blur-sm">
          {album.category}
        </span>
        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-white/75">
            {album.date}
          </p>
          <h3
            className="mt-1 font-heading font-light leading-tight text-white"
            style={{ fontSize: '1.15rem', letterSpacing: '-0.005em' }}
          >
            {album.title}
          </h3>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5 md:p-6">
        <p className="line-clamp-2 text-[13.5px] leading-[1.6] text-black/60">
          {album.description}
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 pt-2">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="font-heading text-[11px] font-medium uppercase tracking-[0.24em] text-black/50">
              {photoCount} photos
              {videoCount > 0 ? ` · ${videoCount} videos` : ''}
            </p>
            <MetricsBadge entityId={album.id} />
          </div>
          <span
            aria-hidden
            className="inline-flex items-center gap-1 text-[12.5px] font-medium text-primary transition-transform duration-300 group-hover:translate-x-1"
          >
            Open <span aria-hidden>→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
