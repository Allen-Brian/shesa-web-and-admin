'use client';

import { LayoutList, PieChart as PieChartIcon } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@shesa/ui';

import type { ChargeDetailProps } from './charge-detail-types';
import { ChargeGoalHero } from './charge-goal-hero';
import { ChargeHero } from './charge-hero';
import { ChargeMatrixReports } from './charge-matrix-reports';
import { ChargeMatrixTable } from './charge-matrix-table';
import { ChargePoolReports } from './charge-pool-reports';
import { ChargePoolTable } from './charge-pool-table';
import { ChargeRulesPanel } from './charge-rules-panel';

/**
 * ChargeDetailView — the "who has paid" drill-down for a single
 * charge. Slim orchestrator: picks the right hero (goal thermometer
 * vs plain header) and hands each tab to the matching Table + Reports
 * pair for the charge's mode + variant.
 *
 * Layout:
 *   • Hero: name, status, one-line meta, description.
 *   • Tab switcher:
 *       – Collection Table: member × period matrix (or flat payments
 *         list for pool shapes). Auto-adds the next few upcoming
 *         periods with an "Upcoming" pipeline state so admins can see
 *         what's coming without having to run the obligation
 *         generator first.
 *       – Reports: KPIs + charts + ranked tables. Charts use Recharts
 *         with theme-token fills so light + dark render cleanly.
 *
 * CSV export lives inside the Collection tab so operators can push
 * the raw matrix into Excel / Sheets.
 */
export function ChargeDetailView(props: ChargeDetailProps) {
  // Pool-mode carries collected + contributor count; matrix-mode has
  // members. The goal-thermometer hero wants the collected number so
  // the gauge fills to the right height even before you tap Reports.
  const collectedForHero =
    props.mode === 'pool' ? props.collected : props.mode === 'matrix' ? props.collected : 0;
  const contributorCount =
    props.mode === 'pool' ? props.payerCount : props.mode === 'matrix' ? props.members.length : 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      {props.summary.shape === 'goal' && props.summary.goalAmount ? (
        <ChargeGoalHero
          summary={props.summary}
          backLinkHref={props.backLinkHref}
          collected={collectedForHero}
          contributorCount={contributorCount}
        />
      ) : (
        <ChargeHero summary={props.summary} backLinkHref={props.backLinkHref} />
      )}
      <Tabs defaultValue="table" className="flex min-h-0 flex-1 flex-col gap-4">
        <TabsList className="self-start">
          <TabsTrigger value="table" className="gap-1.5">
            <LayoutList className="h-4 w-4" />
            Collection Table
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5">
            <PieChartIcon className="h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="table"
          className="flex min-h-0 flex-1 flex-col gap-4 focus-visible:outline-none"
        >
          {props.mode === 'matrix' && props.variant === 'members' && props.rules?.canManage && (
            <ChargeRulesPanel chargeId={props.summary.id} data={props.rules} />
          )}
          {props.mode === 'matrix' ? (
            <ChargeMatrixTable {...props} />
          ) : (
            <ChargePoolTable {...props} />
          )}
        </TabsContent>

        <TabsContent
          value="reports"
          className="flex min-h-0 flex-1 flex-col gap-4 focus-visible:outline-none"
        >
          {props.mode === 'matrix' ? (
            <ChargeMatrixReports {...props} />
          ) : (
            <ChargePoolReports {...props} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
