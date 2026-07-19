import type { BranchMemberRow } from './branch-detail-types';

const CSV_HEADERS = [
  'full_name',
  'batch_year',
  'network',
  'house',
  'membership_status',
  'location',
] as const;

/**
 * Client-side CSV export of a branch's member list. Escapes any cell
 * containing quotes, commas, or newlines per RFC 4180.
 */
export function exportBranchMembersCsv(slug: string, rows: readonly BranchMemberRow[]): number {
  if (rows.length === 0) return 0;
  const escape = (cell: unknown): string => {
    const s = String(cell ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    CSV_HEADERS.join(','),
    ...rows.map((m) =>
      [
        m.full_name,
        m.batch_year ?? '',
        m.network_name,
        m.house_name,
        m.membership_status,
        m.location ?? '',
      ]
        .map(escape)
        .join(','),
    ),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slug}-members.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return rows.length;
}
