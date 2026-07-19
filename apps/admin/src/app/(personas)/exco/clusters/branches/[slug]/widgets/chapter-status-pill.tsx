import { Badge } from '@shesa/ui';

import type { ScopeStatus } from '@/components/clusters/cluster-list';

const STYLES: Record<ScopeStatus, string> = {
  active: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  inactive: 'border-muted-foreground/30 bg-muted/40 text-muted-foreground',
  archived: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400',
};

const LABEL: Record<ScopeStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  archived: 'Archived',
};

export function ChapterStatusPill({ status }: { readonly status: ScopeStatus }) {
  return (
    <Badge variant="outline" className={STYLES[status]}>
      {LABEL[status]}
    </Badge>
  );
}
