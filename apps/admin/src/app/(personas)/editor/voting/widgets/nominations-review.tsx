'use client';

import {
  Badge,
  Button,
  Checkbox,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from '@shesa/ui';
import { Check, Search, Undo2, UserPlus, X } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';

import { promoteNomination, reviewNomination, reviewNominations } from '../actions/voting-actions';
import type { AwardRow, NominationRow, NominationStatus } from '../voting-types';

type Filter = 'pending' | 'approved' | 'rejected' | 'all';

const STATUS_TONE: Record<NominationStatus, string> = {
  pending: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  approved: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  rejected: 'bg-muted text-muted-foreground',
};

/**
 * The review screen.
 *
 * Grouped by award rather than listed flat, because the decision is never
 * about one nomination — it is "who should be on the ballot for Health", and
 * that question needs the other names for Health next to it.
 *
 * Within an award, the most-supported name comes first. Ten people naming
 * the same person is the strongest signal the secretariat has, and sorting
 * by arrival time buries it.
 */
export function NominationsReview({
  nominations,
  awards,
  phase,
}: {
  readonly nominations: readonly NominationRow[];
  readonly awards: readonly AwardRow[];
  readonly phase: string;
}) {
  const [filter, setFilter] = useState<Filter>('pending');
  const [awardId, setAwardId] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const awardName = useMemo(() => new Map(awards.map((a) => [a.id, a.name])), [awards]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return nominations.filter((n) => {
      if (filter !== 'all' && n.status !== filter) return false;
      if (awardId !== 'all' && n.awardId !== awardId) return false;
      if (!q) return true;
      return (
        n.nomineeName.toLowerCase().includes(q) ||
        n.citation.toLowerCase().includes(q) ||
        (n.nominatorName ?? '').toLowerCase().includes(q)
      );
    });
  }, [awardId, filter, nominations, query]);

  /** Award → its nominations, most-supported first. */
  const groups = useMemo(() => {
    const by = new Map<string, NominationRow[]>();
    for (const n of shown) {
      const list = by.get(n.awardId);
      if (list) list.push(n);
      else by.set(n.awardId, [n]);
    }
    return [...by.entries()]
      .map(([id, items]) => ({
        id,
        name: awardName.get(id) ?? 'Unknown award',
        items: items.sort(
          (a, b) => b.supportCount - a.supportCount || a.nomineeName.localeCompare(b.nomineeName),
        ),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [awardName, shown]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, success: string) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        toast.success(success);
        setSelected(new Set());
      } else {
        toast.error(res.message ?? 'That did not work.');
      }
    });

  const counts = {
    pending: nominations.filter((n) => n.status === 'pending').length,
    approved: nominations.filter((n) => n.status === 'approved').length,
    rejected: nominations.filter((n) => n.status === 'rejected').length,
    all: nominations.length,
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {(['pending', 'approved', 'rejected', 'all'] as const).map((f) => (
          <Button
            key={f}
            type="button"
            size="sm"
            variant={filter === f ? 'default' : 'outline'}
            onClick={() => setFilter(f)}
          >
            <span className="capitalize">{f}</span>
            <span className="ml-1.5 tabular-nums opacity-70">{counts[f]}</span>
          </Button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <Select value={awardId} onValueChange={setAwardId}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="All awards" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All awards</SelectItem>
              {awards.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search names, citations…"
              className="w-[220px] pl-8"
            />
          </div>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
          <span className="text-sm font-medium text-foreground">{selected.size} selected</span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => reviewNominations([...selected], 'approved'), 'Approved.')}
          >
            <Check className="h-3.5 w-3.5" /> Approve
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => reviewNominations([...selected], 'rejected'), 'Rejected.')}
          >
            <X className="h-3.5 w-3.5" /> Reject
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {groups.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          {nominations.length === 0
            ? 'No nominations yet. They appear here as the membership submits them.'
            : 'Nothing matches that filter.'}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((g) => (
            <div key={g.id} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{g.name}</p>
                <span className="text-xs text-muted-foreground">
                  {g.items.length} {g.items.length === 1 ? 'nomination' : 'nominations'}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {g.items.map((n) => (
                  <NominationCard
                    key={n.id}
                    nomination={n}
                    checked={selected.has(n.id)}
                    onToggle={() => toggle(n.id)}
                    pending={pending}
                    phase={phase}
                    onReview={(status) =>
                      run(
                        () => reviewNomination(n.id, status),
                        status === 'pending' ? 'Sent back for review.' : `Marked ${status}.`,
                      )
                    }
                    onPromote={() =>
                      run(() => promoteNomination(n.id), `${n.nomineeName} is on the ballot.`)
                    }
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NominationCard({
  nomination: n,
  checked,
  onToggle,
  onReview,
  onPromote,
  pending,
  phase,
}: {
  readonly nomination: NominationRow;
  readonly checked: boolean;
  readonly onToggle: () => void;
  readonly onReview: (status: NominationStatus) => void;
  readonly onPromote: () => void;
  readonly pending: boolean;
  readonly phase: string;
}) {
  const onBallot = n.candidateId !== null;

  return (
    <div
      className={`flex gap-3 rounded-lg border p-3 ${
        n.status === 'rejected' ? 'bg-muted/30 opacity-70' : 'bg-card'
      }`}
    >
      <Checkbox checked={checked} onCheckedChange={onToggle} className="mt-1" />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-foreground">{n.nomineeName}</span>

          {/* The signal the sort is built on, so it has to be visible. */}
          {n.supportCount > 1 && (
            <Badge className="bg-primary/15 text-primary">
              {n.supportCount} nominations for this person
            </Badge>
          )}

          <Badge className={STATUS_TONE[n.status]}>{n.status}</Badge>
          {onBallot && (
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              On the ballot
            </Badge>
          )}

          <span className="text-xs text-muted-foreground">
            {[n.nomineeBatchYear, n.nomineeBranchLabel].filter(Boolean).join(' · ') || null}
          </span>
        </div>

        <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
          {n.citation}
        </p>

        <p className="text-xs text-muted-foreground">
          {n.nominatorName ? (
            <>
              Nominated by <span className="text-foreground">{n.nominatorName}</span>
              {n.nominatorBatchYear ? ` (${n.nominatorBatchYear})` : ''}
              {n.nominatorContact ? ` · ${n.nominatorContact}` : ''}
            </>
          ) : (
            'Nominated anonymously'
          )}
          {' · '}
          {new Date(n.createdAt).toLocaleDateString('en-GB', {
            timeZone: 'Africa/Lagos',
            day: 'numeric',
            month: 'short',
          })}
          {n.nomineeContact ? ` · Contact: ${n.nomineeContact}` : ''}
        </p>
      </div>

      <div className="flex shrink-0 flex-col gap-1.5">
        {!onBallot && (
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={onPromote}
            title={
              phase === 'voting'
                ? 'Voting is already open — adding a candidate now changes an election in progress.'
                : 'Add this person to the ballot'
            }
          >
            <UserPlus className="h-3.5 w-3.5" /> To ballot
          </Button>
        )}
        {n.status !== 'approved' && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => onReview('approved')}
          >
            <Check className="h-3.5 w-3.5" /> Approve
          </Button>
        )}
        {n.status !== 'rejected' && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => onReview('rejected')}
          >
            <X className="h-3.5 w-3.5" /> Reject
          </Button>
        )}
        {n.status !== 'pending' && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => onReview('pending')}
          >
            <Undo2 className="h-3.5 w-3.5" /> Undo
          </Button>
        )}
      </div>
    </div>
  );
}
