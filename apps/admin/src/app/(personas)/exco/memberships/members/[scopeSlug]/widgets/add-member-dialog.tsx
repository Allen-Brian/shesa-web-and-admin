'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

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
  toast,
} from '@shesa/ui';

import { getBrowserClient } from '@/lib/supabase-browser';

import { addMemberToScope } from '../../../add-member-actions';
import type { MembersPageScope } from './members-page';

interface AddMemberDialogProps {
  readonly scope: MembersPageScope;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

interface MemberOption {
  readonly id: string;
  readonly full_name: string;
  readonly email: string | null;
  readonly phone: string | null;
  readonly batch_name: string | null;
}

/**
 * Add member dialog — branch / autonomous chapter version.
 *
 * Flow:
 *   1. Debounced search across `core.members` (name, email, phone).
 *   2. Pick a member → server-side pre-check via `addMemberToScope`:
 *      - pending join here      → surface warning, don't create.
 *      - pending transfer here  → surface warning, don't create.
 *      - active membership elsewhere → server routes to transfer request.
 *      - otherwise → server creates the membership + seeds registration.
 *
 * For batches: the button in the parent triggers this dialog, but a
 * batch's "add member" flow is actually create-or-import — we render a
 * message pointing to that pathway (real implementation lands with the
 * imports epic).
 */
export function AddMemberDialog({ scope, open, onOpenChange }: AddMemberDialogProps) {
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [options, setOptions] = useState<readonly MemberOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  // Reset when dialog toggles.
  useEffect(() => {
    if (!open) {
      setQuery('');
      setDebounced('');
      setOptions([]);
    }
  }, [open]);

  // Debounce query → 200ms.
  useEffect(() => {
    if (!open) return;
    const h = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(h);
  }, [query, open]);

  const runSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setOptions([]);
      return;
    }
    setLoading(true);
    try {
      interface MemberSearchRow {
        id: string;
        full_name: string;
        email: string | null;
        phone: string | null;
        batch_scope_id: string;
      }
      interface BatchScopeRow {
        id: string;
        name: string;
      }

      const supabase = getBrowserClient();
      const { data } = await supabase
        .schema('core')
        .from('members')
        .select('id, full_name, email, phone, batch_scope_id')
        .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(20);

      const memberList = (data ?? []) as MemberSearchRow[];
      const batchIds = Array.from(new Set(memberList.map((m) => m.batch_scope_id)));
      const { data: batchScopes } = batchIds.length
        ? await supabase.schema('core').from('scopes').select('id, name').in('id', batchIds)
        : { data: [] as BatchScopeRow[] };
      const batchNameById = new Map(
        ((batchScopes ?? []) as BatchScopeRow[]).map((s) => [s.id, s.name]),
      );

      setOptions(
        memberList.map((m) => ({
          id: m.id,
          full_name: m.full_name,
          email: m.email,
          phone: m.phone,
          batch_name: batchNameById.get(m.batch_scope_id) ?? null,
        })),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void runSearch(debounced);
  }, [debounced, runSearch]);

  const handlePick = (memberId: string, memberName: string) => {
    startTransition(async () => {
      const result = await addMemberToScope({
        memberId,
        scopeId: scope.id,
      });
      if (result.ok === false) {
        toast.error(result.message);
        return;
      }
      if (result.kind === 'transferred') {
        toast.success(
          `${memberName} has an active membership elsewhere — a transfer request was created. Approve it in the Transfers panel.`,
        );
      } else {
        toast.success(`${memberName} added.`);
      }
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add member to {scope.name}</DialogTitle>
          <DialogDescription>
            Search an existing member by name, email, or phone. If they already belong to another
            branch, a transfer request will be created.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Label>Search</Label>
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search by name, email, or phone…"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList className="max-h-72">
              <CommandEmpty>
                {query.length < 2
                  ? 'Type at least two characters to search.'
                  : loading
                    ? 'Searching…'
                    : 'No member matches.'}
              </CommandEmpty>
              {options.length > 0 && (
                <CommandGroup
                  heading={`${options.length} match${options.length === 1 ? '' : 'es'}`}
                >
                  {options.map((m) => (
                    <CommandItem
                      key={m.id}
                      value={m.id}
                      onSelect={() => handlePick(m.id, m.full_name)}
                      className="flex flex-col items-start gap-0.5"
                    >
                      <div className="flex w-full items-center gap-2">
                        <Search className="h-3.5 w-3.5 opacity-60" />
                        <span className="text-sm font-medium">{m.full_name}</span>
                      </div>
                      <div className="pl-5 text-xs text-muted-foreground">
                        {[m.batch_name, m.email, m.phone].filter(Boolean).join(' · ') || '—'}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            loading={pending}
            disabled={pending}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
