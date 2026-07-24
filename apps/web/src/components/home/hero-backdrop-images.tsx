'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

const HERO_IMAGES = [
  '/hero_one.jpg',
  '/hero_two.jpg',
  '/hero_three.jpg',
  '/hero_four.jpg',
  '/hero_five.jpg',
] as const;

const ROTATION_MS = 7000;
const CROSSFADE_S = 1.6;
const VISIBLE_OPACITY = 0.1;

/**
 * Ken-Burns-lite backdrop carousel for the hero.
 *
 * Loading strategy:
 *   - Next `Image` handles WebP/AVIF conversion + responsive sizing, so
 *     the 1MB source JPGs ship as ~200kb tuned to viewport width.
 *   - Only the first image is `priority` (LCP-friendly); the rest lazy-
 *     load naturally in the background before the rotation reaches them.
 *   - `quality={45}`, safe because the visible layer sits at ~22%
 *     opacity under a dark gradient. Compression is invisible.
 *
 * Motion:
 *   - Cross-fade every 7s. Paused when the tab is hidden (Page
 *     Visibility API) so mobile users don't burn battery/data
 *     rotating a backdrop they can't see.
 *   - Respects `prefers-reduced-motion`, sticks on the first image.
 */
export function HeroBackdropImages() {
  const reduce = useReducedMotion();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (reduce) return;

    let paused = typeof document !== 'undefined' && document.visibilityState === 'hidden';
    const onVis = () => {
      paused = document.visibilityState === 'hidden';
    };
    document.addEventListener('visibilitychange', onVis);

    const timer = setInterval(() => {
      if (paused) return;
      setIdx((i) => (i + 1) % HERO_IMAGES.length);
    }, ROTATION_MS);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [reduce]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-20 overflow-hidden">
      {HERO_IMAGES.map((src, i) => (
        <motion.div
          key={src}
          initial={false}
          animate={{
            opacity: i === idx ? VISIBLE_OPACITY : 0,
            scale: i === idx ? 1.06 : 1.0,
          }}
          transition={{
            opacity: { duration: CROSSFADE_S, ease: 'easeInOut' },
            scale: { duration: ROTATION_MS / 1000 + CROSSFADE_S, ease: 'linear' },
          }}
          className="absolute inset-0"
        >
          <Image
            src={src}
            alt=""
            fill
            priority={i === 0}
            quality={45}
            sizes="100vw"
            className="object-cover"
          />
        </motion.div>
      ))}

      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.85) 100%)',
        }}
      />
    </div>
  );
}
