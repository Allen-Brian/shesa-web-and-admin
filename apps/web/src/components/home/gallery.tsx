'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Images } from 'lucide-react';

import { EmptyState } from '@/components/ui/empty-state';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay: i * 0.1, ease },
  }),
};

type Album = {
  readonly id: string;
  readonly title: string;
  readonly date: string;
  readonly photos: number;
  readonly description: string;
  readonly cover: string;
  readonly slug: string;
};

interface GalleryProps {
  readonly albums: readonly Album[];
}

export function Gallery({ albums }: GalleryProps) {
  return (
    <section className="relative overflow-hidden bg-white py-20 text-black md:py-28">
      <div className="mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.6 }}
            variants={fadeUp}
            className="font-heading text-sm font-medium uppercase tracking-[0.28em] text-primary"
          >
            The Archive
          </motion.p>

          <motion.h2
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            variants={fadeUp}
            custom={1}
            className="mt-5 font-heading font-thin leading-[1.05] text-black"
            style={{
              fontSize: 'clamp(2rem, 4.6vw, 4rem)',
              letterSpacing: '-0.02em',
            }}
          >
            Show more. <span className="italic text-primary">Talk less.</span>
          </motion.h2>

          <motion.p
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={fadeUp}
            custom={2}
            className="mt-6 max-w-xl text-[15px] leading-[1.7] text-black/60 md:text-base"
          >
            An unfiltered archive of the moments, big, small, and every kind of unforgettable, that
            made us who we are. Reunions, ceremonies, camps, quiet Sundays. All of it.
          </motion.p>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.5 }}
            variants={fadeUp}
            custom={3}
            className="mt-8"
          >
            <Link
              href="/gallery"
              className="group inline-flex items-center gap-3 rounded-sm bg-black px-8 py-4 text-sm font-medium tracking-wide text-white transition-all duration-500 hover:-translate-y-0.5 hover:bg-primary hover:shadow-[0_18px_40px_-12px_rgba(139,21,51,0.35)]"
            >
              <span>Visit the gallery</span>
              <span
                aria-hidden
                className="grid h-6 w-6 place-items-center rounded-sm bg-white/15 transition-transform duration-500 group-hover:translate-x-1"
              >
                →
              </span>
            </Link>
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 1, delay: 0.4, ease }}
        className="mt-6 md:mt-10"
      >
        {albums.length === 0 ? (
          <div className="mx-auto max-w-3xl px-5 md:px-8">
            <EmptyState
              icon={Images}
              heading="No albums yet"
              body="Photos from reunions, ceremonies, and community drives will show up here as they're uploaded to the archive."
              cta={{ label: 'Visit the gallery', href: '/gallery' }}
            />
          </div>
        ) : (
          <>
            <AlbumFan albums={albums} />
            <MobileAlbumScroll albums={albums} />
          </>
        )}
      </motion.div>
    </section>
  );
}

const HALF_WINDOW = 3;
const AUTO_ADVANCE_MS = 4000;

function AlbumFan({ albums }: { readonly albums: readonly Album[] }) {
  const reduce = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduce || paused) return;
    const id = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % albums.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [reduce, paused, albums.length]);

  const visible = useMemo(() => {
    const list: { album: Album; offset: number }[] = [];
    for (let offset = -HALF_WINDOW; offset <= HALF_WINDOW; offset++) {
      const idx = (((activeIndex + offset) % albums.length) + albums.length) % albums.length;
      const album = albums[idx];
      if (album) list.push({ album, offset });
    }
    return list;
  }, [activeIndex, albums]);

  return (
    <div className="hidden md:block">
      <div
        className="relative mx-auto flex h-105 w-full items-center justify-center lg:h-120"
        style={{ perspective: '2000px' }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <AnimatePresence mode="popLayout">
          {visible.map(({ album, offset }) => (
            <AlbumStack3D key={album.slug} album={album} offset={offset} />
          ))}
        </AnimatePresence>
      </div>

      <CarouselControls
        count={albums.length}
        activeIndex={activeIndex}
        onSelect={setActiveIndex}
        paused={paused || Boolean(reduce)}
      />
    </div>
  );
}

function CarouselControls({
  count,
  activeIndex,
  onSelect,
  paused,
}: {
  readonly count: number;
  readonly activeIndex: number;
  readonly onSelect: (i: number) => void;
  readonly paused: boolean;
}) {
  return (
    <div className="mt-4 flex items-center justify-center gap-2">
      {Array.from({ length: count }).map((_, i) => {
        const active = i === activeIndex;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            aria-label={`Show album ${i + 1}`}
            aria-current={active}
            className={`group relative h-1 overflow-hidden rounded-full transition-all duration-500 ${
              active ? 'w-10 bg-black/10' : 'w-5 bg-black/15 hover:bg-black/30'
            }`}
          >
            {active && (
              <span
                aria-hidden
                key={activeIndex}
                className="absolute inset-y-0 left-0 block bg-primary"
                style={
                  paused
                    ? { width: '100%' }
                    : {
                        width: '100%',
                        animation: `carousel-progress ${AUTO_ADVANCE_MS}ms linear forwards`,
                      }
                }
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

// Bulge outward ("arch/hill"), center pops FORWARD and is largest, sides
// recede in Z and shrink slightly. Rotation is deliberately gentle so
// outer albums remain readable.
function positionFor(offset: number) {
  const abs = Math.abs(offset);
  const scale = abs === 0 ? 1.2 : abs === 1 ? 1.0 : abs === 2 ? 0.9 : 0.82;
  const translateZ = abs === 0 ? 80 : abs === 1 ? 0 : abs === 2 ? -60 : -130;
  const rotateY = -offset * 5;
  const translateX = offset * 200;
  const zIndex = 100 - abs * 10;
  return { scale, translateZ, rotateY, translateX, zIndex };
}

function AlbumStack3D({ album, offset }: { readonly album: Album; readonly offset: number }) {
  const { scale, translateZ, rotateY, translateX, zIndex } = positionFor(offset);

  return (
    <motion.div
      layout
      className="absolute"
      style={{
        left: 'calc(50% - 128px)',
        top: 'calc(50% - 160px)',
        transformStyle: 'preserve-3d',
        zIndex,
      }}
      initial={{ opacity: 0, x: translateX * 1.5, scale: 0.5 }}
      animate={{
        opacity: 1,
        x: translateX,
        z: translateZ,
        rotateY,
        scale,
      }}
      exit={{ opacity: 0, x: translateX * 1.5, scale: 0.5 }}
      transition={{ duration: 0.9, ease }}
    >
      <AlbumStack album={album} />
    </motion.div>
  );
}

function MobileAlbumScroll({ albums }: { readonly albums: readonly Album[] }) {
  return (
    <div
      className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-6 md:hidden"
      data-lenis-prevent-wheel
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {albums.map((album) => (
        <div key={album.slug} className="shrink-0 snap-center pt-4">
          <AlbumStack album={album} />
        </div>
      ))}
    </div>
  );
}

function AlbumStack({ album }: { readonly album: Album }) {
  return (
    <Link
      href={`/gallery/${album.slug}`}
      className="group relative block h-60 w-48 transition-transform duration-500 hover:-translate-y-2 md:h-80 md:w-64"
    >
      <div
        aria-hidden
        className="absolute inset-0 rounded-sm bg-white shadow-[0_10px_25px_-8px_rgba(0,0,0,0.35)]"
        style={{ transform: 'rotate(-2deg) translate(-5px, 3px)', opacity: 0.55 }}
      />
      <div
        aria-hidden
        className="absolute inset-0 rounded-sm bg-white shadow-[0_10px_25px_-8px_rgba(0,0,0,0.35)]"
        style={{ transform: 'rotate(1.5deg) translate(4px, 2px)', opacity: 0.75 }}
      />

      <div className="relative h-full w-full overflow-hidden rounded-sm shadow-[0_20px_50px_-15px_rgba(0,0,0,0.5)]">
        <Image
          src={album.cover}
          alt={album.title}
          fill
          sizes="225px"
          quality={75}
          className="object-cover transition-transform duration-1000 group-hover:scale-110"
        />

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/65"
        />

        <div className="absolute inset-x-0 bottom-0 p-5">
          <div className="translate-y-6 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
            <p className="font-heading text-[10px] font-medium uppercase tracking-[0.24em] text-white/70">
              {album.date}
            </p>
            <h3
              className="mt-1 font-heading font-light leading-tight text-white"
              style={{ fontSize: '1.05rem', letterSpacing: '-0.01em' }}
            >
              {album.title}
            </h3>
            <p className="mt-2 text-[12.5px] leading-normal text-white/80">{album.description}</p>
            <p className="mt-3 inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.24em] text-primary">
              {album.photos} photos
              <span aria-hidden>→</span>
            </p>
          </div>
        </div>

        <div className="absolute right-3 top-3 rounded-sm bg-black/50 px-2 py-1 font-heading text-[10px] font-medium uppercase tracking-[0.2em] text-white backdrop-blur-sm transition-opacity duration-500 group-hover:opacity-0">
          {album.photos} · Photos
        </div>
      </div>
    </Link>
  );
}
