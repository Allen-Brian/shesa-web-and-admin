'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';

import { Engagement } from '@/components/ui/engagement';

import { MediaGrid } from './media-grid';
import type { Album } from './gallery-content';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.85, delay: i * 0.1, ease },
  }),
};

const revealParent: Variants = {
  hidden: {},
  visible: { transition: { delayChildren: 0.25, staggerChildren: 0.15 } },
};

const revealLine: Variants = {
  hidden: { y: '110%' },
  visible: { y: 0, transition: { duration: 1, ease } },
};

export function AlbumDetail({ album }: { readonly album: Album }) {
  const photos = album.media.filter((m) => m.type === 'photo').length;
  const videos = album.media.filter((m) => m.type === 'video').length;

  return (
    <>
      <AlbumHero album={album} photos={photos} videos={videos} />
      <section className="relative bg-white py-14 md:py-16">
        {/* Above the grid, on the light background: the counter needs to
            be where someone who has just looked through the album can
            reach it, not buried in the hero they scrolled past. */}
        <div className="mx-auto mb-8 max-w-350 px-5 md:mb-10 md:px-8 lg:px-12">
          <div className="flex items-center justify-between border-y border-black/8 py-3">
            <span className="font-heading text-[11px] font-medium uppercase tracking-[0.24em] text-black/45">
              {album.media.length} {album.media.length === 1 ? 'item' : 'items'}
            </span>
            <Engagement kind="album" entityId={album.id} countView />
          </div>
        </div>

        <MediaGrid media={album.media} albumTitle={album.title} />
      </section>
      <CtaFooter />
    </>
  );
}

function AlbumHero({
  album,
  photos,
  videos,
}: {
  readonly album: Album;
  readonly photos: number;
  readonly videos: number;
}) {
  return (
    <section
      data-nav-dark
      className="relative isolate flex min-h-[60svh] w-full items-end overflow-hidden bg-black pb-16 pt-32 text-white md:pt-40"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-20 overflow-hidden">
        <Image
          src={album.cover}
          alt=""
          fill
          priority
          quality={45}
          sizes="100vw"
          className="object-cover opacity-45"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.9) 100%)',
          }}
        />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(50% 60% at 50% 40%, color-mix(in srgb, var(--color-primary) 16%, transparent) 0%, transparent 65%)',
        }}
      />

      <div className="relative mx-auto w-full max-w-350 px-5 md:px-8 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="mb-8 text-[11px] uppercase tracking-[0.28em] text-white/60"
        >
          <Link
            href="/gallery"
            className="inline-flex items-center gap-2 transition-colors hover:text-white"
          >
            <span aria-hidden>←</span> Back to the archive
          </Link>
        </motion.div>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.6 }}
          variants={fadeUp}
          className="font-heading text-[11px] font-medium uppercase text-primary md:text-xs"
          style={{ letterSpacing: '0.4em' }}
        >
          {album.category} · {album.date}
        </motion.p>

        <motion.h1
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={revealParent}
          className="mt-6 font-heading font-thin leading-[1.05] text-white"
          style={{
            fontSize: 'clamp(2.25rem, 5.4vw, 5rem)',
            letterSpacing: '-0.02em',
          }}
        >
          <span className="block overflow-hidden pb-1 md:pb-2">
            <motion.span variants={revealLine} className="block">
              {album.title}
            </motion.span>
          </span>
        </motion.h1>

        {album.linkedEventSlug && (
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={fadeUp}
            custom={3}
            className="mt-6"
          >
            <Link
              href={`/events/${album.linkedEventSlug}`}
              className="inline-flex items-center gap-2 rounded-xs border border-white/25 bg-white/5 px-4 py-2 text-[12.5px] font-medium tracking-wide text-white transition-colors hover:border-primary hover:bg-primary"
            >
              View the event
              <span aria-hidden>→</span>
            </Link>
          </motion.div>
        )}

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.5 }}
          variants={fadeUp}
          custom={4}
          className="mt-6 grid gap-6 md:grid-cols-12 md:items-end md:gap-10"
        >
          <p className="max-w-xl text-[15px] leading-[1.75] text-white/75 md:col-span-7 md:text-base">
            {album.description}
          </p>
          <div className="flex flex-wrap items-start gap-x-8 gap-y-4 md:col-span-5 md:justify-end">
            <div className="flex flex-col">
              <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/50">
                Photos
              </p>
              <p
                className="mt-1 font-heading font-thin leading-none tabular-nums text-white"
                style={{ fontSize: 'clamp(1.5rem, 2.6vw, 2.25rem)' }}
              >
                {photos}
              </p>
            </div>
            <div className="flex flex-col">
              <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/50">
                Videos
              </p>
              <p
                className="mt-1 font-heading font-thin leading-none tabular-nums text-white"
                style={{ fontSize: 'clamp(1.5rem, 2.6vw, 2.25rem)' }}
              >
                {videos}
              </p>
            </div>
            <div className="flex min-w-40 flex-col">
              <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/50">
                Location
              </p>
              <p className="mt-2 font-heading text-sm font-light leading-tight text-white md:text-base">
                {album.location}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function CtaFooter() {
  return (
    <section className="relative bg-white py-14 md:py-20">
      <div className="mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <div className="flex flex-col items-start justify-between gap-6 rounded-xs border border-black/10 bg-white p-6 md:flex-row md:items-center md:p-8">
          <div>
            <p className="font-heading text-[11px] font-medium uppercase tracking-[0.28em] text-primary">
              Have more from this event?
            </p>
            <p className="mt-2 max-w-xl text-[14.5px] leading-[1.7] text-black/70">
              Send your photos and videos to the Communications Secretariat. We credit every
              contributor.
            </p>
          </div>
          <Link
            href="/contact"
            className="group inline-flex items-center gap-3 rounded-xs bg-black px-6 py-3.5 text-sm font-medium tracking-wide text-white transition-all duration-500 hover:-translate-y-0.5 hover:bg-primary"
          >
            Contribute
            <span
              aria-hidden
              className="grid h-6 w-6 place-items-center rounded-xs bg-white/15 transition-transform group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
