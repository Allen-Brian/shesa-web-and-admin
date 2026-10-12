import type { CategoryFilter } from './audit-log-widget-types';

export function categorize(action: string): CategoryFilter {
  if (action.startsWith('role.granted') || action.startsWith('membership.approved')) return 'grant';
  if (
    action.startsWith('role.revoked') ||
    action.startsWith('membership.rejected') ||
    action.endsWith('.deleted') ||
    action.endsWith('.archived')
  )
    return 'revoke';
  if (action.startsWith('membership.transferred') || action.startsWith('scope.updated'))
    return 'change';
  if (action.startsWith('audit.') || action.startsWith('auth.')) return 'system';
  return 'event';
}

export function getInitials(name: string): string {
  const clean = name.replace(/[()]/g, '').trim();
  const parts = clean.split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '—';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

// Re-exported so the audit-log widgets keep a single import, but the
// implementation lives in @/lib/format — it was one of three copies.
export { formatRelativeShort } from '@/lib/format/relative-time';

export function formatTimeOnly(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDayOnly(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
}

export function downloadCsv(baseName: string, rows: readonly (readonly string[])[]): void {
  const escape = (v: string): string => {
    if (v.includes('"') || v.includes(',') || v.includes('\n')) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };
  const csv = rows.map((r) => r.map(escape).join(',')).join('\r\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseName}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
