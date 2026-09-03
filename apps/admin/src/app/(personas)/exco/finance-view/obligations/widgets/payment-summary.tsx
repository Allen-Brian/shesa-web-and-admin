'use client';

import { ObligationStatusBadge } from './obligation-status-badge';
import { SummaryStat } from './summary-stat';
import type { PaymentDraft } from './obligation-widget-types';

/**
 * Read-only recap panel at the top of the payment dialog. Reminds the
 * operator which obligation they're settling, the imposer + period,
 * and the owed / paid / remaining split.
 */
export function PaymentSummary({ draft }: { readonly draft: PaymentDraft }) {
  const { row } = draft;
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border bg-muted/30 p-3 text-xs">
      <div className="flex items-baseline justify-between">
        <span className="font-medium text-foreground">{row.chargeName}</span>
        <ObligationStatusBadge status={row.status} />
      </div>
      <span className="text-muted-foreground">
        {row.imposerName}
        {row.periodStart && (
          <>
            {' · '}
            {new Date(row.periodStart).toLocaleDateString()}
            {row.periodEnd && ` → ${new Date(row.periodEnd).toLocaleDateString()}`}
          </>
        )}
      </span>
      <div className="mt-1 grid grid-cols-3 gap-2 border-t border-border/60 pt-2">
        <SummaryStat label="Owed" value={Math.round(row.amount)} />
        <SummaryStat label="Paid" value={Math.round(row.paid)} />
        <SummaryStat
          label="Remaining"
          value={row.outstanding > 0 ? Math.round(row.outstanding) : null}
          highlight={row.outstanding > 0}
        />
      </div>
    </div>
  );
}
