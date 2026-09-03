'use client';

import Image from 'next/image';
import { motion, type Variants } from 'framer-motion';
import { useState } from 'react';

import { downloadUrl } from './download';
import { Lightbox } from './lightbox';
import type { MediaItem } from './gallery-content';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay: (i % 12) * 0.04, ease },
  }),
};

interface MediaGridProps {
  readonly media: readonly MediaItem[];
  readonly albumTitle: string;
}

/**
 * A masonry grid of album media using CSS `column-count`.
 *
 * Performance:
 *  - Every thumbnail is a Next.js `<Image>` with `quality={45}`, good
 *    enough for a browse view, tiny bytes over the wire.
 *  - The first 6 items get `loading="eager"` (browser hint) so the top
 *    of the grid paints immediately; the rest are default `loading="lazy"`.
 *  - `sizes` is set so the browser picks the smallest variant that
 *    matches the column width at each breakpoint.
 *  - Videos are represented by their poster still (not the video file);
 *    the actual video only loads once opened in the lightbox.
 */
export function MediaGrid({ media, albumTitle }: MediaGridProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <>
      <div
        className="mx-auto max-w-350 columns-2 gap-3 px-5 md:columns-3 md:gap-4 md:px-8 lg:columns-4 lg:px-12"
        style={{ columnFill: 'balance' }}
      >
        {media.map((m, i) => (
          <motion.div
            key={m.id}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
            variants={item}
            custom={i}
            className="mb-3 break-inside-avoid md:mb-4"
            style={{
              aspectRatio: m.aspect.replace('/', ' / '),
            }}
          >
            <MediaTile
              item={m}
              onOpen={() => setLightboxIndex(i)}
              priority={i < 4}
              eager={i < 6}
              albumTitle={albumTitle}
            />
          </motion.div>
        ))}
      </div>

      <Lightbox
        items={media}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
        albumTitle={albumTitle}
      />
    </>
  );
}

function MediaTile({
  item,
  onOpen,
  priority,
  eager,
  albumTitle,
}: {
  readonly item: MediaItem;
  readonly onOpen: () => void;
  readonly priority: boolean;
  readonly eager: boolean;
  readonly albumTitle: string;
}) {
  const src = item.type === 'photo' ? item.src : (item.poster ?? item.src);

  const download = (e: React.MouseEvent) => {
    e.stopPropagation();
    downloadUrl(item.src, `${albumTitle}-${item.id}`);
  };

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${item.alt}`}
      className="group relative block h-full w-full overflow-hidden rounded-xs bg-black/5"
    >
      <Image
        src={src}
        alt={item.alt}
        fill
        priority={priority}
        loading={eager ? 'eager' : 'lazy'}
        sizes="(min-width: 1024px) 22vw, (min-width: 768px) 30vw, 45vw"
        quality={45}
        className="object-cover transition-transform duration-700 group-hover:scale-105"
      />

      {/* Type badge */}
      {item.type === 'video' && (
        <span aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-transform group-hover:scale-110">
            <PlayGlyph />
          </span>
        </span>
      )}

      {/* Hover chrome */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/25"
      />

      {/* Quick download */}
      <span
        role="button"
        tabIndex={-1}
        onClick={download}
        aria-label="Download this item"
        className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-xs bg-white/95 text-black opacity-0 shadow-sm transition-all duration-300 hover:bg-primary hover:text-white group-hover:opacity-100"
      >
        <DownloadIcon />
      </span>
    </button>
  );
}

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
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

function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 translate-x-0.5" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7L8 5z" />
    </svg>
  );
}
