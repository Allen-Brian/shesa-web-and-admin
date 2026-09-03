'use client';

import { Layers } from 'lucide-react';

import {
  Button,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shesa/ui';

import type { SectorRow } from './organ-widget-types';

interface Props {
  readonly sectors: readonly SectorRow[];
  readonly value: string;
  readonly onChange: (id: string) => void;
  readonly onManage: () => void;
}

/**
 * Sector picker for the organ form. Every organ MUST belong to a
 * sector (schema-level FK); when there are none we surface a nudge to
 * open the manager instead of the raw dropdown.
 */
export function SectorSelect({ sectors, value, onChange, onManage }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="or-sector">Sector</Label>
        <Button type="button" variant="ghost" size="sm" onClick={onManage}>
          <Layers className="h-3.5 w-3.5" />
          Manage sectors
        </Button>
      </div>

      {sectors.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
          No sectors yet — open Manage to create some (National, Europe, North America, …).
        </p>
      ) : (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger id="or-sector" className="h-9">
            <SelectValue placeholder="Pick a sector…" />
          </SelectTrigger>
          <SelectContent>
            {sectors.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
