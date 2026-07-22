import { Building2, User } from 'lucide-react';

import type { ChargeRow } from './charges-types';

/**
 * Type cell — "Individual" vs "Group · N targets". A one-liner icon
 * + label so the columnist can eyeball a mixed portfolio without
 * opening each row.
 */
export function ChargeTypeCell({ row }: { readonly row: ChargeRow }) {
  if (row.targetPartyType === 'branch') {
    return (
      <div className="flex items-center gap-1.5 text-sm">
        <Building2 className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        <span className="font-medium">Group</span>
        <span className="text-xs text-muted-foreground">
          · {row.targetCount} target{row.targetCount === 1 ? '' : 's'}
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <User className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      <span className="font-medium">Individual</span>
    </div>
  );
}
