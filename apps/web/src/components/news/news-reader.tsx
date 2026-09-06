'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { Newspaper } from 'lucide-react';

import { EmptyState } from '@/components/ui/empty-state';

import { MetricsProvider } from '@/components/ui/metrics-badge';

import { ArticlePreview } from './article-preview';
import { ArticleView } from './article-view';
import type { Article } from './news-content';
import { Pagination } from './pagination';

const ease = [0.22, 1, 0.36, 1] as [number, number, number, number];

interface Props {
  /** All published articles, newest first. */
  readonly articles: readonly Article[];
  /** Optional URL-driven selected article id (`/news?id=…`). */
  readonly initialSelectedId?: string | null;
  /** Optional URL-driven page (`/news?page=…`), 1-indexed. */
  readonly initialPage?: number;
  /** Page size for the left list. */
  readonly pageSize?: number;
}

/**
 * News reader, single paginated list on the left, the currently
 * selected article on the right. No Latest/Popular tabs; every article
 * is just "news". The Featured carousel above uses `?id=…` to feed
 * into the selection here, so clicking a featured card behaves the
 * same as clicking a list row.
 */
export function NewsReader({
  articles,
  initialSelectedId = null,
  initialPage = 1,
  pageSize = 8,
}: Props) {
  const [selectedId, setSelectedId] = useState<string>(initialSelectedId ?? articles[0]?.id ?? '');
  const [page, setPage] = useState<number>(Math.max(1, initialPage));

  const totalPages = Math.max(1, Math.ceil(articles.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const start = (clampedPage - 1) * pageSize;
  const pageItems = useMemo(
    () => articles.slice(start, start + pageSize),
    [articles, start, pageSize],
  );

  const selected = useMemo(
    () => articles.find((a) => a.id === selectedId) ?? articles[0],
    [articles, selectedId],
  );

  if (!selected) {
    return (
      <section className="relative bg-white pb-24 md:pb-32">
        <div className="mx-auto max-w-3xl px-5 md:px-8 lg:px-12">
          <EmptyState
            icon={Newspaper}
            heading="No news yet"
            body="Dispatches, briefs, and community milestones will land here as they're published."
            cta={{ label: 'Back to home', href: '/' }}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="relative bg-white pb-24 md:pb-32">
      <div className="mx-auto max-w-350 px-5 md:px-8 lg:px-12">
        <div className="grid gap-10 md:grid-cols-12 md:gap-12 lg:gap-16">
          <aside className="md:col-span-4">
            <p className="border-b border-black/10 pb-3 font-heading text-[13px] font-medium uppercase tracking-[0.28em] text-primary">
              Latest
            </p>

            <MetricsProvider kind="article" ids={pageItems.map((a) => a.id)}>
              <ul className="flex flex-col divide-y divide-black/8">
                {pageItems.map((article) => (
                  <li key={article.id}>
                    <ArticlePreview
                      article={article}
                      active={article.id === selectedId}
                      onSelect={() => setSelectedId(article.id)}
                    />
                  </li>
                ))}
              </ul>
            </MetricsProvider>

            {totalPages > 1 && (
              <Pagination page={clampedPage} totalPages={totalPages} onPage={setPage} />
            )}
          </aside>

          <div className="md:col-span-8">
            <AnimatePresence mode="wait">
              <motion.article
                key={selected.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.45, ease }}
              >
                <ArticleView article={selected} />
              </motion.article>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
