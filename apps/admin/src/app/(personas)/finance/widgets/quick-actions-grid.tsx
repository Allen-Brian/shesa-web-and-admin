import { BadgeDollarSign, ClipboardList, HandCoins, Receipt } from 'lucide-react';

import { QuickActionCard } from './quick-action-card';

/**
 * Four-up "jump into the mainline flow" grid: record a payment,
 * record an expense (with pending-approval badge), draft a new
 * charge, run a report. Expense card gets a badge when the queue is
 * non-empty so the operator can see triage-worthy work before
 * navigating.
 */
export function QuickActionsGrid({ pendingCount }: { readonly pendingCount: number }) {
  return (
    <div>
      <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Quick actions
      </span>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <QuickActionCard
          href="/finance/transactions"
          icon={HandCoins}
          iconClass="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
          label="Record a payment"
          hint="Cash / MoMo / bank"
        />
        <QuickActionCard
          href="/finance/expenses"
          icon={Receipt}
          iconClass="bg-amber-500/15 text-amber-700 dark:text-amber-400"
          label="Record an expense"
          hint={pendingCount > 0 ? `${pendingCount} pending approval` : 'Money out'}
          badgeCount={pendingCount}
        />
        <QuickActionCard
          href="/finance/charges"
          icon={BadgeDollarSign}
          iconClass="bg-primary/10 text-primary"
          label="New charge"
          hint="Dues, levies, fixed"
        />
        <QuickActionCard
          href="/finance/reports"
          icon={ClipboardList}
          iconClass="bg-sky-500/15 text-sky-700 dark:text-sky-300"
          label="Run a report"
          hint="Collections, arrears, …"
        />
      </div>
    </div>
  );
}
