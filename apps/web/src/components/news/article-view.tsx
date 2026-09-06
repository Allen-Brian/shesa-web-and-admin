'use client';

import Image from 'next/image';
import Link from 'next/link';

import { Engagement } from '@/components/ui/engagement';

import { isLocalSupabaseUrl } from '../leadership/is-local-supabase-url';
import { AuthorAvatar } from './author-avatar';
import type { Article } from './news-content';

/**
 * Right-panel article body. Author strip, headline, banner, and the
 * rich content rendered from the stored HTML (trusted, every author
 * of a `cms.articles` row holds `cms.edit` at Mainstream, so the
 * content is not user-generated in the untrusted sense).
 */
export function ArticleView({ article }: { readonly article: Article }) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-black/10 pb-5">
        <div className="flex items-center gap-3">
          <AuthorAvatar article={article} />
          <div className="flex items-baseline gap-2 font-heading text-[13.5px] leading-none">
            <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-black/45">
              By
            </span>
            <span className="font-medium text-black">{article.author.name}</span>
            <span className="font-light text-black/45">· {article.relativeDate}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {article.categories.map((tag) => (
            <span
              key={tag}
              className="rounded-xs border border-black/12 px-2 py-1 font-heading text-[10px] font-medium uppercase leading-none tracking-[0.16em] text-black/55"
            >
              {tag}
            </span>
          ))}
          <Link
            href={`/news?id=${article.id}`}
            scroll={false}
            className="ml-1 font-heading text-[10px] font-medium uppercase leading-none tracking-[0.16em] text-primary hover:underline"
          >
            Permalink
          </Link>
        </div>
      </div>

      <h2
        className="mt-8 font-heading font-thin leading-[1.05] text-black"
        style={{
          fontSize: 'clamp(1.85rem, 3.6vw, 3rem)',
          letterSpacing: '-0.015em',
        }}
      >
        {article.title}
      </h2>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {article.categories[0] && (
          <p className="font-heading text-[11px] font-medium uppercase tracking-[0.24em] text-primary">
            {article.categories[0]} · {article.displayDate}
          </p>
        )}
        {/* Counts the view: this component renders only when an article
            is actually open, not on the listing. */}
        <Engagement kind="article" entityId={article.id} countView />
      </div>

      {article.bannerUrl && (
        <div className="relative mt-8 aspect-video w-full overflow-hidden rounded-xs">
          <Image
            src={article.bannerUrl}
            alt={article.title}
            fill
            priority
            sizes="(min-width: 768px) 66vw, 100vw"
            quality={75}
            unoptimized={isLocalSupabaseUrl(article.bannerUrl)}
            className="object-cover object-top"
          />
        </div>
      )}

      <div
        className="news-article-body mt-10 max-w-3xl text-[16px] leading-[1.85] text-black/80"
        dangerouslySetInnerHTML={{ __html: article.contentHtml }}
      />
    </div>
  );
}
