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
  Switch,
  toast,
} from '@shesa/ui';

import { assignPositionWithRole } from '../../governance-actions';

import type { GovernanceMemberPickerRow, PositionCatalogRow } from './detail-view';

const BRANCH_ROLE_OPTIONS = [
  { key: 'branch_admin', label: 'Branch Admin' },
  { key: 'branch_finance', label: 'Branch Finance' },
];

/**
 * Suggested role per position, per the 2026-07-03 governance spec:
 *   - President                    → branch_admin
 *   - Financial Secretary          → branch_finance
 *   - Treasurer                    → branch_finance
 *   - Everything else              → none (leave the toggle off)
 * The suggestion is a UI default; the officer can override.
 */
const SUGGESTED_ROLE_BY_POSITION: Record<string, string | undefined> = {
  President: 'branch_admin',
  'Financial Secretary': 'branch_finance',
  Treasurer: 'branch_finance',
};

interface AssignPositionDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly scopeId: string;
  readonly scopeLabel: string;
  readonly position: PositionCatalogRow;
  readonly members: readonly GovernanceMemberPickerRow[];
}

export function AssignPositionDialog({
  open,
  onOpenChange,
  scopeId,
  scopeLabel,
  position,
  members,
}: AssignPositionDialogProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [memberOpen, setMemberOpen] = useState(false);
  const [memberId, setMemberId] = useState<string | null>(null);
  const suggested = SUGGESTED_ROLE_BY_POSITION[position.name];
  const [grantRole, setGrantRole] = useState<boolean>(!!suggested);
  const [roleKey, setRoleKey] = useState<string>(suggested ?? 'branch_admin');

  const picked = useMemo(
    () => members.find((m) => m.memberId === memberId) ?? null,
    [members, memberId],
  );
  const roleAllowed = !!picked?.hasAccount;

  const submit = () => {
    if (!memberId || !picked) {
      toast.error('Pick a member first.');
      return;
    }
    startTransition(async () => {
      const result = await assignPositionWithRole({
        scopeId,
        memberId,
        positionCatalogId: position.id,
        alsoGrantRole:
          grantRole && roleAllowed && picked.authUserId
            ? { userId: picked.authUserId, roleKey }
            : null,
      });
      if (!result.ok) {
        toast.error(result.message ?? 'Could not assign.');
        return;
      }
      if (result.warning) toast.warning(result.warning);
      toast.success(`${picked.fullName} assigned as ${position.name}.`);
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign {position.name}</DialogTitle>
          <DialogDescription>
            {scopeLabel} · pick a branch member to hold this position.
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
                  <span className="truncate">{picked?.fullName ?? 'Pick a branch member'}</span>
                  <Search className="h-4 w-4 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="p-0"
                style={{ width: 'var(--radix-popover-trigger-width)' }}
              >
                <Command>
                  <CommandInput placeholder="Search members…" />
                  <CommandList className="max-h-72">
                    <CommandEmpty>No member matches.</CommandEmpty>
                    <CommandGroup>
                      {members.map((m) => (
                        <CommandItem
                          key={m.memberId}
                          value={m.fullName}
                          onSelect={() => {
                            setMemberId(m.memberId);
                            setMemberOpen(false);
                          }}
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="truncate">{m.fullName}</span>
                          {!m.hasAccount && (
                            <span className="text-xs text-muted-foreground">no account</span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="grantRole" className="cursor-pointer">
                  Also grant portal access
                </Label>
                <p className="text-xs text-muted-foreground">
                  {suggested
                    ? `Suggested for ${position.name}: ${suggested.replace('_', ' ')}.`
                    : 'Optional — no role suggestion for this position.'}
                </p>
              </div>
              <Switch
                id="grantRole"
                checked={grantRole && roleAllowed}
                disabled={!roleAllowed}
                onCheckedChange={setGrantRole}
              />
            </div>

            {grantRole && roleAllowed && (
              <Select value={roleKey} onValueChange={setRoleKey}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BRANCH_ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.key} value={r.key}>
                      {r.label} <span className="text-muted-foreground">— {r.key}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {picked && !roleAllowed && (
              <div className="flex items-start gap-2 rounded-md bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  {picked.fullName} has no linked account yet, so a role can't be granted. Link an
                  account to the member first, then grant the role separately.
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={pending || !picked} onClick={submit}>
              {pending ? 'Assigning…' : 'Assign'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
