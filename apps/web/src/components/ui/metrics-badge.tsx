'use client';

import { Eye, Heart } from 'lucide-react';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { fetchMetrics, type ContentKind } from '@/lib/content-metrics';

/** 1 → "1", 1200 → "1.2k". Shared with the interactive Engagement. */
function compact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '')}k`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`;
}

interface Counts {
  readonly views: number;
  readonly likes: number;
}

const MetricsContext = createContext<ReadonlyMap<string, Counts> | null>(null);

/**
 * Fetches counts for a whole list in one call and hands them to the
 * cards below.
 *
 * Without this each card would fetch its own, which on a listing page of
 * twenty events is twenty requests for two numbers apiece. The provider
 * is a client component wrapping a grid; cards read from context.
 */
export function MetricsProvider({
  kind,
  ids,
  children,
}: {
  readonly kind: ContentKind;
  readonly ids: readonly string[];
  readonly children: ReactNode;
}) {
  const [counts, setCounts] = useState<ReadonlyMap<string, Counts> | null>(null);

  // Joined so the effect re-runs when the set genuinely changes, not on
  // every render that rebuilds the array.
  const key = useMemo(() => ids.join(','), [ids]);

  useEffect(() => {
    let alive = true;
    const list = key ? key.split(',') : [];
    if (list.length === 0) {
      setCounts(new Map());
      return;
    }

    (async () => {
      const rows = await fetchMetrics(kind, list);
      if (!alive) return;
      setCounts(new Map(rows.map((r) => [r.entityId, { views: r.views, likes: r.likes }])));
    })();

    return () => {
      alive = false;
    };
  }, [kind, key]);

  return <MetricsContext.Provider value={counts}>{children}</MetricsContext.Provider>;
}

/**
 * Read-only views and likes for a card.
 *
 * No button: a card is a link, and a like inside it would be a control
 * inside a control. Liking happens on the page the card opens.
 *
 * Renders nothing until the counts arrive, rather than flashing zeros
 * that jump to real numbers a moment later.
 */
export function MetricsBadge({
  entityId,
  className,
  tone = 'dark',
}: {
  readonly entityId: string;
  readonly className?: string;
  /** `dark` for text on a light card; `light` for text over an image. */
  readonly tone?: 'dark' | 'light';
}) {
  const counts = useContext(MetricsContext);
  const mine = counts?.get(entityId);

  if (!mine) return null;

  const colour = tone === 'light' ? 'text-white/85' : 'text-black/45';

  return (
    <span
      className={`inline-flex items-center gap-3 text-[11.5px] tabular-nums ${colour} ${className ?? ''}`}
    >
      <span className="inline-flex items-center gap-1.5">
        <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {compact(mine.views)}
        <span className="sr-only">views</span>
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Heart className="h-3.5 w-3.5 shrink-0" aria-hidden />
        {compact(mine.likes)}
        <span className="sr-only">likes</span>
      </span>
    </span>
  );
}
