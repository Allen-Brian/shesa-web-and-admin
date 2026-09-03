'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Layers } from 'lucide-react';

import {
  Button,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  toast,
} from '@shesa/ui';

import { createOrganSector, deleteOrganSector, updateOrganSector } from '../actions/organ-sectors';
import { slugify } from '@shesa/domain/utils';
import { SectorRowCreator } from './sector-row-creator';
import { SectorRowEditor } from './sector-row-editor';
import type { SectorRow } from './types';

interface Props {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly sectors: readonly SectorRow[];
}

/** Compact CRUD for organ sectors. */
export function SectorManagerDialog({ open, onOpenChange, sectors }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<SectorRow | null>(null);

  const nextSort = sectors.length ? Math.max(...sectors.map((s) => s.sortOrder)) + 10 : 10;

  const runSave = (id: string, name: string) => {
    if (!name.trim()) {
      toast.error('Sector name is required.');
      return;
    }
    startTransition(async () => {
      const res = await updateOrganSector(id, { name, slug: slugify(name) });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success('Sector renamed.');
      router.refresh();
    });
  };

  const runCreate = (name: string, reset: () => void) => {
    if (!name.trim()) {
      toast.error('Sector name is required.');
      return;
    }
    startTransition(async () => {
      const res = await createOrganSector({
        name,
        slug: slugify(name),
        sortOrder: nextSort,
      });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success('Sector created.');
      reset();
      router.refresh();
    });
  };

  const runDelete = (sector: SectorRow) => {
    startTransition(async () => {
      const res = await deleteOrganSector(sector.id);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(`Sector "${sector.name}" removed.`);
      setConfirm(null);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Manage sectors
          </DialogTitle>
          <DialogDescription>
            Top-level groupings for organs (National (Cameroon), Europe, …). A sector can only be
            removed once every organ under it has been moved or deleted.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {sectors.map((s) => (
            <SectorRowEditor
              key={s.id}
              sector={s}
              onSave={runSave}
              onDelete={() => setConfirm(s)}
              pending={pending}
            />
          ))}
          <SectorRowCreator onCreate={runCreate} pending={pending} />
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>

        <ConfirmDialog
          open={!!confirm}
          title={confirm ? `Delete "${confirm.name}"?` : ''}
          description="Removes the sector. Fails if any organ still points at it."
          confirmLabel="Delete sector"
          onConfirm={() => confirm && runDelete(confirm)}
          onCancel={() => setConfirm(null)}
        />
      </DialogContent>
    </Dialog>
  );
}
