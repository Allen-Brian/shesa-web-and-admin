'use client';

import Link from 'next/link';
import { Badge, Tabs, TabsContent, TabsList, TabsTrigger } from '@shesa/ui';
import { useState } from 'react';

import type { AwardWorkspace } from '../load-voting';

import { BallotPanel } from './ballot-panel';
import { NominationsPanel } from './nominations-panel';
import { NomineesPanel } from './nominees-panel';

/**
 * One award's workspace.
 *
 * Three views of the same pile, in the order the work happens: the people
 * who were named, the raw submissions behind them, and who ends up on the
 * paper. Nominees leads because it answers the question people open an award
 * to ask — who has been put forward most — and because it is where the only
 * decision gets made.
 *
 * Switching tabs is local state rather than navigation. All three panels
 * render from data the server already sent, so a round trip to change tab
 * bought nothing and cost a visible wait.
 */
export function AwardWorkspaceView({
  workspace,
  tab,
}: {
  readonly workspace: AwardWorkspace;
  readonly tab: 'nominations' | 'nominees' | 'ballot';
}) {
  const { edition, award, categoryName, nominations, nominees, candidates, suggestions } =
    workspace;
  const [current, setCurrent] = useState(tab);

  const base = `/editor/voting/${edition.slug}/awards/${award.id}`;
  const ungrouped = nominations.filter((n) => !n.nomineeId).length;
  const activeCandidates = candidates.filter((c) => c.status === 'active').length;

  const select = (value: string) => {
    setCurrent(value as typeof tab);
    window.history.replaceState(null, '', `${base}?tab=${value}`);
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-5">
      <header className="flex flex-col gap-2">
        <Link
          href={`/editor/voting/${edition.slug}?tab=awards`}
          className="w-fit text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary"
        >
          ← {edition.name}
        </Link>

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{award.name}</h1>
          {categoryName && <Badge className="bg-muted text-muted-foreground">{categoryName}</Badge>}
          {award.status === 'hidden' && (
            <Badge className="bg-muted text-muted-foreground">Hidden from the public</Badge>
          )}
        </div>

        {award.description && (
          <p className="max-w-3xl text-sm text-muted-foreground">{award.description}</p>
        )}
      </header>

      <Tabs value={current} onValueChange={select} className="flex min-h-0 flex-1 flex-col gap-4">
        <TabsList className="w-fit">
          <TabsTrigger value="nominees">
            People
            <span className="ml-1.5 text-xs text-muted-foreground">({nominees.length})</span>
          </TabsTrigger>
          <TabsTrigger value="nominations">
            Nominations
            <span className="ml-1.5 text-xs text-muted-foreground">({nominations.length})</span>
            {ungrouped > 0 && (
              <span
                className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400"
                title={`${ungrouped} nomination(s) counted against nobody`}
              >
                {ungrouped}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="ballot">
            The ballot
            <span className="ml-1.5 text-xs text-muted-foreground">({activeCandidates})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nominees" className="flex min-h-0 flex-1 flex-col">
          <NomineesPanel
            awardId={award.id}
            awardName={award.name}
            nominees={nominees}
            nominations={nominations}
            suggestions={suggestions}
          />
        </TabsContent>

        <TabsContent value="nominations" className="flex min-h-0 flex-1 flex-col">
          <NominationsPanel awardId={award.id} nominations={nominations} nominees={nominees} />
        </TabsContent>

        <TabsContent value="ballot" className="flex min-h-0 flex-1 flex-col">
          <BallotPanel
            awardId={award.id}
            awardName={award.name}
            candidates={candidates}
            phase={edition.phase}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}
