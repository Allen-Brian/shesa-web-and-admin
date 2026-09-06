'use client';

import { Eye, Heart } from 'lucide-react';
import { useEffect, useState } from 'react';

import { fetchMetrics, recordView, toggleLike, type ContentKind } from '@/lib/content-metrics';

/** 1 → "1", 1200 → "1.2k". Counts are glanced at, not audited. */
function compact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '')}k`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`;
}

interface Props {
  readonly kind: ContentKind;
  readonly entityId: string;
  /** Count a view on mount. Set on detail pages, not on cards. */
  readonly countView?: boolean;
  /** Compact rendering for cards; the default suits a detail page. */
  readonly size?: 'sm' | 'md';
  readonly className?: string;
}

/**
 * Views and a like button for one piece of content.
 *
 * Counts are fetched on the client rather than rendered on the server:
 * the pages they sit on are cached or statically composed, and a number
 * that changes on every visit has no business invalidating them. The
 * cost is that the figures appear a moment after the page does, which is
 * why they render as dashes rather than zeros until they arrive — a zero
 * that turns into 47 reads as a bug.
 */
export function Engagement({ kind, entityId, countView = false, size = 'md', className }: Props) {
  const [views, setViews] = useState<number | null>(null);
  const [likes, setLikes] = useState<number | null>(null);
  const [liked, setLiked] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      if (countView) await recordView(kind, entityId);

      const [metrics] = await fetchMetrics(kind, [entityId]);
      if (!alive || !metrics) return;
      setViews(metrics.views);
      setLikes(metrics.likes);
      setLiked(metrics.liked);
    })();

    return () => {
      alive = false;
    };
  }, [kind, entityId, countView]);

  const onLike = async () => {
    if (pending) return;
    setPending(true);

    // Optimistic: the button answers the tap immediately and corrects
    // itself from the server's count a moment later.
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikes((n) => (n === null ? n : Math.max(0, n + (wasLiked ? -1 : 1))));

    const result = await toggleLike(kind, entityId);
    if (result) {
      setLiked(result.liked);
      setLikes(result.likes);
    } else {
      setLiked(wasLiked);
      setLikes((n) => (n === null ? n : Math.max(0, n + (wasLiked ? 1 : -1))));
    }
    setPending(false);
  };

  const text = size === 'sm' ? 'text-[11.5px]' : 'text-[13px]';
  const icon = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <div className={`flex items-center gap-4 ${text} ${className ?? ''}`}>
      <span className="inline-flex items-center gap-1.5 text-black/50" title="Views">
        <Eye className={`${icon} shrink-0`} aria-hidden />
        <span className="tabular-nums">{views === null ? '—' : compact(views)}</span>
        <span className="sr-only">views</span>
      </span>

      <button
        type="button"
        onClick={onLike}
        aria-pressed={liked}
        aria-label={liked ? 'Remove like' : 'Like'}
        className={`inline-flex items-center gap-1.5 rounded-xs transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
          liked ? 'text-primary' : 'text-black/50 hover:text-primary'
        }`}
      >
        <Heart
          className={`${icon} shrink-0 transition-transform duration-300 ${
            liked ? 'scale-110 fill-current' : ''
          }`}
          aria-hidden
        />
        <span className="tabular-nums">{likes === null ? '—' : compact(likes)}</span>
      </button>
    </div>
  );
}
