import Link from 'next/link';
import { ArrowRight, ClipboardCheck } from 'lucide-react';

import { Badge, GradientPanel } from '@shesa/ui';

import { formatMoney } from '@/lib/finance/format-money';
import type { PendingApprovalSummary, RawExpense, ScopeRow } from './dashboard-types';
import { EmptyInline } from '@/components/dashboard/empty-inline';

interface PendingApprovalsPanelProps {
  readonly summary: PendingApprovalSummary;
  readonly pendingExpenses: readonly RawExpense[];
  readonly scopeById: ReadonlyMap<string, ScopeRow>;
}

/**
 * Pending-approvals panel. Renders even when the queue is empty so
 * the operator gets an explicit "queue clear" signal rather than
 * wondering whether the panel just didn't load. When populated, shows
 * the top-4 items with a link into the full expenses queue.
 */
export function PendingApprovalsPanel({
  summary,
  pendingExpenses,
  scopeById,
}: PendingApprovalsPanelProps) {
  return (
    <GradientPanel className="flex flex-col gap-3 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <ClipboardCheck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          Pending approvals
        </span>
        {summary.count > 0 && (
          <Badge
            variant="outline"
            className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
          >
            {summary.count}
          </Badge>
        )}
      </div>
      {summary.count === 0 ? (
        <EmptyInline label="Queue clear — no expenses awaiting approval." />
      ) : (
        <>
          <ul className="flex flex-col divide-y divide-border/50">
            {pendingExpenses.slice(0, 4).map((e) => {
              const scope = scopeById.get(e.scope_id);
              return (
                <li key={e.id} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-col leading-tight">
                      <span className="truncate text-sm font-medium text-foreground">
                        {e.payee}
                      </span>
                      <span className="truncate text-[11px] text-muted-foreground">
                        {scope?.name ?? '—'} · {new Date(e.incurred_at).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-foreground tabular-nums">
                      {formatMoney(e.amount, e.currency)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
          <Link
            href="/finance/expenses"
            className="inline-flex items-center gap-1 self-start text-xs text-primary hover:underline"
          >
            Open queue
            <ArrowRight className="h-3 w-3" />
          </Link>
        </>
      )}
    </GradientPanel>
  );
}
