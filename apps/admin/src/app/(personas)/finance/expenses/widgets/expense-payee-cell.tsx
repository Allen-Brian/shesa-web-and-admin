import { Receipt } from 'lucide-react';

import { Private } from '@shesa/ui';

import { GroupChip } from '@/components/finance/group-chip';

import type { SerialRow } from './expenses-types';

/**
 * "Payee" column cell — receipt icon avatar + payee + optional
 * description subtitle. Amber avatar signals "money out" so the
 * table reads distinctly from the payments (blue-ish) tables. When
 * the expense is tied to an event group, a compact group chip
 * renders beside the subtitle so operators can spot event-scoped
 * outflows without pivoting into the group view.
 */
export function ExpensePayeeCell({ row }: { readonly row: SerialRow }) {
  return (
    <div className="flex h-full items-center gap-2.5 py-1">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400">
        <Receipt className="h-4 w-4" />
      </div>
      <div className="flex min-w-0 flex-col leading-tight">
        <Private>
          <span className="block truncate text-sm font-medium text-foreground" title={row.payee}>
            {row.payee}
          </span>
        </Private>
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-xs text-muted-foreground">
            {row.scopeName}
            {row.description && ` · ${row.description}`}
          </span>
          {row.groupName && <GroupChip name={row.groupName} />}
        </div>
      </div>
    </div>
  );
}
