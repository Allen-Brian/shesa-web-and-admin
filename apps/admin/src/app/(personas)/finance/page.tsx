import { redirect } from 'next/navigation';
import { Home } from 'lucide-react';

import { getServerClient } from '@/lib/supabase-server';

import { loadFinanceDashboard } from './widgets/dashboard-loader';
import { FinanceHeroKpis } from './widgets/hero-kpis';
import { PendingApprovalsPanel } from './widgets/pending-approvals-panel';
import { QuickActionsGrid } from './widgets/quick-actions-grid';
import { RecentActivityPanel } from './widgets/recent-activity-panel';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Shesa Finance — Dashboard',
};

/**
 * Finance dashboard — reduced to the three numbers the mainstream
 * operator needs at a glance (Income / Expenses / Net for the last 30
 * days), then Recent Activity and Pending Approvals so nothing slips
 * off the radar. Every read is scoped to the caller's active finance
 * scope (mainstream-only for Global Finance; own branch scopes
 * otherwise) — see `lib/finance/active-scope.ts`.
 */
export default async function FinanceDashboardPage() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/finance');

  const { pendingExpenses, pendingSummary, scopeById, kpis, activity } =
    await loadFinanceDashboard();

  return (
    <section className="flex flex-1 flex-col gap-6">
      <header className="flex flex-col gap-1.5">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Finance
        </div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Home className="h-6 w-6" />
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Money in · money out · what's left, for the last 30 days.
        </p>
      </header>

      <FinanceHeroKpis kpis={kpis} />

      <QuickActionsGrid pendingCount={pendingSummary.count} />

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <RecentActivityPanel activity={activity} />
        <PendingApprovalsPanel
          summary={pendingSummary}
          pendingExpenses={pendingExpenses}
          scopeById={scopeById}
        />
      </div>
    </section>
  );
}
