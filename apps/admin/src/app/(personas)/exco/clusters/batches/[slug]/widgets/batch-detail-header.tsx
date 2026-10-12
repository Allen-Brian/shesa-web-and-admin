import { Badge } from '@shesa/ui';

interface BatchDetailHeaderProps {
  readonly name: string;
  readonly nickname: string | null;
  readonly ordinalLabel: string | null;
  readonly isArchived: boolean;
  readonly entryYear: number;
  readonly description: string | null;
  readonly memberCount: number;
}

/**
 * Big titled card at the top of the batch detail page. Left side: name,
 * nickname / ordinal / archived pills, then a summary line with entry
 * year + description. Right side: member count as a hero number.
 */
export function BatchDetailHeader({
  name,
  nickname,
  ordinalLabel,
  isArchived,
  entryYear,
  description,
  memberCount,
}: BatchDetailHeaderProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:gap-6">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{name}</h1>
          {nickname && (
            <Badge variant="outline" className="text-xs">
              {nickname}
            </Badge>
          )}
          {ordinalLabel && (
            <Badge variant="outline" className="text-xs">
              {ordinalLabel} Batch
            </Badge>
          )}
          {isArchived && (
            <Badge
              variant="outline"
              className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
            >
              Archived
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Entry year {entryYear}
          {description ? ` · ${description}` : ''}
        </p>
      </div>

      <div className="flex shrink-0 flex-col items-start sm:items-end">
        <span className="text-3xl font-semibold text-foreground">{memberCount}</span>
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {memberCount === 1 ? 'member' : 'members'}
        </span>
      </div>
    </div>
  );
}
