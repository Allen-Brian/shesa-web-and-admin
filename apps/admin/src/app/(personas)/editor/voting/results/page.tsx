import { BarChart3 } from 'lucide-react';

import { loadEdition, loadResults } from '../load-voting';
import { ResultsView } from '../widgets/results-view';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Editor — Results' };

export default async function ResultsPage() {
  const edition = await loadEdition();
  const data = edition ? await loadResults(edition.id) : null;

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <header className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Voting
        </div>
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

      {edition && data ? (
        <ResultsView edition={edition} results={data.results} turnout={data.turnout} />
      ) : (
        <p className="text-sm text-muted-foreground">No awards cycle exists yet.</p>
      )}
    </section>
  );
}
