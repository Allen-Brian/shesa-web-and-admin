import { BadgeDollarSign, CircleDollarSign } from 'lucide-react';

import { formatRecurrence } from '@/lib/format/recurrence';
import type { SerialRow } from './charges-types';

/**
 * "Name" column cell — shape icon + charge name + `scope · shape ·
 * recurrence` subtitle. Icon flips between the badge and circle
 * variants depending on whether the underlying charge is fixed-amount
 * or a proper recurring charge.
 */
export function ChargeNameCell({ row }: { readonly row: SerialRow }) {
  const ShapeIcon = row.shape === 'fixed' ? CircleDollarSign : BadgeDollarSign;
  const shapeLabel = row.shape === 'fixed' ? 'Fixed' : 'Charge';
  const rec = formatRecurrence(row.recurrence, row.recurrenceInterval);
  return (
    <div className="flex h-full items-center gap-2.5 py-1">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <ShapeIcon className="h-4 w-4" />
      </div>
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm font-medium text-foreground">{row.name}</span>
        <span className="truncate text-xs text-muted-foreground">
          {row.scopeName} · {shapeLabel} · {rec}
        </span>
      </div>
    </div>
  );
}
