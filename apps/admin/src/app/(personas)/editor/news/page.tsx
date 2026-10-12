import { Newspaper } from 'lucide-react';

import { loadEditorNews } from './load-news';
import { NewsListView } from './widgets/news-list-view';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Editor — News' };

/** News list page for the Editor persona. */
export default async function EditorNewsPage() {
  const { articles, categories } = await loadEditorNews();

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <header className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Content
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <Newspaper className="h-6 w-6" />
          News
        </h1>
        <p className="text-sm text-muted-foreground">
          Every article shown on the public News page. Featured articles surface in the hero
          carousel; drafts + scheduled entries stay hidden until they publish.
        </p>
      </header>

      <NewsListView articles={articles} categories={categories} />
    </section>
  );
}
