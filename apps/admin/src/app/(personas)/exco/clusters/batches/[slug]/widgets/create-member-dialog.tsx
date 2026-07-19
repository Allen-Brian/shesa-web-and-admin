'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  toast,
} from '@shesa/ui';

import { createBatchMember } from '../../batch-member-actions';

interface RefOption {
  readonly id: string;
  readonly name: string;
}

interface CreateMemberDialogProps {
  readonly batchScopeId: string;
  readonly batchSlug: string;
  readonly batchName: string;
  readonly entryYear: number;
  readonly houses: readonly RefOption[];
  readonly networks: readonly RefOption[];
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

/**
 * Create Member — direct-add dialog on the Batch cluster page. Batches
 * are the ONLY entry-point for adding members (2026-07-05 lock), so
 * this is the mainline flow for onboarding a single member (the bulk
 * path is the sibling Import dialog).
 */
export function CreateMemberDialog({
  batchScopeId,
  batchSlug,
  batchName,
  entryYear,
  houses,
  networks,
  open,
  onOpenChange,
}: CreateMemberDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [houseId, setHouseId] = useState(houses[0]?.id ?? '');
  const [networkId, setNetworkId] = useState(networks[0]?.id ?? '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const reset = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setHouseId(houses[0]?.id ?? '');
    setNetworkId(networks[0]?.id ?? '');
    setErrorMsg(null);
  };

  const closeAndReset = () => {
    onOpenChange(false);
    setTimeout(reset, 200);
  };

  const canSubmit =
    fullName.trim().length > 0 &&
    (email.trim().length > 0 || phone.trim().length > 0) &&
    !!houseId &&
    !!networkId;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setErrorMsg(null);
    startTransition(async () => {
      const result = await createBatchMember({
        batchScopeId,
        batchSlug,
        fullName: fullName.trim(),
        displayName: null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        houseScopeId: houseId,
        networkScopeId: networkId,
        entryYear,
        exitYear: entryYear + 7,
        currentCountry: null,
        currentRegionState: null,
        currentCity: null,
      });
      if (!result.ok) {
        setErrorMsg(result.message);
        toast.error(result.message);
        return;
      }
      const inviteHint = result.inviteSent
        ? ' Invite dispatched.'
        : email.trim()
          ? ' Invite failed — resend from Invites.'
          : '';
      toast.success(`${fullName.trim()} added to ${batchName}.${inviteHint}`);
      closeAndReset();
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : closeAndReset())}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Add member to {batchName}
          </DialogTitle>
          <DialogDescription>
            The member gets a display code in the shape {entryYear}-INITIALS-####. At least one of
            email or phone is required.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="fullName">Full name *</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Sarah Wanki Njumbe"
              maxLength={200}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sarah@example.com"
              maxLength={200}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+237 6XX XXX XXX"
              maxLength={40}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="house">House *</Label>
            <select
              id="house"
              value={houseId}
              onChange={(e) => setHouseId(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {houses.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="network">Network *</Label>
            <select
              id="network"
              value={networkId}
              onChange={(e) => setNetworkId(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {networks.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {errorMsg && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
            {errorMsg}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={closeAndReset}>
            Cancel
          </Button>
          <Button type="button" size="sm" disabled={!canSubmit || pending} onClick={handleSubmit}>
            <UserPlus className="h-4 w-4" />
            Create member
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
