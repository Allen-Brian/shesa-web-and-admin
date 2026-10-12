'use client';

import Image from 'next/image';

import { isLocalSupabaseUrl } from '../leadership/is-local-supabase-url';
import type { Article } from './news-content';
import { MetricsBadge } from '@/components/ui/metrics-badge';

interface Props {
  readonly article: Article;
  readonly active: boolean;
  readonly onSelect: () => void;
}

/**
 * One row in the reader's left panel: 80-px thumbnail + title +
 * author + category tags. Active row gets a subtle red tint so the
 * currently-open article stands out against the list.
 */
export function ArticlePreview({ article, active, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active}
      className={`group grid w-full grid-cols-[80px_1fr] gap-4 rounded-xs px-2 py-5 text-left transition-colors ${
        active ? 'bg-primary/5 text-black' : 'text-black/85 hover:bg-primary/3'
      }`}
    >
      <div className="relative aspect-square overflow-hidden rounded-xs">
        {article.bannerUrl && (
          <Image
            src={article.bannerUrl}
            alt=""
            fill
            sizes="80px"
            quality={75}
            unoptimized={isLocalSupabaseUrl(article.bannerUrl)}
            className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
          />
        )}
        {active && <span aria-hidden className="absolute inset-0 border-2 border-primary" />}
      </div>

      <div className="min-w-0">
        <p className="font-heading text-[10px] font-medium uppercase tracking-[0.24em] text-black/45">
          {article.relativeDate}
        </p>
        <h3
          className={`mt-1.5 font-heading font-light leading-snug transition-colors ${
            active ? 'text-primary' : 'text-black group-hover:text-primary'
          }`}
          style={{ fontSize: '14.5px', letterSpacing: '-0.005em' }}
        >
          {article.title}
        </h3>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="font-heading text-[11.5px] font-medium text-primary">
            {article.author.name}
          </p>
          <MetricsBadge entityId={article.id} />
        </div>
        {article.categories.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {article.categories.map((tag) => (
              <span
                key={tag}
                className="rounded-xs border border-black/12 px-2 py-0.5 font-heading text-[9.5px] font-medium uppercase tracking-[0.14em] text-black/55"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
