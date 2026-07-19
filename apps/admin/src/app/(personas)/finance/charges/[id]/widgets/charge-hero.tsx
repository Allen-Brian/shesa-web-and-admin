'use client';

import Link from 'next/link';
import { ArrowLeft, BadgeDollarSign, CircleDollarSign, Repeat, Target, Users } from 'lucide-react';

import { ChargeStatusChip } from './charge-status-chip';
import type { ChargeSummary } from './charge-detail-types';
import { formatMoney, formatRecurrence } from './shared-formatters';

/**
 * Plain-Jane charge hero — used for every non-`goal` charge. Icon +
 * name + status pill on one line; meta row and optional description
 * underneath. Kept inline (no panel wrapper) so vertical rhythm reads
 * as a page-level heading, not a card.
 */
export function ChargeHero({
  summary,
  backLinkHref,
}: {
  readonly summary: ChargeSummary;
  readonly backLinkHref: string;
}) {
  const Icon =
    summary.shape === 'goal'
      ? Target
      : summary.shape === 'charge' || summary.shape === 'fixed'
        ? BadgeDollarSign
        : CircleDollarSign;

  return (
    <div className="flex flex-col gap-2">
      <Link
        href={backLinkHref}
        className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to charges
      </Link>
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{summary.name}</h1>
        <ChargeStatusChip status={summary.status} />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Users className="h-3 w-3" />
          {summary.scopeName}
        </span>
        <span className="text-border">·</span>
        <span className="inline-flex items-center gap-1">
          <Repeat className="h-3 w-3" />
          {formatRecurrence(summary.recurrence, summary.recurrenceInterval)}
        </span>
        <span className="text-border">·</span>
        <span className="capitalize">{summary.shape}</span>
        {summary.baseAmount !== null && (
          <>
            <span className="text-border">·</span>
            <span className="text-foreground tabular-nums">
              {formatMoney(summary.baseAmount, summary.currency)}
            </span>
          </>
        )}
      </div>
      {summary.description && (
        <p className="text-xs leading-relaxed text-muted-foreground">{summary.description}</p>
      )}
    </div>
  );
}
