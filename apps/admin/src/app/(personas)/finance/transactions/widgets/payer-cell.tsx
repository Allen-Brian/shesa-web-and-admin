import { Private } from '@shesa/ui';

import { getInitials } from './transactions-helpers';

/**
 * Left-most "who paid" cell — initials chip + payer label. Same
 * shape as the pool payments table on the charge-detail page so
 * operators find their eye.
 */
export function PayerCell({ label }: { readonly label: string }) {
  return (
    <div className="flex h-full min-w-0 items-center gap-2.5 py-1">
      {/* The initials identify the payer as surely as the name does on a
          table of thirty rows, so they blur with it. */}
      <Private>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
          {getInitials(label)}
        </span>
      </Private>
      <Private className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground" title={label}>
          {label}
        </span>
      </Private>
    </div>
  );
}
