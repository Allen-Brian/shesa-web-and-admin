import Link from 'next/link';
import { ArrowRight, Star } from 'lucide-react';

import { GradientPanel } from '@shesa/ui';

import { ArticleStatusBadge } from './article-status-badge';
import type { RecentArticle } from './dashboard-types';
import { EmptyInline } from '@/components/dashboard/empty-inline';

/**
 * Panel of the latest touched articles across every status. Sorted by
 * `updated_at` desc so drafts the operator was editing yesterday
 * surface at the top. Featured entries get a filled star badge so the
 * hero-carousel slot is visible without a dedicated tab.
 */
export function EditorRecentArticles({
  articles,
}: {
  readonly articles: readonly RecentArticle[];
}) {
  return (
    <GradientPanel className="flex flex-col gap-3 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">Recent articles</span>
        <Link
          href="/editor/news"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          View all
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {articles.length === 0 ? (
        <EmptyInline label="No articles yet. Write the first one to seed the public News page." />
      ) : (
        <ul className="flex flex-col divide-y divide-border/50">
          {articles.map((a) => (
            <li key={a.id} className="py-2.5 first:pt-0 last:pb-0">
              <Link
                href={`/editor/news/${a.id}`}
                className="flex items-center justify-between gap-3 group"
              >
                <div className="flex min-w-0 flex-col leading-tight">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-foreground group-hover:text-primary">
                      {a.title}
                    </span>
                    {a.isFeatured && (
                      <Star className="h-3 w-3 shrink-0 fill-amber-500 text-amber-500" />
                    )}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    Updated {new Date(a.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <ArticleStatusBadge status={a.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </GradientPanel>
  );
}
