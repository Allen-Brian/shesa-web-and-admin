import { Calendar as CalendarIcon, Sparkles, TrendingUp, Users, Wallet } from 'lucide-react';

import { DashboardStatCard } from './dashboard-stat-card';
import { formatCompact } from '@/lib/finance/format-money';
import type { GlobalStats } from './dashboard-types';

export function DashboardGlobalStatsRow({ stats }: { readonly stats: GlobalStats }) {
  const collected = stats.collectedByCurrency;
  const primaryCurrency = collected[0] ?? { currency: '—', amount: 0 };

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <DashboardStatCard
        label="Branches & chapters"
        value={`${stats.branches} · ${stats.chapters}`}
        sub={
          <span>
            {stats.branches} branches, {stats.chapters} chapters
            {stats.autonomousChapters > 0 && ` (${stats.autonomousChapters} autonomous)`}
          </span>
        }
        icon={<Sparkles />}
      />
      <DashboardStatCard
        label="Total members"
        value={stats.totalMembers.toLocaleString()}
        sub={<span>In a branch or chapter</span>}
        icon={<Users />}
        trend={stats.trends.totalMembers}
      />
      <DashboardStatCard
        label="Membership rate"
        value={`${stats.percentMembership}%`}
        sub={<span>of {stats.allMembers.toLocaleString()} total identities</span>}
        icon={<TrendingUp />}
      />
      <DashboardStatCard
        label="Upcoming events"
        value={stats.upcomingEvents.toLocaleString()}
        sub={<span>Published & scheduled</span>}
        icon={<CalendarIcon />}
      />
      <DashboardStatCard
        label="Total collected"
        value={`${formatCompact(primaryCurrency.amount)} ${primaryCurrency.currency}`}
        sub={
          collected.length > 1 ? (
            <span>
              +{collected.length - 1} more currenc{collected.length > 2 ? 'ies' : 'y'}
            </span>
          ) : (
            <span>All-time payments (net)</span>
          )
        }
        icon={<Wallet />}
        trend={stats.trends.collected}
      />
    </div>
  );
}
