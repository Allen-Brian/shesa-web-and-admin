'use client';

import { DashboardAnnouncementsCard } from './dashboard-announcements-card';
import { DashboardCalendarCard } from './dashboard-calendar-card';
import { DashboardChargesCompletionCard } from './dashboard-charges-completion-card';
import { DashboardChargesTimelineCard } from './dashboard-charges-timeline-card';
import { DashboardContributionsCard } from './dashboard-contributions-card';
import { DashboardContributionsTimelineCard } from './dashboard-contributions-timeline-card';
import { DashboardGlobalStatsRow } from './dashboard-global-stats-row';
import { DashboardHeader } from './dashboard-header';
import { DashboardLatestTransactionsCard } from './dashboard-latest-transactions-card';
import { DashboardMembershipGrowthCard } from './dashboard-membership-growth-card';
import { DashboardRegistrationPieCard } from './dashboard-registration-pie-card';
import { DashboardScopedStatsRow } from './dashboard-scoped-stats-row';
import { DashboardTopMembersCard } from './dashboard-top-members-card';
import { DashboardUpcomingEventsCard } from './dashboard-upcoming-events-card';
import type { DashboardProps } from './dashboard-types';

export type {
  AnalyticsData,
  AnnouncementItem,
  CalendarEvent,
  ChargeCompletion,
  ContributionRow,
  ContributionsBlock,
  DashboardProps,
  EventItem,
  GlobalStats,
  ScopedStats,
  TopMember,
  Transaction,
} from './dashboard-types';

/**
 * Exco dashboard — top-level layout composer. Header + stats-row at the
 * top, two-column analytics row underneath, then a 3-column body: the
 * left 2/3 column stacks Contributions + Charges + Latest Transactions,
 * and the right 1/3 column stacks Upcoming Events + Calendar +
 * Announcements + compact chart cards. Full-width Top Members closes.
 *
 * Every card + primitive lives in its own file per the one-per-file rule.
 */
export function ExcoDashboardView(props: DashboardProps) {
  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        userName={props.userName}
        scopeLabel={props.scopeLabel}
        isGlobalAdmin={props.isGlobalAdmin}
      />

      {props.stats.kind === 'global' ? (
        <DashboardGlobalStatsRow stats={props.stats} />
      ) : (
        <DashboardScopedStatsRow stats={props.stats} />
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <DashboardMembershipGrowthCard data={props.analytics.membershipGrowth} />
        <DashboardChargesTimelineCard data={props.analytics.chargesTimeline} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <DashboardContributionsCard block={props.contributions} />
          <DashboardChargesCompletionCard rows={props.chargesCompletion} />
          <DashboardLatestTransactionsCard rows={props.latestTransactions} />
        </div>

        <div className="flex flex-col gap-5">
          <DashboardUpcomingEventsCard events={props.upcomingEvents} />
          <DashboardCalendarCard events={props.calendarEvents} />
          <DashboardAnnouncementsCard items={props.announcements} />
          <DashboardRegistrationPieCard
            data={props.analytics.registrationPie}
            title={props.isGlobalAdmin ? 'Registration coverage' : 'Registration mix'}
            compact
          />
          <DashboardContributionsTimelineCard
            data={props.analytics.contributionsTimeline}
            compact
          />
        </div>
      </div>

      <DashboardTopMembersCard members={props.topMembers} />
    </div>
  );
}
