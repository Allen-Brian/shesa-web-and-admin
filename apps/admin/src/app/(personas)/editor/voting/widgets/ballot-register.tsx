'use client';

import { Badge, Button, Input, StatsCard, toast } from '@shesa/ui';
import { Ban, Search, Undo2 } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';

import { setBallotVoid } from '../actions/voting-actions';
import type { BallotRow } from '../voting-types';

type Tab = 'exco' | 'ex_student' | 'voided';

/**
 * The register.
 *
 * Exco is the default tab because it is the only one a person can usefully
 * audit: twenty-odd ballots, each carrying a post and a name the secretariat
 * can check against people they know. The ex-student tab is thousands of
 * anonymous rows and exists for spotting patterns, not individuals.
 *
 * Nothing here links a ballot to a choice. Voiding needs to be done on who
 * cast a ballot, never on what they chose, and a screen that showed both
 * would make the second possible by accident.
 */
export function BallotRegister({ ballots }: { readonly ballots: readonly BallotRow[] }) {
  const [tab, setTab] = useState<Tab>('exco');
  const [query, setQuery] = useState('');
  const [reason, setReason] = useState('');
  const [pending, startTransition] = useTransition();

  const counts = useMemo(
    () => ({
      exco: ballots.filter((b) => b.college === 'exco' && !b.voidedAt).length,
      ex_student: ballots.filter((b) => b.college === 'ex_student' && !b.voidedAt).length,
      voided: ballots.filter((b) => b.voidedAt).length,
    }),
    [ballots],
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ballots.filter((b) => {
      if (tab === 'voided' ? !b.voidedAt : b.voidedAt || b.college !== tab) return false;
      if (!q) return true;
      return (
        (b.excoName ?? '').toLowerCase().includes(q) ||
        (b.excoPost ?? '').toLowerCase().includes(q) ||
        (b.voterBranchLabel ?? '').toLowerCase().includes(q) ||
        String(b.voterBatchYear ?? '').includes(q)
      );
    });
  }, [ballots, query, tab]);

  const toggleVoid = (b: BallotRow) =>
    startTransition(async () => {
      const res = await setBallotVoid(b.id, !b.voidedAt, reason);
      if (res.ok) {
        toast.success(
          b.voidedAt ? 'Ballot restored to the tally.' : 'Ballot struck from the tally.',
        );
        setReason('');
      } else {
        toast.error(res.message);
      }
    });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        <StatsCard label="Exco ballots" value={counts.exco} />
        <StatsCard label="Ex-student ballots" value={counts.ex_student} />
        <StatsCard label="Voided" value={counts.voided} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ['exco', 'Exco'],
            ['ex_student', 'Ex-students'],
            ['voided', 'Voided'],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={tab === value ? 'default' : 'outline'}
            onClick={() => setTab(value)}
          >
            {label}
            <span className="ml-1.5 tabular-nums opacity-70">{counts[value]}</span>
          </Button>
        ))}

        <div className="relative ml-auto">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search post, name, branch…"
            className="w-[240px] pl-8"
          />
        </div>
      </div>

      {tab !== 'voided' && (
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason attached to the next ballot you void (optional but worth writing)"
          maxLength={200}
        />
      )}

      {shown.length === 0 ? (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          {ballots.length === 0 ? 'Nobody has voted yet.' : 'Nothing matches that filter.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">
                  {tab === 'exco' ? 'Post and name' : 'Voter'}
                </th>
                <th className="px-3 py-2 text-left font-medium">Branch</th>
                <th className="px-3 py-2 text-right font-medium">Choices</th>
                <th className="px-3 py-2 text-left font-medium">Cast</th>
                <th className="px-3 py-2 text-left font-medium">Device / IP</th>
                <th className="px-3 py-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((b) => (
                <tr key={b.id} className={`border-t ${b.voidedAt ? 'opacity-60' : ''}`}>
                  <td className="px-3 py-2">
                    {b.college === 'exco' ? (
                      <span>
                        <span className="font-medium text-foreground">{b.excoName}</span>
                        <span className="block text-xs text-muted-foreground">{b.excoPost}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Batch {b.voterBatchYear ?? '—'}</span>
                    )}
                    {b.voidedAt && (
                      <Badge className="ml-2 bg-destructive/15 text-destructive">Voided</Badge>
                    )}
                    {b.voidReason && (
                      <span className="block text-xs text-muted-foreground">{b.voidReason}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{b.voterBranchLabel ?? '—'}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {b.choiceCount}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {new Date(b.submittedAt).toLocaleString('en-GB', {
                      timeZone: 'Africa/Lagos',
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  {/* Tails only. The full device id and IP hash identify a
                      browser, and a register that prints them is a tracking
                      log; six characters is enough to tell two rows apart. */}
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {b.deviceId.slice(-6)} / {b.ipHash ? b.ipHash.slice(-6) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => toggleVoid(b)}
                    >
                      {b.voidedAt ? (
                        <>
                          <Undo2 className="h-3.5 w-3.5" /> Restore
                        </>
                      ) : (
                        <>
                          <Ban className="h-3.5 w-3.5" /> Void
                        </>
                      )}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
