'use client';

import Image from 'next/image';
import { Badge, Button, ConfirmDialog, toast } from '@shesa/ui';
import { Pencil, Plus, Trash2, UserRound } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';

import { removeCandidate, type CandidateInput } from '../actions/voting-actions';
import type { AwardRow, CandidateRow, CategoryRow } from '../voting-types';

import { BLANK_CANDIDATE, CandidateDialog } from './candidate-dialog';

/**
 * The ballot as voters will see it, award by award.
 *
 * Awards with no candidates are shown rather than hidden, and marked, because
 * the empty ones are the only rows anyone needs to act on — the full ones are
 * already done. An award with nobody on it is dropped from the public ballot
 * entirely, so it cannot be allowed to look like an ordinary empty list.
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

  const editingAward = editing ? awards.find((a) => a.id === editing.input.awardId) : null;

  return (
    <div className="flex flex-col gap-6">
      {focusAwardId && (
        <a href="/editor/voting/candidates" className="text-sm text-primary hover:underline">
          ← Show every award
        </a>
      )}

      {shown.map((award) => {
        const all = byAward.get(award.id) ?? [];
        const active = all.filter((c) => c.status === 'active');
        const withdrawn = all.filter((c) => c.status === 'withdrawn');

        return (
          <div key={award.id} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{award.name}</p>
              {award.categoryId && (
                <span className="text-xs text-muted-foreground">
                  {categoryName.get(award.categoryId)}
                </span>
              )}
              {active.length === 0 && (
                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  Not on the ballot — nobody shortlisted
                </Badge>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="ml-auto"
                onClick={() =>
                  setEditing({ id: null, input: { ...BLANK_CANDIDATE, awardId: award.id } })
                }
              >
                <Plus className="h-3.5 w-3.5" /> Add candidate
              </Button>
            </div>

            {all.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No candidates.{' '}
                <a
                  href={`/editor/voting/nominees?award=${award.id}`}
                  className="text-primary hover:underline"
                >
                  Pick one from the nominees
                </a>
                , or add a name by hand.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {[...active, ...withdrawn].map((c) => (
                  <div
                    key={c.id}
                    className={`flex gap-3 rounded-lg border p-3 ${
                      c.status === 'withdrawn' ? 'bg-muted/30 opacity-60' : 'bg-card'
                    }`}
                  >
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                      {c.photoUrl ? (
                        <Image
                          src={c.photoUrl}
                          alt={c.fullName}
                          fill
                          sizes="64px"
                          className="object-cover object-top"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                          <UserRound className="h-6 w-6" aria-hidden />
                        </div>
                      )}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{c.fullName}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {[c.profession, c.batchYear, c.branchLabel]
                              .filter(Boolean)
                              .join(' · ') || '—'}
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
                                  nomineeId: c.nomineeId,
                                  fullName: c.fullName,
                                  batchYear: c.batchYear,
                                  branchLabel: c.branchLabel,
                                  profession: c.profession,
                                  accomplishments: c.accomplishments,
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

                      {/* A ballot entry with no accomplishments is a name and
                          nothing else to vote on, so the gap is called out
                          rather than rendered as empty space. */}
                      {c.accomplishments ? (
                        <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                          {c.accomplishments}
                        </p>
                      ) : (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          No works accomplished written yet.
                        </p>
                      )}

                      {c.status === 'withdrawn' && (
                        <Badge className="w-fit bg-muted text-muted-foreground">Withdrawn</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {editing && (
        <CandidateDialog
          open
          onOpenChange={(o) => !o && setEditing(null)}
          candidateId={editing.id}
          input={editing.input}
          onInput={(input) => setEditing({ ...editing, input })}
          awardName={editingAward?.name}
        />
      )}

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

      {pending && <span className="sr-only">Saving…</span>}
    </div>
  );
}
