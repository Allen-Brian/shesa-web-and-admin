import { formatDayOnly, formatRelativeShort } from './audit-log-helpers';

export function DayCell({ iso }: { readonly iso: string }) {
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-xs text-foreground">{formatDayOnly(iso)}</span>
      <span className="text-[10px] text-muted-foreground">{formatRelativeShort(iso)}</span>
    </div>
  );
}
