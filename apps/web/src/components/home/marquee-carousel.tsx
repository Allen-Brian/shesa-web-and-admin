'use client';

import { useMemo, type ReactNode } from 'react';

interface MarqueeCarouselProps<T> {
  readonly items: readonly T[];
  readonly renderItem: (item: T, index: number) => ReactNode;
  /**
   * Seconds for one full loop (higher = slower). Defaults to 45.
   */
  readonly duration?: number;
  readonly ariaLabel?: string;
  /** Travel right instead of left. */
  readonly reverse?: boolean;
  /** Override the edge fade, e.g. to remove it entirely. */
  readonly maskImage?: string;
  /** Extra classes on the track, e.g. tighter gaps. */
  readonly trackClassName?: string;
}

/**
 * Horizontal auto-scrolling marquee. Content is duplicated once so the
 * CSS `-50%` translate loops seamlessly. Pauses on hover / focus-within
 * and respects `prefers-reduced-motion`, handled in globals.css.
 *
 * The viewport uses a symmetrical mask so items fade in on the left and
 * out on the right (no hard edge).
 */
export function MarqueeCarousel<T>({
  items,
  renderItem,
  duration = 45,
  ariaLabel,
  reverse = false,
  maskImage = 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)',
  trackClassName = 'gap-5 md:gap-6',
}: MarqueeCarouselProps<T>) {
  /**
   * The track translates by -50%, so it loops seamlessly only when the
   * two halves are identical AND one half is wider than the viewport —
   * otherwise the tail of the list clears the screen before the loop
   * restarts and leaves a gap. A short list (the partner boards are
   * four) is therefore repeated until each half carries at least eight
   * items. Lists of eight or more are untouched, still one copy per
   * half, exactly as before.
   */
  const track = useMemo(() => {
    if (items.length === 0) return [];
    const perHalf = Math.max(1, Math.ceil(8 / items.length));
    return Array.from({ length: perHalf * 2 }, () => items).flat();
  }, [items]);

  return (
    <div
      className="marquee-viewport relative w-full overflow-hidden"
      style={{ WebkitMaskImage: maskImage, maskImage }}
      aria-label={ariaLabel}
      role="region"
    >
      <ul
        className={`marquee-track flex w-max ${reverse ? 'marquee-track-reverse' : ''} ${trackClassName}`}
        style={{ ['--marquee-duration' as string]: `${duration}s` }}
      >
        {/* `flex` on each item lets a card stretch to the tallest in the
            row; without it every card sizes to its own content and the run
            of tops and bottoms is ragged. */}
        {track.map((item, i) => (
          <li key={i} className="flex shrink-0" aria-hidden={i >= items.length}>
            {renderItem(item, i % items.length)}
          </li>
        ))}
      </ul>
    </div>
  );
}
