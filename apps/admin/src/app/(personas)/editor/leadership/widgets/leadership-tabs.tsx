'use client';

import { Building2, Crown, GraduationCap, Globe2 } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shesa/ui';

import { BatchesTab } from './batches-tab';
import { BranchesTab } from './branches-tab';
import type { OrganOption } from './regional-leader-dialog';
import { DiasporaTab } from './diaspora-tab';
import { MainstreamTab } from './mainstream-tab';
import type { BatchLeaderRow, RegionalLeaderRow, SectorRow } from './leadership-widget-types';

interface Props {
  readonly sectors: readonly SectorRow[];
  readonly branchLeaders: readonly RegionalLeaderRow[];
  readonly diasporaLeaders: readonly RegionalLeaderRow[];
  readonly batchLeaders: readonly BatchLeaderRow[];
  /** Offered to the branch and diaspora dialogs, for the organ link. */
  readonly organs: readonly OrganOption[];
}

/**
 * Four-tab Leadership editor. Each tab is its own client widget so
 * dialog state stays local to the surface the operator is on.
 */
export function LeadershipTabs(props: Props) {
  return (
    <Tabs defaultValue="mainstream" className="flex min-h-0 flex-1 flex-col gap-4">
      <TabsList className="self-start">
        <TabsTrigger value="mainstream" className="gap-1.5">
          <Crown className="h-4 w-4" />
          Mainstream
        </TabsTrigger>
        <TabsTrigger value="branches" className="gap-1.5">
          <Building2 className="h-4 w-4" />
          Branches
        </TabsTrigger>
        <TabsTrigger value="diaspora" className="gap-1.5">
          <Globe2 className="h-4 w-4" />
          Diaspora
        </TabsTrigger>
        <TabsTrigger value="batches" className="gap-1.5">
          <GraduationCap className="h-4 w-4" />
          Batches
        </TabsTrigger>
      </TabsList>

      <TabsContent
        value="mainstream"
        className="flex min-h-0 flex-1 flex-col focus-visible:outline-none"
      >
        <MainstreamTab sectors={props.sectors} />
      </TabsContent>
      <TabsContent
        value="branches"
        className="flex min-h-0 flex-1 flex-col focus-visible:outline-none"
      >
        <BranchesTab leaders={props.branchLeaders} organs={props.organs} />
      </TabsContent>
      <TabsContent
        value="diaspora"
        className="flex min-h-0 flex-1 flex-col focus-visible:outline-none"
      >
        <DiasporaTab leaders={props.diasporaLeaders} organs={props.organs} />
      </TabsContent>
      <TabsContent
        value="batches"
        className="flex min-h-0 flex-1 flex-col focus-visible:outline-none"
      >
        <BatchesTab leaders={props.batchLeaders} />
      </TabsContent>
    </Tabs>
  );
}
