import { Calendar as CalendarIcon, MapPin, Sparkles, Target, Users } from 'lucide-react';

import { DashboardStatCard } from './dashboard-stat-card';
import type { ScopedStats } from './dashboard-types';

export function DashboardScopedStatsRow({ stats }: { readonly stats: ScopedStats }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <DashboardStatCard
        label="Members"
        value={stats.members.toLocaleString()}
        sub={<span>Active + passive at your scope</span>}
        icon={<Users />}
        trend={stats.trends.members}
      />
      <DashboardStatCard
        label="Charges completion"
        value={`${stats.percentCompletion}%`}
        sub={<span>Paid ÷ expected</span>}
        icon={<Target />}
      />
      <DashboardStatCard
        label="Upcoming events"
        value={stats.upcomingEvents.toLocaleString()}
        sub={<span>Published & scheduled</span>}
        icon={<CalendarIcon />}
      />
      <DashboardStatCard
        label="Acquisition"
        value={stats.percentAcquisition == null ? '—' : `${stats.percentAcquisition}%`}
        sub={<span>Of alumni in your city</span>}
        icon={<MapPin />}
      />
      <DashboardStatCard
        label="New this month"
        value={stats.newMembersThisMonth.toLocaleString()}
        sub={<span>Joined since day one</span>}
        icon={<Sparkles />}
      />
    </div>
  );
}
