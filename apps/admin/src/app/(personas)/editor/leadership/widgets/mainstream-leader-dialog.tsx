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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@shesa/ui';

import { createMainstreamLeader, updateMainstreamLeader } from '../actions/mainstream-leaders';
import { LeaderPhotoPicker } from './leader-photo-picker';
import type { MainstreamLeaderRow, SectorRow } from './leadership-widget-types';

interface Props {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly sectors: readonly SectorRow[];
  readonly defaultSectorId: string | null;
  readonly editing?: MainstreamLeaderRow | null;
}

/**
 * Add or edit a single mainstream leader. Fields: sector, position,
 * name, location, photo URL. Photo is a URL for now — the CMS bucket
 * upload flow lands in a follow-up; typing the public URL is fine for
 * the walkthrough.
 */
export function MainstreamLeaderDialog({
  open,
  onOpenChange,
  sectors,
  defaultSectorId,
  editing,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sectorId, setSectorId] = useState(
    editing?.sectorId ?? defaultSectorId ?? sectors[0]?.id ?? '',
  );
  const [position, setPosition] = useState(editing?.position ?? '');
  const [name, setName] = useState(editing?.name ?? '');
  const [location, setLocation] = useState(editing?.location ?? '');
  const [photoUrl, setPhotoUrl] = useState(editing?.photoUrl ?? '');

  const submit = () => {
    if (!sectorId || !position.trim() || !name.trim()) {
      toast.error('Sector, position, and name are required.');
      return;
    }
    startTransition(async () => {
      const payload = {
        sectorId,
        position,
        name,
        location,
        photoUrl,
        sortOrder: editing?.sortOrder ?? 0,
      };
      const res = editing
        ? await updateMainstreamLeader(editing.id, payload)
        : await createMainstreamLeader(payload);
      if (!res.ok) {
        toast.error(res.message);
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
          <DialogTitle>{editing ? 'Edit leader' : 'Add leader'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="ml-sector">Sector</Label>
            <Select value={sectorId} onValueChange={setSectorId}>
              <SelectTrigger id="ml-sector">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sectors.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ml-position">Position / Title</Label>
            <Input
              id="ml-position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="e.g. National President"
              maxLength={200}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ml-name">Name</Label>
            <Input
              id="ml-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. Etonge Ambe"
              maxLength={200}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="ml-location">Location (optional)</Label>
            <Input
              id="ml-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Yaoundé · Cameroon"
              maxLength={200}
            />
          </div>
          <LeaderPhotoPicker
            label="Photo"
            value={photoUrl}
            onChange={setPhotoUrl}
            alt={name || 'Leader'}
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
            {editing ? 'Save' : 'Add leader'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
