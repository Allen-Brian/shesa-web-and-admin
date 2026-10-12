'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface Props {
  readonly progress: number; // 0..1
  readonly isPlaying: boolean;
  readonly onSeek: (pct: number) => void;
}

const BAR_COUNT = 56;

/**
 * The animated waveform strip that lives inside the docked player.
 *
 * Design tricks:
 *  - Each bar has a deterministic pseudo-random baseline height so the
 *    "waveform" looks like a real audio shape (not a plain rectangle).
 *  - When playing, every bar animates its scaleY between the baseline
 *    and a boosted peak; when paused, bars settle to baseline.
 *  - The played portion (bars left of `progress`) is coloured primary,
 *    the un-played portion is a subtle black/20.
 *  - Clicking anywhere on the strip seeks, the ratio of click-X to
 *    strip-width becomes the new progress.
 */
export function PlayerWaveform({ progress, isPlaying, onSeek }: Props) {
  const bars = useMemo(
    () =>
      Array.from({ length: BAR_COUNT }, (_, i) => {
        // Deterministic pseudo-random baseline in [0.28, 0.9].
        const seed = ((i * 9301 + 49297) % 233280) / 233280;
        const baseline = 0.28 + seed * 0.62;
        return { seed, baseline };
      }),
    [],
  );

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    onSeek((e.clientX - rect.left) / rect.width);
  };

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') onSeek(Math.max(0, progress - 0.05));
        if (e.key === 'ArrowRight') onSeek(Math.min(1, progress + 0.05));
      }}
      className="relative flex h-12 w-full cursor-pointer items-center gap-[3px] px-2 focus:outline-none"
      style={{ contain: 'layout paint' }}
    >
      {bars.map((b, i) => {
        const played = i / BAR_COUNT <= progress;
        return (
          <motion.span
            key={i}
            aria-hidden
            className="block flex-1 origin-center rounded-full transition-colors duration-300"
            style={{
              backgroundColor: played
                ? 'var(--color-primary)'
                : 'color-mix(in srgb, var(--color-primary) 12%, white)',
              height: '100%',
            }}
            animate={{
              scaleY: isPlaying
                ? [
                    b.baseline,
                    b.baseline + 0.1 + b.seed * 0.35,
                    b.baseline,
                    b.baseline - 0.05,
                    b.baseline,
                  ]
                : b.baseline,
            }}
            transition={{
              duration: isPlaying ? 1.6 + b.seed * 0.9 : 0.4,
              repeat: isPlaying ? Infinity : 0,
              ease: 'easeInOut',
              delay: isPlaying ? b.seed * 0.5 : 0,
            }}
          />
        );
      })}
    </div>
  );
}
