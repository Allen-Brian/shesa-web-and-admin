import { GroupChip } from '@/components/finance/group-chip';

import type { DonationRow } from './donations-types';

/**
 * Campaign column cell on the Donations tab. Shows the parent
 * campaign's name and — when the campaign lives inside an event
 * group — its group chip. Same widget as the Campaigns tab uses for
 * cell layout consistency across the two tabs.
 */
export function DonationCampaignCell({ row }: { readonly row: DonationRow }) {
  return (
    <div className="flex flex-col gap-0.5 leading-tight">
      <span className="text-foreground">{row.campaignName}</span>
      {row.groupName && (
        <div className="flex items-center">
          <GroupChip name={row.groupName} />
        </div>
      )}
    </div>
  );
}
