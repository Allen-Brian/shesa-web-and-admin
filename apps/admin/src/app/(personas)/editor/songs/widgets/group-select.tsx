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

import type { GroupRow } from './song-widget-types';

interface Props {
  readonly groups: readonly GroupRow[];
  readonly value: string;
  readonly onChange: (id: string) => void;
  readonly onManage: () => void;
}

export function GroupSelect({ groups, value, onChange, onManage }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="sg-group">Group</Label>
        <Button type="button" variant="ghost" size="sm" onClick={onManage}>
          <Layers className="h-3.5 w-3.5" />
          Manage groups
        </Button>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
          No groups yet — open Manage to create some (Anthems, Chapter Songs, Cultural, …).
        </p>
      ) : (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger id="sg-group" className="h-9">
            <SelectValue placeholder="Pick a group…" />
          </SelectTrigger>
          <SelectContent>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
