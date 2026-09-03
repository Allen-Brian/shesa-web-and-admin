import { CATEGORY_META, CATEGORY_ORDER } from './audit-log-constants';
import type { CategoryFilter } from './audit-log-widget-types';

export function CategoryChipRow({
  category,
  onChange,
  counts,
}: {
  readonly category: CategoryFilter;
  readonly onChange: (c: CategoryFilter) => void;
  readonly counts: Record<CategoryFilter, number>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-1">
      {CATEGORY_ORDER.map((k) => {
        const active = category === k;
        const meta = CATEGORY_META[k];
        return (
          <button
            key={k}
            type="button"
            onClick={() => onChange(k)}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {meta.label}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                active
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {counts[k]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
