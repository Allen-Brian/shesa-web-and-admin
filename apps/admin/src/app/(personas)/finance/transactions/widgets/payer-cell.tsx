import { getInitials } from './transactions-helpers';

/**
 * Left-most "who paid" cell — initials chip + payer label. Same
 * shape as the pool payments table on the charge-detail page so
 * operators find their eye.
 */
export function PayerCell({ label }: { readonly label: string }) {
  return (
    <div className="flex h-full items-center gap-2.5 py-1">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
        {getInitials(label)}
      </div>
      <span className="truncate text-sm font-medium text-foreground">{label}</span>
    </div>
  );
}
