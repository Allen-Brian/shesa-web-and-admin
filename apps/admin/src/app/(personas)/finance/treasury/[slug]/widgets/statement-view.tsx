'use client';

import { StatementFlow } from './statement-flow';
import { StatementHeader } from './statement-header';
import { StatementMovementsPanel } from './statement-movements-panel';
import { StatementPeriodBar } from './statement-period-bar';
import type { Entry, Period, StatementSummary } from './statement-types';

interface Props {
  readonly scopeName: string;
  readonly scopeType: string;
  readonly scopeSlug: string;
  readonly period: Period;
  readonly summary: StatementSummary;
  readonly entries: readonly Entry[];
}

/**
 * Treasury statement drill-down — header + period bar + summary flow +
 * movements table. Every section is its own sibling; this file wires
 * the props through and holds the outer flex column.
 */
export function StatementView({
  scopeName,
  scopeType,
  scopeSlug,
  period,
  summary,
  entries,
}: Props) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <StatementHeader
        scopeName={scopeName}
        scopeType={scopeType}
        liveBalance={summary.liveBalance}
        liveUpdatedAt={summary.liveUpdatedAt}
        currency={summary.currency}
      />

      <StatementPeriodBar current={period} scopeSlug={scopeSlug} entriesCount={entries.length} />

      <StatementFlow summary={summary} />

      <StatementMovementsPanel entries={entries} />
    </div>
  );
}
