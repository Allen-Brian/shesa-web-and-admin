'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StatsCard, Tabs, TabsContent, TabsList, TabsTrigger } from '@shesa/ui';
import { BarChart3, ScrollText, Trophy } from 'lucide-react';

import type { EditionTotals } from '../load-voting';
import type { AwardRow, CategoryRow, EditionRow } from '../voting-types';
import { watDate } from '../wat';

import { AwardsPanel } from './awards-panel';
import { DescriptionPanel } from './description-panel';
import { PHASE_COPY, PhaseBadge } from './phase-badge';

/**
 * The ceremony workspace.
 *
 * Description carries everything true of the cycle as a whole — its dates,
 * its two links, the Exco post list, the weighting. Awards is the list of
 * things being awarded, and each row opens into its own workspace.
 *
 * The tab lives in the URL rather than in state so a link can point at
 * either panel, and so going back from an award returns to the tab you
 * were on rather than the default.
 */
export function CeremonySwitcher({
  edition,
  categories,
  awards,
  totals,
  excoPosts,
  webBaseUrl,
  tab,
}: {
  readonly edition: EditionRow;
  readonly categories: readonly CategoryRow[];
  readonly awards: readonly AwardRow[];
  readonly totals: EditionTotals;
  readonly excoPosts: readonly { id: string; label: string; sortOrder: number }[];
  readonly webBaseUrl: string;
  readonly tab: 'description' | 'awards';
}) {
  const router = useRouter();
  const base = `/editor/voting/${edition.slug}`;

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <header className="flex flex-col gap-2">
        <Link
          href="/editor/voting"
          className="w-fit text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary"
        >
          ← All ceremonies
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <Trophy className="h-6 w-6" />
            {edition.name}
          </h1>
          <PhaseBadge phase={edition.phase} />
        </div>

        <p className="text-sm text-muted-foreground">{PHASE_COPY[edition.phase].what}</p>

        <div className="flex flex-wrap gap-x-8 gap-y-1 text-xs text-muted-foreground">
          <span>
            Nominations{' '}
            <span className="font-medium text-foreground">
              {watDate(edition.nominationsOpenAt)} → {watDate(edition.nominationsCloseAt)}
            </span>
          </span>
          <span>
            Voting{' '}
            <span className="font-medium text-foreground">
              {watDate(edition.votingOpenAt)} → {watDate(edition.votingCloseAt)}
            </span>
          </span>
        </div>
      </header>

      <div className="flex flex-wrap gap-3">
        <StatsCard label="Nominations received" value={totals.nominations} />
        <StatsCard label="Awaiting review" value={totals.pending} />
        <StatsCard label="On the ballot" value={totals.candidates} />
        <StatsCard label="Ballots cast" value={totals.ballots} />
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => router.push(`${base}?tab=${v}`)}
        className="flex min-h-0 flex-1 flex-col gap-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList className="w-fit">
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="awards">
              Awards
              <span className="ml-1.5 text-xs text-muted-foreground">({awards.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* Ballots and results are their own screens rather than tabs:
              they belong to the cycle as a whole, they are only useful once
              voting has started, and neither is part of setting it up. */}
          <div className="flex items-center gap-2">
            <Link
              href={`${base}/ballots`}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ScrollText className="h-3.5 w-3.5" aria-hidden /> Ballots
            </Link>
            <Link
              href={`${base}/results`}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <BarChart3 className="h-3.5 w-3.5" aria-hidden /> Results
            </Link>
          </div>
        </div>

        <TabsContent value="description" className="flex min-h-0 flex-1 flex-col">
          <DescriptionPanel
            edition={edition}
            excoPosts={excoPosts}
            webBaseUrl={webBaseUrl}
            categories={categories}
          />
        </TabsContent>

        <TabsContent value="awards" className="flex min-h-0 flex-1 flex-col">
          <AwardsPanel
            edition={edition}
            categories={categories}
            awards={awards}
            emptyAwards={totals.emptyAwards}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}
