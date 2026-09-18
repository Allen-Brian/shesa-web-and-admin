import { Layers } from 'lucide-react';

import { loadMergeSuggestions, loadNominations, loadNominees, loadVoting } from '../load-voting';
import { NomineesClient } from '../widgets/nominees-client';
import { VotingTabs } from '../widgets/voting-tabs';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Shesa Editor — Nominees' };

/**
 * Aggregation.
 *
 * The award to work on comes from the query string rather than component
 * state, so the merge suggestions — which are a database query per award —
 * can be computed on the server for exactly the award being looked at.
 */
export default async function NomineesPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ award?: string }>;
}) {
  const [{ awards }, nominees, nominations, { award }] = await Promise.all([
    loadVoting(),
    loadNominees(),
    loadNominations(),
    searchParams,
  ]);

  // Default to the award with the most nominations: it is where the counting
  // problem is worst and therefore where someone opening this page is going.
  const busiest = [...awards].sort((a, b) => b.nominationCount - a.nominationCount)[0];
  const awardId = award ?? busiest?.id ?? '';
  const suggestions = awardId ? await loadMergeSuggestions(awardId) : [];

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <header className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Voting
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
          <Layers className="h-6 w-6" />
          Nominees
        </h1>
        <p className="text-sm text-muted-foreground">
          One row per person rather than per nomination, so you can see who has been put forward
          most without counting. Spellings that differ are grouped here, not in the nominations
          themselves — every nomination keeps its own record and its own citation.
        </p>
      </header>

      <VotingTabs active="nominees" />

      <NomineesClient
        awards={awards}
        nominees={nominees}
        nominations={nominations}
        suggestions={suggestions}
        awardId={awardId}
      />
    </section>
  );
}
