'use client';

import { useRouter } from 'next/navigation';

import type { AwardRow, MergeSuggestion, NominationRow, NomineeRow } from '../voting-types';

import { NomineesBoard } from './nominees-board';

/**
 * Puts the chosen award in the URL.
 *
 * Merge suggestions are computed per award on the server, so changing the
 * award has to reach the server — and putting it in the query string means a
 * reviewer can keep a tab open on one award, or send a colleague a link to
 * the one that needs a decision.
 */
export function NomineesClient({
  awards,
  nominees,
  nominations,
  suggestions,
  awardId,
}: {
  readonly awards: readonly AwardRow[];
  readonly nominees: readonly NomineeRow[];
  readonly nominations: readonly NominationRow[];
  readonly suggestions: readonly MergeSuggestion[];
  readonly awardId: string;
}) {
  const router = useRouter();

  return (
    <NomineesBoard
      awards={awards}
      nominees={nominees}
      nominations={nominations}
      suggestions={suggestions}
      awardId={awardId}
      onAwardChange={(id) => router.push(`/editor/voting/nominees?award=${id}`)}
    />
  );
}
