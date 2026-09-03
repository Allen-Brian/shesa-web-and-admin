import Link from 'next/link';
import { ArrowLeft, Newspaper } from 'lucide-react';

import { loadEditorNews } from '../load-news';
import { ArticleForm } from '../widgets/article-form';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Editor — New article' };

/** Create-article page for the Editor persona. */
export default async function NewArticlePage() {
  const { categories } = await loadEditorNews();

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Link
          href="/editor/news"
          className="inline-flex w-fit items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to News
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <Newspaper className="h-6 w-6" />
          New article
        </h1>
      </div>

      <ArticleForm categories={categories} />
    </section>
  );
}
