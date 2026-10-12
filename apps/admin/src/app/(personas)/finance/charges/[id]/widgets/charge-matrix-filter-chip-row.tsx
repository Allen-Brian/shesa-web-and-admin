import type { MatrixFilterCounts, MemberFilter } from './charge-detail-types';

/**
 * Segmented control above the matrix table — filters visible members
 * by settlement state (all / behind / not paid / partial / fully paid)
 * with the current count for each bucket baked into the pill.
 */
export function ChargeMatrixFilterChipRow({
  filter,
  onChange,
  counts,
}: {
  readonly filter: MemberFilter;
  readonly onChange: (f: MemberFilter) => void;
  readonly counts: MatrixFilterCounts;
}) {
  const items: readonly { key: MemberFilter; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'behind', label: 'Behind', count: counts.behind },
    { key: 'unpaid', label: 'Not paid', count: counts.unpaid },
    { key: 'partial', label: 'Partial', count: counts.partial },
    { key: 'fully_paid', label: 'Fully paid', count: counts.fullyPaid },
  ];
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-0.5">
      {items.map((it) => {
        const active = filter === it.key;
        return (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange(it.key)}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {it.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                active
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {it.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
