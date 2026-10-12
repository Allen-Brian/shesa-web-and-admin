'use client';

import { Play } from 'lucide-react';

import {
  Button,
  Label,
  NativeDateInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shesa/ui';

import { PRESETS, type GroupOption, type Preset, type ScopeOption } from './reports-types';

interface ReportControlsCardProps {
  readonly scopeOptions: readonly ScopeOption[];
  readonly scopeId: string;
  readonly onScopeChange: (id: string) => void;
  readonly groupOptions: readonly GroupOption[];
  readonly groupId: string;
  readonly onGroupChange: (id: string) => void;
  readonly usesDates: boolean;
  readonly preset: Preset;
  readonly onPresetChange: (p: Preset) => void;
  readonly customFrom: string;
  readonly onCustomFromChange: (v: string) => void;
  readonly customTo: string;
  readonly onCustomToChange: (v: string) => void;
  readonly summaryLine: string;
  readonly canRun: boolean;
  readonly pending: boolean;
  readonly onRun: () => void;
}

/**
 * Scope + window controls beneath the report catalogue. Preset chip
 * strip collapses "last 30 / 90 / MTD / YTD / all / custom" into one
 * row so the operator can scan them in one glance; when `custom` is
 * active the from/to date inputs reveal underneath.
 *
 * The `Run report` button lives here (rather than on the result
 * panel) because it's the operator's next natural action after
 * setting scope + window.
 */
export function ReportControlsCard(props: ReportControlsCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold uppercase tracking-wider text-primary">
          Step 2 · Choose what it should cover
        </span>
        <span className="text-base text-muted-foreground">
          Which branch or chapter, and over what dates.
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="scope">Scope</Label>
          <Select value={props.scopeId} onValueChange={props.onScopeChange}>
            <SelectTrigger id="scope">
              <SelectValue placeholder="Pick a scope" />
            </SelectTrigger>
            <SelectContent>
              {props.scopeOptions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} · {s.currency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {props.groupOptions.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="group">Event group (optional)</Label>
            <Select
              value={props.groupId || 'all'}
              onValueChange={(v) => props.onGroupChange(v === 'all' ? '' : v)}
            >
              <SelectTrigger id="group">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All groups</SelectItem>
                {props.groupOptions.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {props.usesDates && (
          <div
            className={
              'flex flex-col gap-1.5 ' +
              (props.groupOptions.length > 0 ? 'lg:col-span-3' : 'lg:col-span-2')
            }
          >
            <Label>Window</Label>
            <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-background p-0.5">
              {PRESETS.map((p) => {
                const active = props.preset === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => props.onPresetChange(p.key)}
                    className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {props.usesDates && props.preset === 'custom' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="from">From (optional)</Label>
            <NativeDateInput
              id="from"
              value={props.customFrom}
              onChange={props.onCustomFromChange}
            />
            <span className="text-sm text-muted-foreground">Leave empty for from-beginning.</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="to">To</Label>
            <NativeDateInput id="to" value={props.customTo} onChange={props.onCustomToChange} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-3">
        <span className="mr-auto text-sm text-muted-foreground">
          About to run: <span className="font-medium text-foreground">{props.summaryLine}</span>
        </span>
        <Button
          type="button"
          size="sm"
          onClick={props.onRun}
          disabled={!props.canRun || props.pending}
          className="gap-1.5"
        >
          <Play className="h-3.5 w-3.5" />
          Run report
        </Button>
      </div>
    </div>
  );
}
