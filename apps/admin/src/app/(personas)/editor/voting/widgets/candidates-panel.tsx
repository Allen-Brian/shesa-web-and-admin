'use client';

import Image from 'next/image';
import { Badge, Button, ConfirmDialog, toast } from '@shesa/ui';
import { Pencil, Plus, Trash2, UserRound } from 'lucide-react';
import { useState, useTransition } from 'react';

import { removeCandidate, type CandidateInput } from '../actions/voting-actions';
import type { AwardsPhase, CandidateRow } from '../voting-types';

import { BLANK_CANDIDATE, CandidateDialog } from './candidate-dialog';

/**
 * One award's ballot — exactly what voters will see under it.
 *
 * Most entries arrive from the Nominees tab, where a person is promoted with
 * every citation written about them to hand. Adding by hand exists because
 * the secretariat may put forward a name nobody nominated, and the briefing
 * does not forbid it.
 */
export function CandidatesPanel({
  awardId,
  awardName,
  candidates,
  phase,
}: {
  readonly awardId: string;
  readonly awardName: string;
  readonly candidates: readonly CandidateRow[];
  readonly phase: AwardsPhase;
}) {
  const [editing, setEditing] = useState<{ id: string | null; input: CandidateInput } | null>(null);
  const [removing, setRemoving] = useState<CandidateRow | null>(null);
  const [pending, startTransition] = useTransition();

  const active = candidates.filter((c) => c.status === 'active');
  const withdrawn = candidates.filter((c) => c.status === 'withdrawn');
  const voting = phase === 'voting' || phase === 'closed';

  const confirmRemove = () => {
    if (!removing) return;
    const target = removing;
    setRemoving(null);
    startTransition(async () => {
      // Once voting has opened, removal is a withdrawal: deleting would
      // cascade into ballot_votes and silently rewrite votes already cast.
      const res = await removeCandidate(target.id, voting);
      if (res.ok) toast.success('Removed from the ballot.');
      else toast.error(res.message);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {active.length === 0 && (
          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400">
            Not on the ballot — nobody shortlisted
          </Badge>
        )}
        <Button
          type="button"
          className="ml-auto"
          onClick={() => setEditing({ id: null, input: { ...BLANK_CANDIDATE, awardId } })}
        >
          <Plus className="h-3.5 w-3.5" /> Add candidate
        </Button>
      </div>

      {candidates.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-12 text-center">
          <p className="text-sm font-medium text-foreground">Nobody on the ballot yet</p>
          <p className="max-w-md text-sm text-muted-foreground">
            An award with no candidates is not shown to voters at all. Promote someone from the
            Nominees tab, or add a name by hand.
          </p>
        </div>
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
                      {[c.profession, c.batchYear, c.branchLabel].filter(Boolean).join(' · ') ||
                        '—'}
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
                    nothing else to vote on, so the gap is called out rather
                    than rendered as empty space. */}
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

      {editing && (
        <CandidateDialog
          open
          onOpenChange={(o) => !o && setEditing(null)}
          candidateId={editing.id}
          input={editing.input}
          onInput={(input) => setEditing({ ...editing, input })}
          awardName={awardName}
        />
      )}

      <ConfirmDialog
        open={removing !== null}
        title={`Remove ${removing?.fullName ?? ''} from the ballot?`}
        description={
          voting
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
