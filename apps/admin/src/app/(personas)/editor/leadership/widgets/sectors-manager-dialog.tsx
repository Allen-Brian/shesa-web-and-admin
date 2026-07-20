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

import { createSector, deleteSector, updateSector } from '../actions/sectors';
import { SectorRowCreator } from './sector-row-creator';
import { SectorRowEditor } from './sector-row-editor';
import type { SectorRow } from './types';

interface Props {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly sectors: readonly SectorRow[];
}

/**
 * Compact sectors CRUD launched from the Mainstream tab's toolbar. The
 * sector set is small (~4-6 entries) so a full DataTable would be
 * overkill; a stacked editable list is the right density.
 *
 * Delete cascades to leaders — the confirm dialog spells that out
 * inline with the current leader count.
 */
export function SectorsManagerDialog({ open, onOpenChange, sectors }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<SectorRow | null>(null);

  const nextSort = sectors.length ? Math.max(...sectors.map((s) => s.sortOrder)) + 10 : 10;

  const runSave = (id: string, name: string, caption: string) => {
    if (!name.trim()) {
      toast.error('Sector name is required.');
      return;
    }
    startTransition(async () => {
      const res = await updateSector(id, { name, caption });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success('Sector renamed.');
      router.refresh();
    });
  };

  const runCreate = (name: string, caption: string, reset: () => void) => {
    if (!name.trim()) {
      toast.error('Sector name is required.');
      return;
    }
    startTransition(async () => {
      const res = await createSector({ name, caption, sortOrder: nextSort });
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
      const res = await deleteSector(sector.id);
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Manage sectors
          </DialogTitle>
          <DialogDescription>
            Group headings for the mainstream slate: Executive, Council Portfolios, and so on.
            Deleting a sector also removes its leaders.
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
          description={
            confirm
              ? `Removes the sector and its ${confirm.leaders.length} leader${
                  confirm.leaders.length === 1 ? '' : 's'
                }. This can't be undone.`
              : ''
          }
          confirmLabel="Delete sector"
          onConfirm={() => confirm && runDelete(confirm)}
          onCancel={() => setConfirm(null)}
        />
      </DialogContent>
    </Dialog>
  );
}
