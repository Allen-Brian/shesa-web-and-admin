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

import { createSongGroup, deleteSongGroup, updateSongGroup } from '../actions/song-groups';
import { GroupRowCreator } from './group-row-creator';
import { GroupRowEditor } from './group-row-editor';
import { slugify } from '@shesa/domain/utils';
import type { GroupRow } from './song-widget-types';

interface Props {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly groups: readonly GroupRow[];
}

/** Compact CRUD for song groups. */
export function GroupManagerDialog({ open, onOpenChange, groups }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<GroupRow | null>(null);

  const nextSort = groups.length ? Math.max(...groups.map((g) => g.sortOrder)) + 10 : 10;

  const runSave = (id: string, name: string) => {
    if (!name.trim()) {
      toast.error('Group name is required.');
      return;
    }
    startTransition(async () => {
      const res = await updateSongGroup(id, { name, slug: slugify(name) });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success('Group renamed.');
      router.refresh();
    });
  };

  const runCreate = (name: string, reset: () => void) => {
    if (!name.trim()) {
      toast.error('Group name is required.');
      return;
    }
    startTransition(async () => {
      const res = await createSongGroup({
        name,
        slug: slugify(name),
        sortOrder: nextSort,
      });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success('Group created.');
      reset();
      router.refresh();
    });
  };

  const runDelete = (group: GroupRow) => {
    startTransition(async () => {
      const res = await deleteSongGroup(group.id);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(`Group "${group.name}" removed.`);
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
            Manage song groups
          </DialogTitle>
          <DialogDescription>
            Groupings for songs (Anthems, Chapter Songs, Cultural, …). A group can only be removed
            once every song under it has been moved or deleted.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {groups.map((g) => (
            <GroupRowEditor
              key={g.id}
              group={g}
              onSave={runSave}
              onDelete={() => setConfirm(g)}
              pending={pending}
            />
          ))}
          <GroupRowCreator onCreate={runCreate} pending={pending} />
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>

        <ConfirmDialog
          open={!!confirm}
          title={confirm ? `Delete "${confirm.name}"?` : ''}
          description="Removes the group. Fails if any song still points at it."
          confirmLabel="Delete group"
          onConfirm={() => confirm && runDelete(confirm)}
          onCancel={() => setConfirm(null)}
        />
      </DialogContent>
    </Dialog>
  );
}
