import { Badge } from '@shesa/ui';

import type { AwardsPhase, EditionRow } from '../voting-types';

/** WAT. Every deadline SHESA publishes is in it, so every date here is too. */
export const WAT = 'Africa/Lagos';

export function watDate(iso: string | null, withTime = true): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: WAT,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

const PHASE_COPY: Record<AwardsPhase, { label: string; tone: string; what: string }> = {
  upcoming: {
    label: 'Not open yet',
    tone: 'bg-muted text-muted-foreground',
    what: 'Nothing is public. Set the windows below when SHESA confirms them.',
  },
  nominating: {
    label: 'Nominations open',
    tone: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    what: 'The public form is live. Names arrive under Nominations.',
  },
  review: {
    label: 'Under review',
    tone: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    what: 'Nominations have closed and voting has not opened. This is the window to draw the shortlist.',
  },
  voting: {
    label: 'Voting open',
    tone: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    what: 'Ballots are being cast. Changing the shortlist now changes an election in progress.',
  },
  closed: {
    label: 'Closed',
    tone: 'bg-muted text-muted-foreground',
    what: 'Voting is over. The results are final.',
  },
};

/**
 * Where the cycle stands, and what that means for the person reading.
 *
 * The phase is computed from the two windows rather than set by hand, so
 * this is a readout and not a control — which is the honest presentation:
 * the way to change it is to change the dates.
 */
export function PhaseBanner({ edition }: { readonly edition: EditionRow }) {
  const copy = PHASE_COPY[edition.phase];

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <Badge className={copy.tone}>{copy.label}</Badge>
        <span className="text-sm font-medium text-foreground">{edition.name}</span>
      </div>
      <p className="text-sm text-muted-foreground">{copy.what}</p>
      <dl className="mt-1 grid gap-x-8 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
        <div className="flex justify-between gap-4 sm:justify-start">
          <dt>Nominations</dt>
          <dd className="font-medium text-foreground">
            {watDate(edition.nominationsOpenAt)} → {watDate(edition.nominationsCloseAt)}
          </dd>
        </div>
        <div className="flex justify-between gap-4 sm:justify-start">
          <dt>Voting</dt>
          <dd className="font-medium text-foreground">
            {watDate(edition.votingOpenAt)} → {watDate(edition.votingCloseAt)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
