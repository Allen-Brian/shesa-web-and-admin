'use client';

import { Badge, Button, StatsCard } from '@shesa/ui';
import { Download, Trophy } from 'lucide-react';
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { EditionRow, ResultRow, Turnout } from '../voting-types';

const PRIMARY = 'var(--color-primary)';
const MUTED = 'color-mix(in srgb, var(--color-primary) 30%, transparent)';

const tooltipStyle = {
  background: 'var(--color-card)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--color-foreground)',
};

/**
 * The tally, award by award.
 *
 * Both raw counts and the weighted score are shown for every candidate,
 * because the two disagree and someone reading a winner out at the AGM
 * should know by how much. Under raw weighted counts a college of twenty
 * carries far less than its nominal 40% against several hundred ex-students,
 * and the per-award breakdown is where that becomes visible rather than
 * surprising.
 */
export function ResultsView({
  edition,
  results,
  turnout,
}: {
  readonly edition: EditionRow;
  readonly results: readonly ResultRow[];
  readonly turnout: Turnout;
}) {
  const byAward = useMemo(() => {
    const m = new Map<string, { name: string; category: string | null; rows: ResultRow[] }>();
    for (const r of results) {
      const entry = m.get(r.awardId);
      if (entry) entry.rows.push(r);
      else m.set(r.awardId, { name: r.awardName, category: r.categoryName, rows: [r] });
    }
    return [...m.entries()];
  }, [results]);

  const total = turnout.exStudent + turnout.exco;

  const exportCsv = () => {
    const header = [
      'Award',
      'Category',
      'Candidate',
      'Ex-student votes',
      'Exco votes',
      'Weighted score',
      'Place',
    ];
    const rows = results.map((r) => [
      r.awardName,
      r.categoryName ?? '',
      r.candidateName,
      r.exStudentVotes,
      r.excoVotes,
      r.score,
      r.place,
    ]);
    // Quote every field and double any embedded quote — award names carry
    // commas, and a CSV that splits on them puts the wrong name on a row.
    const csv = [header, ...rows]
      .map((line) => line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `shesa-awards-${edition.slug}-results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (total === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        No ballots have been cast yet. Results appear here as they come in.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-3">
        <StatsCard label="Ballots cast" value={total} />
        <StatsCard label="Ex-student" value={turnout.exStudent} />
        <StatsCard label="Exco" value={turnout.exco} />
        <StatsCard label="Voided" value={turnout.voided} />
      </div>

      {/* The arithmetic consequence of raw weighted counts, stated rather
          than left for someone to discover at the podium. */}
      {turnout.exco > 0 && turnout.exStudent > 0 && (
        <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
          Under {edition.weightingMethod.replace('_', ' ')}, the Exco&apos;s {turnout.exco}{' '}
          {turnout.exco === 1 ? 'ballot carries' : 'ballots carry'}{' '}
          <strong className="text-foreground">
            {(
              (turnout.exco * edition.excoWeight * 100) /
              (turnout.exco * edition.excoWeight + turnout.exStudent * edition.exStudentWeight)
            ).toFixed(1)}
            %
          </strong>{' '}
          of the total weight, not {(edition.excoWeight * 100).toFixed(0)}% — weighting each ballot
          is not the same as weighting each college.
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">By award</h2>
        <Button type="button" variant="outline" size="sm" onClick={exportCsv}>
          <Download className="h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      <div className="flex flex-col gap-6">
        {byAward.map(([awardId, award]) => (
          <div key={awardId} className="flex flex-col gap-3 rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-baseline gap-2">
              <p className="text-sm font-semibold text-foreground">{award.name}</p>
              {award.category && (
                <span className="text-xs text-muted-foreground">{award.category}</span>
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[...award.rows]}
                    layout="vertical"
                    margin={{ left: 8, right: 16 }}
                  >
                    <CartesianGrid horizontal={false} stroke="var(--color-border)" />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--color-border)" />
                    <YAxis
                      type="category"
                      dataKey="candidateName"
                      width={130}
                      tick={{ fontSize: 11 }}
                      stroke="var(--color-border)"
                    />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="score" name="Weighted score" radius={[0, 4, 4, 0]}>
                      {award.rows.map((r) => (
                        <Cell key={r.candidateId} fill={r.place === 1 ? PRIMARY : MUTED} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium">Candidate</th>
                      <th className="px-2 py-1.5 text-right font-medium">Ex-student</th>
                      <th className="px-2 py-1.5 text-right font-medium">Exco</th>
                      <th className="px-2 py-1.5 text-right font-medium">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {award.rows.map((r) => (
                      <tr key={r.candidateId} className="border-t">
                        <td className="px-2 py-1.5">
                          {r.place === 1 && (
                            <Trophy
                              className="mr-1 inline h-3.5 w-3.5 text-primary"
                              aria-label="Leading"
                            />
                          )}
                          {r.candidateName}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                          {r.exStudentVotes}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                          {r.excoVotes}
                        </td>
                        <td className="px-2 py-1.5 text-right font-medium tabular-nums">
                          {r.score.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TurnoutChart title="Ballots per day" data={turnout.byDay} labelKey="day" />
        <TurnoutChart title="By batch decade" data={turnout.byDecade} labelKey="decade" />
      </div>

      {turnout.byBranch.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border bg-card p-4">
          <p className="text-sm font-semibold text-foreground">By branch</p>
          <div className="flex flex-wrap gap-2">
            {turnout.byBranch.map((b) => (
              <Badge key={b.branch} className="bg-muted text-muted-foreground">
                {b.branch}
                <span className="ml-1.5 font-medium text-foreground">{b.count}</span>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TurnoutChart<K extends string>({
  title,
  data,
  labelKey,
}: {
  readonly title: string;
  readonly data: readonly (Record<K, string> & { count: number })[];
  readonly labelKey: K;
}) {
  if (data.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card p-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[...data]}>
            <CartesianGrid vertical={false} stroke="var(--color-border)" />
            <XAxis dataKey={labelKey} tick={{ fontSize: 11 }} stroke="var(--color-border)" />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--color-border)" />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'transparent' }} />
            <Bar dataKey="count" fill={PRIMARY} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
