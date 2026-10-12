'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
  toast,
} from '@shesa/ui';

import { createPositionCatalogEntry } from '@/app/(personas)/exco/clusters/branches/governance-actions';

export type PositionScopeType = 'mainstream' | 'branch' | 'chapter' | 'batch';

interface CreatePositionDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly scopeType: PositionScopeType;
  readonly nextSortOrder: number;
}

/**
 * Mainstream-admin-only dialog to add a new entry to the position
 * catalog for a given scope_type. The catalog is federation-wide, so
 * one row here shows up on every branch's / chapter's / batch's
 * governance table simultaneously.
 */
export function CreatePositionDialog({
  open,
  onOpenChange,
  scopeType,
  nextSortOrder,
}: CreatePositionDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder, setSortOrder] = useState<string>(String(nextSortOrder));

  const reset = () => {
    setName('');
    setDescription('');
    setSortOrder(String(nextSortOrder));
  };

  const submit = () => {
    if (!name.trim()) {
      toast.error('Name is required.');
      return;
    }
    startTransition(async () => {
      const result = await createPositionCatalogEntry({
        scopeType,
        name: name.trim(),
        description: description.trim() || null,
        sortOrder: Number.parseInt(sortOrder, 10) || 0,
      });
      if (!result.ok) {
        toast.error(result.message ?? 'Could not create the position.');
        return;
      }
      toast.success(`${name.trim()} added to the ${scopeType} catalog.`);
      onOpenChange(false);
      reset();
      router.refresh();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New position
          </DialogTitle>
          <DialogDescription>
            Federation-wide — appears on every {scopeType}&apos;s governance table.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pos-name">Name</Label>
            <Input
              id="pos-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sports Coordinator"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pos-description">Description</Label>
            <Textarea
              id="pos-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="One line — what does this position do?"
              rows={2}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pos-sort">Sort order</Label>
            <Input
              id="pos-sort"
              type="number"
              min={0}
              step={10}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
            <span className="text-[11px] text-muted-foreground">
              Lower numbers surface first. Existing seed positions use 10, 20, 30, …
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" loading={pending} disabled={pending} onClick={submit}>
            {pending ? 'Adding…' : 'Add position'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
