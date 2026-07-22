import type { ContributionRow } from './contributions-types';

/**
 * Name column cell. When the contribution belongs to an event group,
 * the group name renders as a subtle prefix ("AGM 2026 — Tickets")
 * so the row reads as a single label rather than a separate chip.
 * The scope + shape subtitle stays put underneath.
 */
export function ContributionNameCell({ row }: { readonly row: ContributionRow }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="font-medium text-foreground">
        {row.groupName ? (
          <>
            <span className="text-muted-foreground">{row.groupName} — </span>
            {row.name}
          </>
        ) : (
          row.name
        )}
      </span>
      <span className="text-xs text-muted-foreground">
        {row.scopeName} · {row.shape}
      </span>
    </div>
  );
}
