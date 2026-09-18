import { Badge } from '@shesa/ui';

import type { AwardsPhase } from '../voting-types';

/**
 * Where a cycle stands.
 *
 * Computed from the two windows rather than set by hand, so this is a
 * readout and never a control — the honest presentation, since the way to
 * change it is to change the dates.
 */
export const PHASE_COPY: Record<AwardsPhase, { label: string; tone: string; what: string }> = {
  upcoming: {
    label: 'Not open yet',
    tone: 'bg-muted text-muted-foreground',
    what: 'Nothing is public. Set the windows when SHESA confirms them.',
  },
  nominating: {
    label: 'Nominations open',
    tone: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    what: 'The public form is live. Names arrive under each award.',
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

export function PhaseBadge({ phase }: { readonly phase: AwardsPhase }) {
  const copy = PHASE_COPY[phase];
  return <Badge className={copy.tone}>{copy.label}</Badge>;
}
