'use client';

import { BadgeDollarSign } from 'lucide-react';

/**
 * Rendered inside the table area when there are no charges visible to
 * the branch admin — usually because no Mainstream levies have been
 * cut for this body yet. Deliberately quiet: an empty finance table
 * shouldn't feel like an error.
 */
export function ChargesEmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <BadgeDollarSign className="h-5 w-5" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium text-foreground">No charges yet.</span>
        <span className="text-xs text-muted-foreground">
          When Mainstream issues a levy against your body, it&apos;ll show up here.
        </span>
      </div>
    </div>
  );
}
