import { GroupChip } from '@/components/finance/group-chip';

import type { CampaignRow } from './donations-types';

/**
 * Campaign column cell. When the campaign belongs to an event group,
 * a small group chip renders next to the scope subtitle so operators
 * can spot event-scoped campaigns at a glance. The name itself stays
 * untouched (the default group campaign shares the group's name, so
 * a prefix would double up).
 */
export function CampaignNameCell({ row }: { readonly row: CampaignRow }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="font-medium text-foreground">{row.name}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">{row.scopeName}</span>
        {row.groupName && <GroupChip name={row.groupName} />}
      </div>
    </div>
  );
}
