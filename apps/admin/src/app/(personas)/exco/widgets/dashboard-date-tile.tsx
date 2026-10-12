interface DashboardDateTileProps {
  readonly iso: string;
  readonly bgClass?: string;
}

/**
 * Small month + day-of-month tile used by the Upcoming Events list.
 * Falls back to a primary-tinted background when no `bgClass` is
 * provided (e.g. when the event has no type).
 */
export function DashboardDateTile({ iso, bgClass }: DashboardDateTileProps) {
  const d = new Date(iso);
  return (
    <div
      className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md border border-border/60 ${
        bgClass ?? 'bg-primary/10 text-primary'
      }`}
    >
      <span className="text-[9px] font-medium uppercase tracking-wider">
        {d.toLocaleString(undefined, { month: 'short' })}
      </span>
      <span className="text-base font-semibold leading-none tabular-nums">
        {d.getDate().toString().padStart(2, '0')}
      </span>
    </div>
  );
}
