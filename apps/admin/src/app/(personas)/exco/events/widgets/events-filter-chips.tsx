'use client';

import { X } from 'lucide-react';

import { Badge, Button } from '@shesa/ui';

import { EVENT_TYPE_OPTIONS, MODE_OPTIONS } from './list-constants';
import type { ModeFilter } from './list-types';

interface EventsFilterChipsProps {
  readonly modeValue: ModeFilter;
  readonly typeValues: readonly string[];
  readonly onClearMode: () => void;
  readonly onRemoveType: (t: string) => void;
  readonly onClearAll: () => void;
}

export function EventsFilterChips({
  modeValue,
  typeValues,
  onClearMode,
  onRemoveType,
  onClearAll,
}: EventsFilterChipsProps) {
  const modeLabel =
    modeValue === 'all' ? null : MODE_OPTIONS.find((m) => m.value === modeValue)?.label;

  const anyActive = modeValue !== 'all' || typeValues.length > 0;
  if (!anyActive) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {modeLabel && (
        <Badge variant="secondary" className="gap-1 pr-1 text-xs">
          <span className="text-muted-foreground">Mode:</span> {modeLabel}
          <button
            type="button"
            onClick={onClearMode}
            className="rounded-sm p-0.5 hover:bg-background"
            aria-label="Clear mode filter"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      )}
      {typeValues.map((v) => {
        const t = EVENT_TYPE_OPTIONS.find((x) => x.value === v);
        return (
          <Badge key={v} variant="secondary" className="gap-1 pr-1 text-xs">
            <span className="text-muted-foreground">Type:</span> {t?.label ?? v}
            <button
              type="button"
              onClick={() => onRemoveType(v)}
              className="rounded-sm p-0.5 hover:bg-background"
              aria-label={`Remove ${t?.label ?? v}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        );
      })}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 text-xs text-muted-foreground"
        onClick={onClearAll}
      >
        Clear all
      </Button>
    </div>
  );
}
