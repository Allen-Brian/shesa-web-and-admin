'use client';

import type { ReportKey } from '../report-actions';
import { REPORTS } from './reports-types';

/**
 * Card grid that lets the operator pick a report by category instead
 * of scrolling through a plain select.
 *
 * Each card leads with the question the report answers rather than its
 * name, because somebody arriving here has a question, not a report
 * key — "who still owes us money" is findable, "Arrears" is only
 * findable if you already knew. The name and the technical one-liner
 * stay underneath for the people who do.
 *
 * "Covers a date range" / "As things stand today" replaces the older
 * "Windowed / Point-in-time" for the same reason.
 */
export function ReportCataloguePicker({
  value,
  onChange,
}: {
  readonly value: ReportKey;
  readonly onChange: (next: ReportKey) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex flex-col gap-0.5">
        <span className="text-sm font-semibold uppercase tracking-wider text-primary">
          Step 1 · Choose a report
        </span>
        <span className="text-base text-muted-foreground">
          Pick the question you want answered.
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => {
          const active = value === r.value;
          const Icon = r.icon;
          return (
            <button
              key={r.value}
              type="button"
              onClick={() => onChange(r.value)}
              className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                active
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border bg-card hover:border-primary/40 hover:bg-muted/40'
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${r.iconClass}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-base font-semibold leading-snug text-foreground">
                  {r.question}
                </span>
                <span className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground/70">{r.label}</span> ·{' '}
                  {r.description}
                </span>
                <span className="text-[11.5px] font-medium uppercase tracking-wider text-muted-foreground/80">
                  {r.usesDates ? 'Covers a date range' : 'As things stand today'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
