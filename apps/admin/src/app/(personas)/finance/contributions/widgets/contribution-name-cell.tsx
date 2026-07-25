import type { ContributionRow } from './contributions-types';

/**
 * Name column cell. Group affiliation is shown in its own Event
 * Group column now, so this cell stays lean: the contribution name
 * on top, scope + shape as the subtitle.
 */
export function ContributionNameCell({ row }: { readonly row: ContributionRow }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="font-medium text-foreground">{row.name}</span>
      <span className="text-xs text-muted-foreground">
        {row.scopeName} · {row.shape}
      </span>
    </div>
  );
}
