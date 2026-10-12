'use client';

import { Eye, Heart, Play } from 'lucide-react';
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
  /**
   * `sm` for cards, `md` for a line of metadata, `lg` for a detail page
   * where these sit in the row of primary controls and have to hold their
   * own against them.
   */
  readonly size?: 'sm' | 'md' | 'lg';
  /**
   * Show the play count alongside views. Songs only — nothing else has
   * one, and the number would read as zero rather than as absent.
   */
  readonly showPlays?: boolean;
  readonly className?: string;
}

/**
 * Views, plays, and a like button for one piece of content.
 *
 * Counts are fetched on the client rather than rendered on the server:
 * the pages they sit on are cached or statically composed, and a number
 * that changes on every visit has no business invalidating them. The
 * cost is that the figures appear a moment after the page does, which is
 * why they render as dashes rather than zeros until they arrive — a zero
 * that turns into 47 reads as a bug.
 */
export function Engagement({
  kind,
  entityId,
  countView = false,
  size = 'md',
  showPlays = false,
  className,
}: Props) {
  const [views, setViews] = useState<number | null>(null);
  const [likes, setLikes] = useState<number | null>(null);
  const [plays, setPlays] = useState<number | null>(null);
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
      setPlays(metrics.plays);
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

  const large = size === 'lg';
  const text = size === 'sm' ? 'text-[11.5px]' : large ? 'text-sm' : 'text-[13px]';
  const icon = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  // At `lg` each metric becomes a control the same height as the Play and
  // Share buttons beside it. At the smaller sizes they are metadata and
  // stay quiet — the same numbers, given the weight of their surroundings.
  const chip = large
    ? 'gap-2.5 rounded-xs border border-black/15 px-5 py-4 font-medium tracking-wide'
    : 'gap-1.5 rounded-xs';
  const restText = large ? 'text-black/70' : 'text-black/50';

  return (
    <div className={`flex items-center ${large ? 'gap-3' : 'gap-4'} ${text} ${className ?? ''}`}>
      {showPlays && (
        <span className={`inline-flex items-center ${chip} ${restText}`} title="Plays">
          <Play className={`${icon} shrink-0 fill-current`} aria-hidden />
          <span className="tabular-nums">{plays === null ? '—' : compact(plays)}</span>
          {large ? (
            <span>{plays === 1 ? 'play' : 'plays'}</span>
          ) : (
            <span className="sr-only">plays</span>
          )}
        </span>
      )}

      <span className={`inline-flex items-center ${chip} ${restText}`} title="Views">
        <Eye className={`${icon} shrink-0`} aria-hidden />
        <span className="tabular-nums">{views === null ? '—' : compact(views)}</span>
        {large ? (
          <span>{views === 1 ? 'view' : 'views'}</span>
        ) : (
          <span className="sr-only">views</span>
        )}
      </span>

      <button
        type="button"
        onClick={onLike}
        aria-pressed={liked}
        aria-label={liked ? 'Remove like' : 'Like'}
        className={`inline-flex items-center ${chip} transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
          liked
            ? 'border-primary text-primary'
            : `${restText} hover:border-primary hover:text-primary`
        }`}
      >
        <Heart
          className={`${icon} shrink-0 transition-transform duration-300 ${
            liked ? 'scale-110 fill-current' : ''
          }`}
          aria-hidden
        />
        <span className="tabular-nums">{likes === null ? '—' : compact(likes)}</span>
        {large && <span>{liked ? 'Liked' : 'Like'}</span>}
      </button>
    </div>
  );
}
