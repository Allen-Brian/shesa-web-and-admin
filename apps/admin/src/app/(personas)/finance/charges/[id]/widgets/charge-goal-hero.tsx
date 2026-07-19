'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Target, Users } from 'lucide-react';

import { Badge, GradientPanel } from '@shesa/ui';

import type { ChargeSummary } from './charge-detail-types';
import { buildGoalHeroStats, computeGoalPaceHint } from './charge-goal-hero-stats';
import { ChargeGoalThermometer } from './charge-goal-thermometer';
import { ChargeGoalVital } from './charge-goal-vital';
import { ChargeStatusChip } from './charge-status-chip';
import { formatMoney } from './shared-formatters';

/**
 * Goal-shape charge hero — thermometer gauge + vital-signs grid.
 * Fires for `shape='goal'` contributions with a goalAmount set.
 * Shows raised vs. goal, plus remaining / days-left / pace vs.
 * expected schedule.
 */
export function ChargeGoalHero({
  summary,
  backLinkHref,
  collected,
  contributorCount,
}: {
  readonly summary: ChargeSummary;
  readonly backLinkHref: string;
  readonly collected: number;
  readonly contributorCount: number;
}) {
  const { goal, percent, remaining, complete, closed, daysLeft } = useMemo(
    () => buildGoalHeroStats(summary, collected),
    [summary, collected],
  );
  const paceHint = useMemo(() => computeGoalPaceHint(summary, percent), [summary, percent]);

  return (
    <div className="flex flex-col gap-3">
      <Link
        href={backLinkHref}
        className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to charges
      </Link>

      <GradientPanel className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center">
        <ChargeGoalThermometer percent={percent} complete={complete} />

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h1 className="text-xl font-semibold tracking-tight text-foreground">{summary.name}</h1>
            <ChargeStatusChip status={summary.status} />
            {closed && (
              <Badge variant="outline" className="border-border bg-muted/40 text-muted-foreground">
                Closed
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
            <span className="text-foreground tabular-nums">
              <span className="font-semibold">{formatMoney(collected, summary.currency)}</span>{' '}
              <span className="text-muted-foreground">
                of {formatMoney(goal, summary.currency)}
              </span>
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Users className="h-3 w-3" />
              {contributorCount} contributor{contributorCount === 1 ? '' : 's'}
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <ChargeGoalVital
              label="Remaining"
              value={complete ? '—' : formatMoney(remaining, summary.currency)}
              hint={complete ? 'goal reached' : undefined}
              tone={complete ? 'emerald' : 'default'}
            />
            <ChargeGoalVital
              label={closed ? 'Ended' : 'Days left'}
              value={
                daysLeft === null
                  ? '—'
                  : closed
                    ? summary.closeDate
                      ? new Date(summary.closeDate).toLocaleDateString()
                      : '—'
                    : `${daysLeft}d`
              }
              hint={
                summary.closeDate && !closed
                  ? `Closes ${new Date(summary.closeDate).toLocaleDateString()}`
                  : undefined
              }
              tone={daysLeft !== null && !closed && daysLeft <= 7 ? 'amber' : 'default'}
            />
            <ChargeGoalVital
              label="Pace"
              value={
                paceHint === null
                  ? '—'
                  : paceHint.delta >= 5
                    ? `+${paceHint.delta}%`
                    : paceHint.delta <= -5
                      ? `${paceHint.delta}%`
                      : 'on track'
              }
              hint={
                paceHint === null ? 'no schedule' : `${paceHint.expectedPercent}% expected today`
              }
              tone={
                paceHint === null
                  ? 'default'
                  : paceHint.delta >= 5
                    ? 'emerald'
                    : paceHint.delta <= -5
                      ? 'destructive'
                      : 'default'
              }
            />
          </div>

          {summary.description && (
            <p className="text-xs leading-relaxed text-muted-foreground">{summary.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {summary.scopeName}
            </span>
            <span className="text-border">·</span>
            <span className="capitalize">Goal contribution</span>
            {summary.openDate && (
              <>
                <span className="text-border">·</span>
                <span>Opened {new Date(summary.openDate).toLocaleDateString()}</span>
              </>
            )}
          </div>
        </div>
      </GradientPanel>
    </div>
  );
}
