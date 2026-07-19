'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Info, Search } from 'lucide-react';

import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@shesa/ui';

import { grantRole } from '@/app/(personas)/exco/clusters/branches/governance-actions';

import { GOVERNANCE_ROLE_OPTIONS } from './role-options';
import type { GovernanceMemberPickerRow } from './assign-position-dialog';

interface GrantRoleDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly scopeId: string;
  readonly scopeLabel: string;
  readonly members: readonly GovernanceMemberPickerRow[];
  /** Pre-select a member. Used by the positions table's Grant-role action. */
  readonly initialMemberId?: string | null;
}

export function GrantRoleDialog({
  open,
  onOpenChange,
  scopeId,
  scopeLabel,
  members,
  initialMemberId,
}: GrantRoleDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [memberOpen, setMemberOpen] = useState(false);
  const [memberId, setMemberId] = useState<string | null>(initialMemberId ?? null);
  const [roleKey, setRoleKey] = useState<string>(GOVERNANCE_ROLE_OPTIONS[0]!.key);

  // Only members with linked auth accounts can hold a role.
  const eligible = useMemo(() => members.filter((m) => m.hasAccount && m.authUserId), [members]);
  const picked = useMemo(
    () => eligible.find((m) => m.memberId === memberId) ?? null,
    [eligible, memberId],
  );

  const submit = () => {
    if (!picked?.authUserId) {
      toast.error('Pick a member with a linked account.');
      return;
    }
    startTransition(async () => {
      const result = await grantRole({
        scopeId,
        userId: picked.authUserId!,
        roleKey,
      });
      if (!result.ok) {
        toast.error(result.message ?? 'Could not grant.');
        return;
      }
      toast.success(`Granted ${roleKey} to ${picked.fullName}.`);
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Grant portal access</DialogTitle>
          <DialogDescription>
            {scopeLabel} · pick a member with a linked account and the role they should hold.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label>Member</Label>
            <Popover open={memberOpen} onOpenChange={setMemberOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full justify-between px-3"
                >
                  <span className="truncate">{picked?.fullName ?? 'Pick a member'}</span>
                  <Search className="h-4 w-4 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="p-0"
                style={{ width: 'var(--radix-popover-trigger-width)' }}
              >
                <Command>
                  <CommandInput placeholder="Search members with accounts…" />
                  <CommandList className="max-h-72">
                    <CommandEmpty>No eligible member.</CommandEmpty>
                    <CommandGroup>
                      {eligible.map((m) => (
                        <CommandItem
                          key={m.memberId}
                          value={m.memberId}
                          keywords={[m.fullName]}
                          onSelect={() => {
                            setMemberId(m.memberId);
                            setMemberOpen(false);
                          }}
                        >
                          {m.fullName}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {eligible.length === 0 && (
              <div className="flex items-start gap-2 rounded-md bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  No member has a linked auth account. Invite an account first — a role can't be
                  granted otherwise.
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label>Role</Label>
            <Select value={roleKey} onValueChange={setRoleKey}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GOVERNANCE_ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.key} value={r.key}>
                    {r.label} <span className="text-muted-foreground">— {r.key}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={pending || !picked} onClick={submit}>
              {pending ? 'Granting…' : 'Grant'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
