import { Receipt } from 'lucide-react';

import type { SerialRow } from './expenses-types';

/**
 * "Payee" column cell — receipt icon avatar + payee + optional
 * description subtitle. Amber avatar signals "money out" so the
 * table reads distinctly from the payments (blue-ish) tables.
 */
export function ExpensePayeeCell({ row }: { readonly row: SerialRow }) {
  return (
    <div className="flex h-full items-center gap-2.5 py-1">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-400">
        <Receipt className="h-4 w-4" />
      </div>
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-medium text-foreground">{row.payee}</span>
        <span className="truncate text-xs text-muted-foreground">
          {row.scopeName}
          {row.description && ` · ${row.description}`}
        </span>
      </div>
    </div>
  );
}
