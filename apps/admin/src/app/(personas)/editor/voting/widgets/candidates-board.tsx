'use client';

import {
  Badge,
  Button,
  ConfirmDialog,
  Dialog,
  DialogContent,
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
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';

import {
  createCandidate,
  removeCandidate,
  updateCandidate,
  type CandidateInput,
} from '../actions/voting-actions';
import type { AwardRow, CandidateRow, CategoryRow } from '../voting-types';

const BLANK: CandidateInput = {
  awardId: '',
  fullName: '',
  batchYear: null,
  branchLabel: null,
  description: null,
  photoUrl: null,
  sortOrder: 0,
  status: 'active',
};

/**
 * The ballot as voters will see it, award by award.
 *
 * Awards with no candidates are shown rather than hidden, and marked, because
 * the empty ones are the only rows anyone needs to act on — the full ones are
 * already done.
 */
export function CandidatesBoard({
  awards,
  categories,
  candidates,
  focusAwardId,
  phase,
}: {
  readonly awards: readonly AwardRow[];
  readonly categories: readonly CategoryRow[];
  readonly candidates: readonly CandidateRow[];
  readonly focusAwardId: string | null;
  readonly phase: string;
}) {
  const [editing, setEditing] = useState<{ id: string | null; input: CandidateInput } | null>(null);
  const [removing, setRemoving] = useState<CandidateRow | null>(null);
  const [pending, startTransition] = useTransition();

  const byAward = useMemo(() => {
    const m = new Map<string, CandidateRow[]>();
    for (const c of candidates) {
      const list = m.get(c.awardId);
      if (list) list.push(c);
      else m.set(c.awardId, [c]);
    }
    return m;
  }, [candidates]);

  const categoryName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const shown = focusAwardId ? awards.filter((a) => a.id === focusAwardId) : awards;

  const save = () => {
    if (!editing) return;
    startTransition(async () => {
      const res = editing.id
        ? await updateCandidate(editing.id, editing.input)
        : await createCandidate(editing.input);
      if (res.ok) {
        toast.success(editing.id ? 'Candidate updated.' : 'Candidate added to the ballot.');
        setEditing(null);
      } else {
        toast.error(res.message);
      }
    });
  };

  const confirmRemove = () => {
    if (!removing) return;
    const target = removing;
    setRemoving(null);
    startTransition(async () => {
      // Once voting has opened, removal is a withdrawal: deleting would
      // cascade into ballot_votes and silently rewrite votes already cast.
      const res = await removeCandidate(target.id, phase === 'voting' || phase === 'closed');
      if (res.ok) toast.success('Removed from the ballot.');
      else toast.error(res.message);
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {focusAwardId && (
        <a href="/editor/voting/candidates" className="text-sm text-primary hover:underline">
          ← Show every award
        </a>
      )}

      {shown.map((award) => {
        const list = (byAward.get(award.id) ?? []).filter((c) => c.status === 'active');
        const withdrawn = (byAward.get(award.id) ?? []).filter((c) => c.status === 'withdrawn');

        return (
          <div key={award.id} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{award.name}</p>
              {award.categoryId && (
                <span className="text-xs text-muted-foreground">
                  {categoryName.get(award.categoryId)}
                </span>
              )}
              {list.length === 0 && (
                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  Not on the ballot — nobody shortlisted
                </Badge>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="ml-auto"
                onClick={() => setEditing({ id: null, input: { ...BLANK, awardId: award.id } })}
              >
                <Plus className="h-3.5 w-3.5" /> Add candidate
              </Button>
            </div>

            {list.length === 0 && withdrawn.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No candidates. Promote a nomination, or add one by hand.
              </p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {[...list, ...withdrawn].map((c) => (
                  <div
                    key={c.id}
                    className={`flex flex-col gap-1.5 rounded-lg border p-3 ${
                      c.status === 'withdrawn' ? 'bg-muted/30 opacity-60' : 'bg-card'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{c.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {[c.batchYear, c.branchLabel].filter(Boolean).join(' · ') || '—'}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() =>
                            setEditing({
                              id: c.id,
                              input: {
                                awardId: c.awardId,
                                fullName: c.fullName,
                                batchYear: c.batchYear,
                                branchLabel: c.branchLabel,
                                description: c.description,
                                photoUrl: c.photoUrl,
                                sortOrder: c.sortOrder,
                                status: c.status,
                              },
                            })
                          }
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => setRemoving(c)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {c.description && (
                      <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                        {c.description}
                      </p>
                    )}
                    {c.status === 'withdrawn' && (
                      <Badge className="w-fit bg-muted text-muted-foreground">Withdrawn</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit candidate' : 'Add candidate'}</DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="flex flex-col gap-4">
              <Field label="Full name">
                <Input
                  value={editing.input.fullName}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      input: { ...editing.input, fullName: e.target.value },
                    })
                  }
                  maxLength={200}
                  autoFocus
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Batch year">
                  <Input
                    value={editing.input.batchYear ?? ''}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        input: {
                          ...editing.input,
                          batchYear: e.target.value
                            ? Number.parseInt(e.target.value.replace(/\D/g, ''), 10)
                            : null,
                        },
                      })
                    }
                    inputMode="numeric"
                    placeholder="1998"
                  />
                </Field>
                <Field label="Branch or chapter">
                  <Input
                    value={editing.input.branchLabel ?? ''}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        input: { ...editing.input, branchLabel: e.target.value },
                      })
                    }
                    maxLength={160}
                  />
                </Field>
              </div>

              <Field label="Citation — shown to voters on the ballot">
                <Textarea
                  value={editing.input.description ?? ''}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      input: { ...editing.input, description: e.target.value },
                    })
                  }
                  rows={4}
                  maxLength={2000}
                />
              </Field>

              <Field label="Photo URL (optional)">
                <Input
                  value={editing.input.photoUrl ?? ''}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      input: { ...editing.input, photoUrl: e.target.value },
                    })
                  }
                  placeholder="https://…"
                />
              </Field>

              {editing.id && (
                <Field label="Status">
                  <Select
                    value={editing.input.status}
                    onValueChange={(v) =>
                      setEditing({
                        ...editing,
                        input: { ...editing.input, status: v as CandidateInput['status'] },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">On the ballot</SelectItem>
                      <SelectItem value="withdrawn">Withdrawn</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="button" onClick={save} disabled={pending}>
                  {pending ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={removing !== null}
        title={`Remove ${removing?.fullName ?? ''} from the ballot?`}
        description={
          phase === 'voting' || phase === 'closed'
            ? 'Voting has started, so they will be marked withdrawn rather than deleted. Votes already cast for them stay on the record and stay in the tally.'
            : 'They are deleted outright. Nothing has been voted on yet, so nothing is lost.'
        }
        confirmLabel="Remove"
        onConfirm={confirmRemove}
        onCancel={() => setRemoving(null)}
      />
    </div>
  );
}

function Field({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
