import Link from 'next/link';
import { Badge } from '@shesa/ui';

import type { AwardRow, CategoryRow } from '../voting-types';

/**
 * Every award, with how full it is.
 *
 * Three numbers per row, and the one that matters changes as the cycle
 * moves: nominations while the form is open, pending while the shortlist is
 * being drawn, candidates once it is. An award showing zero candidates on
 * the day voting opens is the failure this table exists to make impossible
 * to miss — it is silently dropped from the public ballot.
 */
export function AwardStructure({
  categories,
  awards,
  phase,
}: {
  readonly categories: readonly CategoryRow[];
  readonly awards: readonly AwardRow[];
  readonly phase: string;
}) {
  const grouped = categories.map((c) => ({
    heading: c.name,
    items: awards.filter((a) => a.categoryId === c.id),
  }));
  const standalone = awards.filter((a) => a.categoryId === null);
  if (standalone.length > 0) {
    grouped.push({ heading: 'Standalone awards', items: standalone });
  }

  return (
    <div className="flex flex-col gap-6">
      {grouped
        .filter((g) => g.items.length > 0)
        .map((g) => (
          <div key={g.heading} className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {g.heading}
            </p>
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Award</th>
                    <th className="px-3 py-2 text-right font-medium">Nominations</th>
                    <th className="px-3 py-2 text-right font-medium">Pending</th>
                    <th className="px-3 py-2 text-right font-medium">On the ballot</th>
                  </tr>
                </thead>
                <tbody>
                  {g.items.map((a) => (
                    <tr key={a.id} className="border-t">
                      <td className="px-3 py-2">
                        <Link
                          href={`/editor/voting/candidates?award=${a.id}`}
                          className="font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {a.name}
                        </Link>
                        {a.status === 'hidden' && (
                          <Badge className="ml-2 bg-muted text-muted-foreground">Hidden</Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {a.nominationCount}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {a.pendingCount > 0 ? (
                          <Link
                            href={`/editor/voting/nominations?award=${a.id}`}
                            className="font-medium text-amber-600 hover:underline dark:text-amber-400"
                          >
                            {a.pendingCount}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {a.candidateCount === 0 ? (
                          <span
                            className={
                              phase === 'voting'
                                ? 'font-medium text-destructive'
                                : 'text-muted-foreground'
                            }
                            title={
                              phase === 'voting'
                                ? 'Voting is open and this award has nobody on the ballot — it is not shown to voters at all.'
                                : undefined
                            }
                          >
                            0
                          </span>
                        ) : (
                          <span className="font-medium text-foreground">{a.candidateCount}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
    </div>
  );
}
