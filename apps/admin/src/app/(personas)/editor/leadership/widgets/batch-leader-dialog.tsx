'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  toast,
} from '@shesa/ui';

import { createBatchLeader, updateBatchLeader } from '../actions/batch-leaders';
import { LeaderPhotoPicker } from './leader-photo-picker';
import type { BatchLeaderRow } from './leadership-widget-types';

interface Props {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly editing?: BatchLeaderRow | null;
  readonly nextSortOrder: number;
}

/** Add or edit a batch chair. Fields: batch label, name, photo. */
export function BatchLeaderDialog({ open, onOpenChange, editing, nextSortOrder }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [batch, setBatch] = useState(editing?.batch ?? '');
  const [name, setName] = useState(editing?.name ?? '');
  const [photoUrl, setPhotoUrl] = useState(editing?.photoUrl ?? '');

  const submit = () => {
    if (!batch.trim() || !name.trim()) {
      toast.error('Batch and name are required.');
      return;
    }
    startTransition(async () => {
      const payload = {
        batch,
        name,
        photoUrl,
        sortOrder: editing?.sortOrder ?? nextSortOrder,
      };
      const res = editing
        ? await updateBatchLeader(editing.id, payload)
        : await createBatchLeader(payload);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      toast.success(editing ? 'Batch leader updated.' : 'Batch leader added.');
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit batch chair' : 'Add batch chair'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="bl-batch">Batch</Label>
            <Input
              id="bl-batch"
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              placeholder="e.g. 2015"
              maxLength={20}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="bl-name">Name</Label>
            <Input
              id="bl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mr. Ndifon Ambe"
              maxLength={200}
            />
          </div>
          <LeaderPhotoPicker
            label="Photo"
            value={photoUrl ?? ''}
            onChange={setPhotoUrl}
            alt={name || 'Batch chair'}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            loading={pending}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={submit} loading={pending} disabled={pending}>
            {editing ? 'Save' : 'Add chair'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
