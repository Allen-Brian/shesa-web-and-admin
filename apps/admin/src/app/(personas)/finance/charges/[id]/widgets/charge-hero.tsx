'use client';

import Link from 'next/link';
import { ArrowLeft, BadgeDollarSign, CircleDollarSign, Repeat, Target, Users } from 'lucide-react';

import { ChargeStatusChip } from './charge-status-chip';
import type { ChargeSummary } from './charge-detail-types';
import { formatMoney } from '@/lib/finance/format-money';
import { formatRecurrence } from '@/lib/format/recurrence';

/**
 * Plain-Jane charge hero — used for every non-`goal` charge. Compact
 * single-row heading: back button, icon, name, status, and the meta
 * chips (scope · recurrence · shape · amount) all on one wrapping
 * line, with an optional one-line description underneath. Kept inline
 * (no panel wrapper) and deliberately shallow so the matrix below gets
 * the vertical room.
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
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <Link
          href={backLinkHref}
          aria-label="Back to charges"
          title="Back to charges"
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{summary.name}</h1>
        <ChargeStatusChip status={summary.status} />

        <span className="mx-1 hidden h-4 w-px bg-border sm:inline-block" aria-hidden />

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
      </div>
      {summary.description && (
        <p className="truncate text-xs leading-relaxed text-muted-foreground">
          {summary.description}
        </p>
      )}
    </div>
  );
}
