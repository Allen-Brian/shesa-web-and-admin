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
  Textarea,
  toast,
} from '@shesa/ui';

import type { RegionalLeaderInput } from '../actions/leadership-action-types';
import { LeaderPhotoPicker } from './leader-photo-picker';
import type { RegionalLeaderRow } from './leadership-widget-types';

type CreateFn = (input: RegionalLeaderInput) => Promise<{ ok: boolean; message?: string }>;
type UpdateFn = (
  id: string,
  patch: Partial<RegionalLeaderInput>,
) => Promise<{ ok: boolean; message?: string }>;

/** Just enough of an organ to offer it in the picker. */
export interface OrganOption {
  readonly id: string;
  readonly name: string;
}

interface Props {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly kind: 'branch' | 'diaspora';
  readonly editing?: RegionalLeaderRow | null;
  readonly nextSortOrder: number;
  readonly organs: readonly OrganOption[];
  readonly onCreate: CreateFn;
  readonly onUpdate: UpdateFn;
}

/**
 * The Select has no "none" value of its own, so the absence of a branch
 * needs a sentinel. Empty string is not usable — Radix treats it as
 * "unset" and the item becomes unselectable.
 */
const NO_ORGAN = '__none__';

/**
 * Shared dialog for branch + diaspora leaders — same fields, wired to
 * different server actions via `onCreate` / `onUpdate` props.
 *
 * Every label here used to say "president", because the table could hold
 * nothing else. A branch may now have a president and a vice president,
 * so the role is a field and the copy follows it.
 */
const ROLE_LABELS: Record<string, string> = {
  president: 'President',
  vice_president: 'Vice President',
};
export function RegionalLeaderDialog({
  open,
  onOpenChange,
  kind,
  editing,
  nextSortOrder,
  organs,
  onCreate,
  onUpdate,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [branchName, setBranchName] = useState(editing?.branchName ?? '');
  const [name, setName] = useState(editing?.name ?? '');
  const [region, setRegion] = useState(editing?.region ?? '');
  const [photoUrl, setPhotoUrl] = useState(editing?.photoUrl ?? '');
  const [role, setRole] = useState(editing?.role ?? 'president');
  const [profession, setProfession] = useState(editing?.profession ?? '');
  const [bio, setBio] = useState(editing?.bio ?? '');
  const [email, setEmail] = useState(editing?.email ?? '');
  const [phone, setPhone] = useState(editing?.phone ?? '');
  const [organId, setOrganId] = useState(editing?.organId ?? NO_ORGAN);

  const label = kind === 'branch' ? 'branch' : 'diaspora chapter';
  const roleLabel = ROLE_LABELS[role] ?? 'Leader';

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
        role,
        profession,
        bio,
        email,
        phone,
        organId: organId === NO_ORGAN ? null : organId,
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
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${label} leader` : `Add ${label} leader`}</DialogTitle>
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
            <Label htmlFor="rl-role">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger id="rl-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="president">President</SelectItem>
                <SelectItem value="vice_president">Vice President</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="rl-name">{roleLabel} name</Label>
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
            alt={name || roleLabel}
          />

          {/* An explicit link rather than matching `branchName` against
              the organ's name: the two are typed on different screens and
              already differ in case and wording, so a text join would
              work right up until it silently did not. */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="rl-organ">Branch page (optional)</Label>
            <Select value={organId} onValueChange={setOrganId}>
              <SelectTrigger id="rl-organ">
                <SelectValue placeholder="Not linked" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_ORGAN}>Not linked</SelectItem>
                {organs.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Links this person to an organ, so they appear on its page and the profile can link
              back to it.
            </p>
          </div>

          <div className="flex flex-col gap-2 border-t pt-4">
            <Label htmlFor="rl-profession">Profession (optional)</Label>
            <Input
              id="rl-profession"
              value={profession ?? ''}
              onChange={(e) => setProfession(e.target.value)}
              placeholder="e.g. Barrister, Civil Engineer"
              maxLength={200}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="rl-bio">Biography (optional)</Label>
            <Textarea
              id="rl-bio"
              value={bio ?? ''}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A short profile, shown when a visitor opens this person on the Leadership page."
              rows={6}
              maxLength={4000}
            />
            <p className="text-xs text-muted-foreground">
              {(bio ?? '').length} / 4000. Blank lines are kept as paragraph breaks.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="rl-email">Email (optional)</Label>
              <Input
                id="rl-email"
                type="email"
                value={email ?? ''}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                maxLength={320}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="rl-phone">Phone (optional)</Label>
              <Input
                id="rl-phone"
                value={phone ?? ''}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+237 6XX XXX XXX"
                maxLength={40}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Email and phone are published on the public website. Only add them where the person has
            agreed to that.
          </p>
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
            {editing ? 'Save' : `Add ${roleLabel.toLowerCase()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
