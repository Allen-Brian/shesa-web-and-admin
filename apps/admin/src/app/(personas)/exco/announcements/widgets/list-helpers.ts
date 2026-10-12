import type { ConfirmState } from './list-types';

export function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function buildConfirmTitle(confirm: ConfirmState): string {
  if (!confirm) return '';
  const verb = confirm.kind === 'delete' ? 'Delete' : 'Archive';
  const n = confirm.targets.length;
  if (n === 1) {
    const name = confirm.targets[0]?.title ?? 'this announcement';
    return `${verb} "${name}"?`;
  }
  return `${verb} ${n} announcements?`;
}
