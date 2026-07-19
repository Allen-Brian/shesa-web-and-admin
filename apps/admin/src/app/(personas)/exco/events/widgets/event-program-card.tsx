'use client';

import { Plus } from 'lucide-react';

import { Button, Card, CardContent, CardHeader, CardTitle } from '@shesa/ui';

import { ProgramItemCard, type ProgramItem } from './program-item-card';

interface EventProgramCardProps {
  readonly items: readonly ProgramItem[];
  readonly onAdd: () => void;
  readonly onUpdate: (id: string, patch: Partial<Omit<ProgramItem, 'id'>>) => void;
  readonly onMove: (id: string, delta: -1 | 1) => void;
  readonly onRemove: (id: string) => void;
}

export function EventProgramCard({
  items,
  onAdd,
  onUpdate,
  onMove,
  onRemove,
}: EventProgramCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Program</CardTitle>
        <p className="text-xs text-muted-foreground">
          Structured agenda rendered as a timeline on the detail page.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {items.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
            <span>No agenda items yet.</span>
            <span className="text-xs">
              Add sessions like &quot;Opening Remarks&quot; or &quot;Panel: Fintech in CM&quot; with
              a time.
            </span>
          </div>
        )}
        {items.map((item, idx) => (
          <ProgramItemCard
            key={item.id}
            index={idx}
            total={items.length}
            item={item}
            onChange={(patch) => onUpdate(item.id, patch)}
            onMove={(delta) => onMove(item.id, delta)}
            onRemove={() => onRemove(item.id)}
          />
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start gap-1"
          onClick={onAdd}
        >
          <Plus className="h-4 w-4" />
          Add program item
        </Button>
      </CardContent>
    </Card>
  );
}
