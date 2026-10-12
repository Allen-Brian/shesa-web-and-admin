'use client';

import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Input } from '@shesa/ui';
import { Check, Search, UserPlus } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { NomineeRow } from '../voting-types';

/**
 * Pick the person a set of rows should end up under.
 *
 * Used for both directions of the same decision: moving nominations into a
 * group, and choosing which of several groups survives a merge. The list is
 * the same, the counts matter in both cases, and two near-identical dialogs
 * would drift apart.
 *
 * `newNameSuggestion` turns on the "start a new person" row. It exists for
 * the commonest case — a spelling nobody has used before — where the
 * alternative is typing the name into the add-by-hand box on another screen
 * and then coming back to find the nomination again.
 */
export function NomineePickerDialog({
  open,
  onOpenChange,
  title,
  description,
  nominees,
  excludeIds = [],
  newNameSuggestion,
  confirmLabel = 'Move',
  pending,
  onPick,
  onCreateNew,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly description: string;
  readonly nominees: readonly NomineeRow[];
  /** Rows that cannot be the destination — the ones being moved or absorbed. */
  readonly excludeIds?: readonly string[];
  readonly newNameSuggestion?: string;
  readonly confirmLabel?: string;
  readonly pending?: boolean;
  readonly onPick: (nomineeId: string) => void;
  readonly onCreateNew?: (name: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [newName, setNewName] = useState(newNameSuggestion ?? '');
  const [creating, setCreating] = useState(false);

  const excluded = useMemo(() => new Set(excludeIds), [excludeIds]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return nominees
      .filter((n) => !excluded.has(n.id))
      .filter((n) => !q || n.displayName.toLowerCase().includes(q));
  }, [excluded, nominees, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">{description}</p>

          <div className="flex items-center gap-2 rounded-md border px-3">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people…"
              autoFocus
              className="w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          <div className="max-h-[320px] overflow-y-auto rounded-md border">
            {shown.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                {nominees.length === 0
                  ? 'Nobody has been grouped for this award yet.'
                  : 'Nobody matches that.'}
              </p>
            ) : (
              <ul>
                {shown.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(n.id)}
                      className={`flex w-full items-center justify-between gap-3 border-b px-3 py-2.5 text-left text-sm transition-colors last:border-b-0 ${
                        selected === n.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {selected === n.id && <Check className="h-3.5 w-3.5" aria-hidden />}
                        <span className="font-medium">{n.displayName}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {n.nominationCount} {n.nominationCount === 1 ? 'nomination' : 'nominations'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {onCreateNew && (
            <div className="rounded-md border bg-muted/30 p-3">
              {creating ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Their name"
                    maxLength={200}
                    autoFocus
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending || newName.trim().length < 2}
                    onClick={() => onCreateNew(newName.trim())}
                  >
                    Create
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setCreating(false)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <UserPlus className="h-3.5 w-3.5" aria-hidden />
                  Start a new person
                  {newNameSuggestion ? ` — “${newNameSuggestion}”` : ''}
                </button>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={pending || !selected}
              onClick={() => selected && onPick(selected)}
            >
              {pending ? 'Working…' : confirmLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
