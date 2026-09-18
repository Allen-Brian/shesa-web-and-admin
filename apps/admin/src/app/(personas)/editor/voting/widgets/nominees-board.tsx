'use client';

import {
  Badge,
  Button,
  ConfirmDialog,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@shesa/ui';
import {
  ChevronDown,
  ChevronRight,
  Combine,
  Layers,
  Pencil,
  Plus,
  UserPlus,
  X,
} from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';

import {
  aggregateAward,
  assignNomination,
  candidateDraft,
  createNominee,
  deleteNominee,
  mergeNominees,
  renameNominee,
  type CandidateInput,
} from '../actions/voting-actions';
import type { AwardRow, MergeSuggestion, NominationRow, NomineeRow } from '../voting-types';

import { BLANK_CANDIDATE, CandidateDialog } from './candidate-dialog';

/**
 * Aggregation: the nominations of one award, grouped into people.
 *
 * `awards.nominations` is one row per act of nominating, which is right —
 * five people putting John Doe forward is five citations and the secretariat
 * reads all five. But counting them by hand across nineteen awards, in the
 * week between nominations closing and voting opening, is not work anybody
 * has time for. This screen does the counting.
 *
 * One award at a time, deliberately. Merging is a judgement about two names
 * side by side, and a list spanning every award makes that judgement worse,
 * not faster.
 */
export function NomineesBoard({
  awards,
  nominees,
  nominations,
  suggestions,
  awardId,
  onAwardChange,
}: {
  readonly awards: readonly AwardRow[];
  readonly nominees: readonly NomineeRow[];
  readonly nominations: readonly NominationRow[];
  readonly suggestions: readonly MergeSuggestion[];
  readonly awardId: string;
  readonly onAwardChange: (id: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [renaming, setRenaming] = useState<{ id: string; value: string } | null>(null);
  const [dissolving, setDissolving] = useState<NomineeRow | null>(null);
  const [newName, setNewName] = useState('');
  const [merging, setMerging] = useState<MergeSuggestion | null>(null);

  const [candidate, setCandidate] = useState<{
    input: CandidateInput;
    citations: readonly string[];
    contacts: readonly string[];
  } | null>(null);

  const award = awards.find((a) => a.id === awardId) ?? null;

  const buckets = useMemo(() => nominees.filter((n) => n.awardId === awardId), [awardId, nominees]);

  const forAward = useMemo(
    () => nominations.filter((n) => n.awardId === awardId),
    [awardId, nominations],
  );

  const idle = forAward.filter((n) => !n.nomineeId);

  const byBucket = useMemo(() => {
    const m = new Map<string, NominationRow[]>();
    for (const n of forAward) {
      if (!n.nomineeId) continue;
      const list = m.get(n.nomineeId);
      if (list) list.push(n);
      else m.set(n.nomineeId, [n]);
    }
    return m;
  }, [forAward]);

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, success: string) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok) toast.success(success);
      else toast.error(res.message ?? 'That did not work.');
    });

  const aggregate = () =>
    startTransition(async () => {
      const res = await aggregateAward(awardId);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      const { created = 0, assigned = 0 } = res;
      toast.success(
        assigned === 0
          ? 'Nothing left to aggregate — every nomination is already grouped.'
          : `${assigned} nomination${assigned === 1 ? '' : 's'} grouped into ${created} new ${
              created === 1 ? 'nominee' : 'nominees'
            }.`,
      );
    });

  const toBallot = (bucket: NomineeRow) =>
    startTransition(async () => {
      const draft = await candidateDraft(bucket.id);
      if (!draft) {
        toast.error('That nominee no longer exists.');
        return;
      }
      setCandidate({
        input: {
          ...BLANK_CANDIDATE,
          awardId: draft.awardId,
          nomineeId: draft.nomineeId,
          fullName: draft.fullName,
          batchYear: draft.batchYear,
          branchLabel: draft.branchLabel,
        },
        citations: draft.citations,
        contacts: draft.contacts,
      });
    });

  const toggle = (id: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={awardId} onValueChange={onAwardChange}>
          <SelectTrigger className="w-[320px]">
            <SelectValue placeholder="Choose an award" />
          </SelectTrigger>
          <SelectContent>
            {awards.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name} ({a.nominationCount})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button type="button" onClick={aggregate} disabled={pending || !awardId}>
          <Layers className="h-3.5 w-3.5" />
          Aggregate {idle.length > 0 ? `(${idle.length} waiting)` : ''}
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Add a nominee by hand"
            className="w-[220px]"
          />
          <Button
            type="button"
            variant="outline"
            disabled={pending || newName.trim().length < 2}
            onClick={() =>
              run(async () => {
                const res = await createNominee(awardId, newName);
                if (res.ok) setNewName('');
                return res;
              }, 'Nominee added.')
            }
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {!award ? (
        <p className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          Choose an award to group its nominations.
        </p>
      ) : (
        <>
          {/* Proposals, never actions. Fusing two real people who happen to
              share a surname is the one failure this must not have, so the
              machine finds candidates and a person presses the button. */}
          {suggestions.length > 0 && (
            <div className="flex flex-col gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-4">
              <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                <Combine className="h-4 w-4" aria-hidden />
                {suggestions.length} possible {suggestions.length === 1 ? 'match' : 'matches'}
              </p>
              <p className="text-xs text-muted-foreground">
                These share every word of the shorter name. Only you can tell whether they are the
                same person — nothing merges on its own.
              </p>
              <div className="mt-1 flex flex-col gap-2">
                {suggestions.map((s) => (
                  <div
                    key={`${s.leftId}-${s.rightId}`}
                    className="flex flex-wrap items-center gap-3 rounded-md border bg-card p-2.5"
                  >
                    <span className="text-sm text-foreground">
                      {s.leftName}{' '}
                      <span className="text-xs text-muted-foreground">({s.leftCount})</span>
                    </span>
                    <span className="text-xs text-muted-foreground">and</span>
                    <span className="text-sm text-foreground">
                      {s.rightName}{' '}
                      <span className="text-xs text-muted-foreground">({s.rightCount})</span>
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="ml-auto"
                      disabled={pending}
                      onClick={() => setMerging(s)}
                    >
                      Merge
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {buckets.length === 0 ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              {forAward.length === 0
                ? 'No nominations for this award yet.'
                : `${forAward.length} nomination${forAward.length === 1 ? '' : 's'} waiting. Press Aggregate to group them by name.`}
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="w-8" />
                    <th className="px-3 py-2 text-left font-medium">Nominee</th>
                    <th className="px-3 py-2 text-right font-medium">Nominations</th>
                    <th className="px-3 py-2 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {buckets.map((b) => {
                    const rows = byBucket.get(b.id) ?? [];
                    const open = expanded.has(b.id);
                    return (
                      <>
                        <tr key={b.id} className="border-t">
                          <td className="pl-2">
                            <button
                              type="button"
                              onClick={() => toggle(b.id)}
                              aria-label={open ? 'Collapse' : 'Expand'}
                              className="grid h-6 w-6 place-items-center text-muted-foreground hover:text-foreground"
                            >
                              {open ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                          <td className="px-3 py-2">
                            {renaming?.id === b.id ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={renaming.value}
                                  onChange={(e) => setRenaming({ id: b.id, value: e.target.value })}
                                  className="h-8 w-[240px]"
                                  autoFocus
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={pending}
                                  onClick={() =>
                                    run(async () => {
                                      const res = await renameNominee(b.id, renaming.value);
                                      if (res.ok) setRenaming(null);
                                      return res;
                                    }, 'Renamed.')
                                  }
                                >
                                  Save
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setRenaming(null)}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-medium text-foreground">{b.displayName}</span>
                                {b.candidateId && (
                                  <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                    On the ballot
                                  </Badge>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setRenaming({ id: b.id, value: b.displayName })}
                                  className="text-muted-foreground hover:text-primary"
                                  aria-label="Rename"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span
                              className={`tabular-nums ${
                                b.nominationCount >= 3
                                  ? 'font-semibold text-foreground'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {b.nominationCount}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex justify-end gap-1.5">
                              {!b.candidateId && (
                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={pending}
                                  onClick={() => toBallot(b)}
                                >
                                  <UserPlus className="h-3.5 w-3.5" /> To ballot
                                </Button>
                              )}
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={pending}
                                onClick={() => setDissolving(b)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>

                        {open &&
                          rows.map((n) => (
                            <tr key={n.id} className="border-t bg-muted/20">
                              <td />
                              <td className="px-3 py-2" colSpan={2}>
                                <p className="text-xs font-medium text-foreground">
                                  {n.nomineeName}
                                  {n.nomineeName.trim().toLowerCase() !==
                                    b.displayName.trim().toLowerCase() && (
                                    <span className="ml-1.5 text-muted-foreground">
                                      (spelled differently)
                                    </span>
                                  )}
                                </p>
                                <p className="mt-0.5 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                                  {n.citation}
                                </p>
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  {n.nominatorName ?? 'Anonymous'}
                                  {n.nominatorBatchYear ? ` · ${n.nominatorBatchYear}` : ''}
                                </p>
                              </td>
                              <td className="px-3 py-2 text-right align-top">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  disabled={pending}
                                  onClick={() =>
                                    run(
                                      () => assignNomination(n.id, null),
                                      'Moved back to ungrouped.',
                                    )
                                  }
                                >
                                  Remove
                                </Button>
                              </td>
                            </tr>
                          ))}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* The idle pile. Never hidden: a nomination that is in no bucket is
              in no count, and that has to be visible rather than inferred. */}
          {idle.length > 0 && (
            <div className="flex flex-col gap-2 rounded-lg border p-4">
              <p className="text-sm font-medium text-foreground">
                {idle.length} ungrouped {idle.length === 1 ? 'nomination' : 'nominations'}
              </p>
              <p className="text-xs text-muted-foreground">
                These count towards nobody until they are grouped. Press Aggregate, or place one by
                hand.
              </p>
              <div className="mt-1 flex flex-col gap-2">
                {idle.map((n) => (
                  <div
                    key={n.id}
                    className="flex flex-wrap items-center gap-3 rounded-md border bg-card p-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{n.nomineeName}</p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">{n.citation}</p>
                    </div>
                    <Select
                      value=""
                      onValueChange={(v) => run(() => assignNomination(n.id, v), 'Grouped.')}
                    >
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Assign to…" />
                      </SelectTrigger>
                      <SelectContent>
                        {buckets.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.displayName} ({b.nominationCount})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={merging !== null}
        title={`Merge into "${merging?.leftName ?? ''}"?`}
        description={`All ${merging?.rightCount ?? 0} nomination(s) under "${merging?.rightName ?? ''}" move across, and that entry disappears. The kept name is "${merging?.leftName ?? ''}" — you can rename it afterwards, and any nomination can be pulled back out.`}
        confirmLabel="Merge"
        onConfirm={() => {
          const m = merging;
          setMerging(null);
          if (m) run(() => mergeNominees(m.leftId, m.rightId), 'Merged.');
        }}
        onCancel={() => setMerging(null)}
      />

      <ConfirmDialog
        open={dissolving !== null}
        title={`Dissolve "${dissolving?.displayName ?? ''}"?`}
        description={`Its ${dissolving?.nominationCount ?? 0} nomination(s) go back to the ungrouped pile — nothing is deleted. Use this when two people were wrongly merged.`}
        confirmLabel="Dissolve"
        onConfirm={() => {
          const d = dissolving;
          setDissolving(null);
          if (d) run(() => deleteNominee(d.id), 'Dissolved.');
        }}
        onCancel={() => setDissolving(null)}
      />

      {candidate && (
        <CandidateDialog
          open
          onOpenChange={(o) => !o && setCandidate(null)}
          candidateId={null}
          input={candidate.input}
          onInput={(input) => setCandidate({ ...candidate, input })}
          citations={candidate.citations}
          contacts={candidate.contacts}
          awardName={award?.name}
        />
      )}
    </div>
  );
}
