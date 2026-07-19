'use client';

import type { ReportKey } from '../actions';
import { REPORTS } from './reports-types';

/**
 * Card grid that lets the operator pick a report by category instead
 * of scrolling through a plain select. Each card carries the report's
 * icon, description, and a "Windowed / Point-in-time" affordance so
 * the operator knows whether the date presets will apply before they
 * click.
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
      <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Report
      </span>
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
                <span className="text-sm font-semibold text-foreground">{r.label}</span>
                <span className="text-xs text-muted-foreground">{r.description}</span>
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/80">
                  {r.usesDates ? 'Windowed' : 'Point-in-time'}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
