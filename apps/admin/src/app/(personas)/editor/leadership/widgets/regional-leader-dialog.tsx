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

import type { RegionalLeaderInput } from '../actions/types';
import { LeaderPhotoPicker } from './leader-photo-picker';
import type { RegionalLeaderRow } from './types';

type CreateFn = (input: RegionalLeaderInput) => Promise<{ ok: boolean; message?: string }>;
type UpdateFn = (
  id: string,
  patch: Partial<RegionalLeaderInput>,
) => Promise<{ ok: boolean; message?: string }>;

interface Props {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly kind: 'branch' | 'diaspora';
  readonly editing?: RegionalLeaderRow | null;
  readonly nextSortOrder: number;
  readonly onCreate: CreateFn;
  readonly onUpdate: UpdateFn;
}

/**
 * Shared dialog for branch + diaspora leaders — same fields, wired to
 * different server actions via `onCreate` / `onUpdate` props.
 */
export function RegionalLeaderDialog({
  open,
  onOpenChange,
  kind,
  editing,
  nextSortOrder,
  onCreate,
  onUpdate,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [branchName, setBranchName] = useState(editing?.branchName ?? '');
  const [name, setName] = useState(editing?.name ?? '');
  const [region, setRegion] = useState(editing?.region ?? '');
  const [photoUrl, setPhotoUrl] = useState(editing?.photoUrl ?? '');

  const label = kind === 'branch' ? 'branch' : 'diaspora chapter';

  const submit = () => {
    if (!branchName.trim() || !name.trim()) {
      toast.error(`${kind === 'branch' ? 'Branch' : 'Chapter'} name and person name are required.`);
      return;
    }
    startTransition(async () => {
      const payload = {
        branchName,
        name,
        region,
        photoUrl,
        sortOrder: editing?.sortOrder ?? nextSortOrder,
      };
      const res = editing ? await onUpdate(editing.id, payload) : await onCreate(payload);
      if (!res.ok) {
        toast.error(res.message ?? 'Save failed.');
        return;
      }
      toast.success(editing ? 'Leader updated.' : 'Leader added.');
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? `Edit ${label} president` : `Add ${label} president`}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="rl-branch">
              {kind === 'branch' ? 'Branch / Chapter name' : 'Diaspora chapter name'}
            </Label>
            <Input
              id="rl-branch"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder={kind === 'branch' ? 'e.g. Shesa Buea' : 'e.g. Shesa DC'}
              maxLength={200}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="rl-name">President name</Label>
            <Input
              id="rl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Barr. Mbah Julius"
              maxLength={200}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="rl-region">Region / Location (optional)</Label>
            <Input
              id="rl-region"
              value={region ?? ''}
              onChange={(e) => setRegion(e.target.value)}
              placeholder={kind === 'branch' ? 'e.g. South-West Region' : 'e.g. USA'}
              maxLength={200}
            />
          </div>
          <LeaderPhotoPicker
            label="Photo"
            value={photoUrl ?? ''}
            onChange={setPhotoUrl}
            alt={name || 'President'}
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={submit} disabled={pending}>
            {editing ? 'Save' : 'Add president'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
