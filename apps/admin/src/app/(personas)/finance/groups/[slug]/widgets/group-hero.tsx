import Link from 'next/link';
import { ArrowLeft, CalendarClock } from 'lucide-react';

import type { GroupDetail } from '@/lib/finance/groups/load-group';

import { GroupStatusBadge } from '../../widgets/group-status-badge';

interface GroupHeroProps {
  readonly group: GroupDetail;
}

/**
 * Header for every per-group page. Back-link to the groups list, then
 * the group name + status chip + description + window subtitle. The
 * chip lives in the header (not tucked next to sub-nav) so the group's
 * lifecycle is unmissable when the operator lands on any sub-page.
 */
export function GroupHero({ group }: GroupHeroProps) {
  const from = group.startsOn ? new Date(group.startsOn).toLocaleDateString() : null;
  const to = group.endsOn ? new Date(group.endsOn).toLocaleDateString() : null;
  const window = from || to ? `${from ?? 'no start'} → ${to ?? 'no end'}` : 'no dates set';
  return (
    <header className="flex flex-col gap-2">
      <Link
        href="/finance/groups"
        className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" /> All groups
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <CalendarClock className="h-6 w-6" />
          {group.name}
        </h1>
        <GroupStatusBadge status={group.status} />
      </div>
      <p className="text-sm text-muted-foreground">
        <span className="mr-2">{window}</span>
        {group.description && <span>· {group.description}</span>}
      </p>
    </header>
  );
}
