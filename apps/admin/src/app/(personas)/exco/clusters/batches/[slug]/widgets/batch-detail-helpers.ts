import type { BatchMemberRow } from './batch-detail-types';

const CSV_HEADERS = [
  'member_code',
  'full_name',
  'email',
  'phone',
  'house',
  'network',
  'branch',
  'membership_status',
  'location',
] as const;

/**
 * Trigger a client-side CSV download of the batch's member roster.
 * Escapes any cell that contains a comma / quote / newline per RFC 4180
 * so Excel and Google Sheets both open it correctly. Returns the row
 * count so the caller can report it in a toast.
 */
export function exportBatchMembersCsv(args: {
  readonly rows: readonly BatchMemberRow[];
  readonly slug: string;
}): number {
  const { rows, slug } = args;
  if (rows.length === 0) return 0;

  const csv = [
    CSV_HEADERS.join(','),
    ...rows.map((m) =>
      [
        m.member_code,
        m.full_name,
        m.email ?? '',
        m.phone ?? '',
        m.house_name,
        m.network_name,
        m.branch_name ?? '',
        m.membership_status ?? '',
        m.location ?? '',
      ]
        .map((cell) => {
          const s = String(cell ?? '');
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
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
