import 'server-only';

import { getServerClient } from '@/lib/supabase-server';

/**
 * View and like counts for editor list views.
 *
 * The public site writes these through SECURITY DEFINER functions; the
 * admin only reads them, so a plain select is enough — `content_metrics`
 * grants SELECT to authenticated and its RLS policy is `USING (true)`.
 *
 * Items nobody has opened have no row at all, which is why every lookup
 * falls back to zero rather than treating a miss as an error.
 */

export type ContentKind = 'article' | 'event' | 'album' | 'song';

export interface Metrics {
  readonly views: number;
  readonly likes: number;
}

export const NO_METRICS: Metrics = { views: 0, likes: 0 };

/** Counts for one kind, keyed by entity id. Empty on any failure. */
export async function loadContentMetrics(kind: ContentKind): Promise<Map<string, Metrics>> {
  const supabase = await getServerClient();

  // `as never` on the relation and the filter: `content_metrics` is newer
  // than the checked-in generated types. Regenerating them after the
  // migration is applied removes the need for both casts.
  const { data, error } = await supabase
    .schema('cms')
    .from('content_metrics' as never)
    .select('entity_id, views, likes')
    .eq('kind' as never, kind as never);

  if (error) {
    // A missing counter must never take a list view down with it.
    console.error(
      JSON.stringify({
        level: 'error',
        component: 'admin.contentMetrics',
        message: 'content_metrics query failed',
        kind,
        error: error.message,
      }),
    );
    return new Map();
  }

  const rows = (data ?? []) as unknown as ReadonlyArray<{
    entity_id: string;
    views: number | string;
    likes: number | string;
  }>;

  return new Map(
    rows.map((r) => [r.entity_id, { views: Number(r.views), likes: Number(r.likes) }]),
  );
}

export { compactCount } from './compact-count';
