import type { GroupRow } from './groups-types';

/**
 * Name column cell — group name with slug + description subtitle.
 * The slug renders as monospace so operators can eyeball it against
 * URLs / sidebar entries when they need to.
 */
export function GroupNameCell({ row }: { readonly row: GroupRow }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="font-medium text-foreground">{row.name}</span>
      <span className="text-xs text-muted-foreground">
        <code className="mr-1 rounded bg-muted px-1 text-[10px]">{row.slug}</code>
        {row.description}
      </span>
    </div>
  );
}
