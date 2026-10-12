import { CornerDownRight } from 'lucide-react';

import type { BranchesSerialRow } from './branches-list-types';

/**
 * Name column cell. Chapter rows show an indent arrow so the tree
 * relationship is visible at a glance.
 */
export function BranchesNameCell({ row }: { readonly row: BranchesSerialRow }) {
  if (row._kind === 'chapter') {
    return (
      <span className="flex items-center gap-2 text-muted-foreground">
        <CornerDownRight className="h-3.5 w-3.5 opacity-60" />
        <span className="text-foreground">{row.name}</span>
      </span>
    );
  }
  return <span>{row.name}</span>;
}
