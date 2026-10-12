import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BarChart3 } from 'lucide-react';

import { loadEditionBySlug, loadResults } from '../../load-voting';
import { ResultsView } from '../../widgets/results-view';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Editor — Results' };

export default async function ResultsPage({
  params,
}: {
  readonly params: Promise<{ edition: string }>;
}) {
  const { edition: slug } = await params;
  const edition = await loadEditionBySlug(slug);
  if (!edition) notFound();

  const { results, turnout } = await loadResults(edition.id);

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <header className="flex flex-col gap-2">
        <Link
          href={`/editor/voting/${edition.slug}`}
          className="w-fit text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary"
        >
          ← {edition.name}
        </Link>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <BarChart3 className="h-6 w-6" />
          Results
        </h1>
        <p className="text-sm text-muted-foreground">
          Sealed. Nothing on the public site shows a tally, and the function behind this page reads
          through your own permissions — there is no route by which an anonymous visitor could reach
          it.
        </p>
      </header>

      <ResultsView edition={edition} results={results} turnout={turnout} />
    </section>
  );
}
