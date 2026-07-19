/**
 * Slim horizontal coverage bar rendered inside the pinned Coverage
 * column. Colour ramps red → amber → sky → emerald as coverage rises.
 */
export function ChargeMatrixCoverageBar({ percent }: { readonly percent: number }) {
  const color =
    percent >= 100
      ? 'bg-emerald-500'
      : percent >= 70
        ? 'bg-sky-500'
        : percent >= 40
          ? 'bg-amber-500'
          : 'bg-destructive';
  return (
    <div className="flex h-full items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
      <span
        className={`shrink-0 text-xs tabular-nums ${
          percent >= 100 ? 'text-emerald-700 dark:text-emerald-400 font-medium' : 'text-foreground'
        }`}
      >
        {percent}%
      </span>
    </div>
  );
}
