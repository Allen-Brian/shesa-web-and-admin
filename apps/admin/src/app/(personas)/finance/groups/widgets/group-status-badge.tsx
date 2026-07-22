import { Badge } from '@shesa/ui';

import type { GroupStatus } from './groups-types';

const CLASSES: Record<GroupStatus, string> = {
  active: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  closed: 'border-slate-500/40 bg-slate-500/10 text-slate-700 dark:text-slate-300',
  archived: 'border-destructive/40 bg-destructive/10 text-destructive',
};

const LABEL: Record<GroupStatus, string> = {
  active: 'Active',
  closed: 'Closed',
  archived: 'Archived',
};

/** Coloured status pill matching the other finance lifecycle chips. */
export function GroupStatusBadge({ status }: { readonly status: GroupStatus }) {
  return (
    <Badge variant="outline" className={CLASSES[status]}>
      {LABEL[status]}
    </Badge>
  );
}
