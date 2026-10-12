import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Newspaper } from 'lucide-react';

import { loadEditorNews } from '../../load-news';
import { ArticleForm } from '../../widgets/article-form';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Editor — Edit article' };

interface Params {
  readonly params: Promise<{ id: string }>;
}

/** Edit-article page for the Editor persona. */
export default async function EditArticlePage({ params }: Params) {
  const { id } = await params;
  const { articles, categories } = await loadEditorNews();
  const article = articles.find((a) => a.id === id);
  if (!article) notFound();

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
          Edit article
        </h1>
        <p className="text-xs text-muted-foreground">{article.title}</p>
      </div>

      <ArticleForm categories={categories} editing={article} />
    </section>
  );
}
