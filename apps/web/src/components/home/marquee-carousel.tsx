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
}: MarqueeCarouselProps<T>) {
  const doubled = useMemo(() => [...items, ...items], [items]);

  return (
    <div
      className="marquee-viewport relative w-full overflow-hidden"
      style={{
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)',
        maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)',
      }}
      aria-label={ariaLabel}
      role="region"
    >
      <ul
        className="marquee-track flex w-max gap-5 md:gap-6"
        style={{ ['--marquee-duration' as string]: `${duration}s` }}
      >
        {doubled.map((item, i) => (
          <li key={i} className="shrink-0" aria-hidden={i >= items.length}>
            {renderItem(item, i % items.length)}
          </li>
        ))}
      </ul>
    </div>
  );
}
