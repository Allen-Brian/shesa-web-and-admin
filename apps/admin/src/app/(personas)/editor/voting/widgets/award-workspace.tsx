'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge, StatsCard, Tabs, TabsContent, TabsList, TabsTrigger } from '@shesa/ui';

import type { AwardWorkspace } from '../load-voting';

import { CandidatesPanel } from './candidates-panel';
import { NominationsReview } from './nominations-review';
import { NomineesBoard } from './nominees-board';

/**
 * One award's workspace.
 *
 * Three panels in the order the work happens: what came in, who it adds up
 * to, and who ends up on the paper. The tab is in the URL so a colleague can
 * be sent straight to the screen that needs a decision.
 */
export function AwardWorkspaceView({
  workspace,
  tab,
}: {
  readonly workspace: AwardWorkspace;
  readonly tab: 'nominations' | 'nominees' | 'ballot';
}) {
  const router = useRouter();
  const { edition, award, categoryName, nominations, nominees, candidates, suggestions } =
    workspace;

  const base = `/editor/voting/${edition.slug}/awards/${award.id}`;
  const ungrouped = nominations.filter((n) => !n.nomineeId).length;
  const activeCandidates = candidates.filter((c) => c.status === 'active').length;

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

      <div className="flex flex-wrap gap-3">
        <StatsCard label="Nominations" value={nominations.length} />
        <StatsCard label="People nominated" value={nominees.length} />
        <StatsCard label="Ungrouped" value={ungrouped} />
        <StatsCard label="On the ballot" value={activeCandidates} />
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => router.push(`${base}?tab=${v}`)}
        className="flex min-h-0 flex-1 flex-col gap-4"
      >
        <TabsList className="w-fit">
          <TabsTrigger value="nominations">
            Nominations
            <span className="ml-1.5 text-xs text-muted-foreground">({nominations.length})</span>
          </TabsTrigger>
          <TabsTrigger value="nominees">
            Nominees
            <span className="ml-1.5 text-xs text-muted-foreground">({nominees.length})</span>
          </TabsTrigger>
          <TabsTrigger value="ballot">
            The ballot
            <span className="ml-1.5 text-xs text-muted-foreground">({activeCandidates})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nominations" className="flex min-h-0 flex-1 flex-col">
          <NominationsReview nominations={nominations} />
        </TabsContent>

        <TabsContent value="nominees" className="flex min-h-0 flex-1 flex-col">
          <NomineesBoard
            awardId={award.id}
            awardName={award.name}
            nominees={nominees}
            nominations={nominations}
            suggestions={suggestions}
          />
        </TabsContent>

        <TabsContent value="ballot" className="flex min-h-0 flex-1 flex-col">
          <CandidatesPanel
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
