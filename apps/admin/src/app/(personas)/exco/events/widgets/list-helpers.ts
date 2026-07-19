import type { ConfirmState } from './list-types';

export function formatStart(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function humanizeType(t: string): string {
  return t
    .split('_')
    .map((p) => (p.length > 0 ? p[0]!.toUpperCase() + p.slice(1) : p))
    .join(' ');
}

/**
 * Timeline label — a compact "when relative to now" phrase.
 * Empty ring: upcoming ("in Nd"). Partial: live ("day X/Y").
 * Full: past ("ended Nd ago").
 */
export function timelineLabel(startIso: string, endIso: string, now: number = Date.now()): string {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return '—';

  const day = 24 * 60 * 60 * 1000;
  if (now < start) {
    const days = Math.ceil((start - now) / day);
    if (days === 0) return 'starts today';
    if (days === 1) return 'in 1 day';
    return `in ${days} days`;
  }
  if (now > end) {
    const days = Math.ceil((now - end) / day);
    if (days === 0) return 'just ended';
    if (days === 1) return 'ended 1 day ago';
    return `ended ${days} days ago`;
  }
  const totalDays = Math.max(1, Math.ceil((end - start) / day));
  const currentDay = Math.max(1, Math.ceil((now - start) / day));
  if (totalDays === 1) return 'live now';
  return `day ${currentDay}/${totalDays}`;
}

export function buildConfirmTitle(confirm: ConfirmState): string {
  if (!confirm) return '';
  const verb = confirm.kind === 'delete' ? 'Delete' : 'Archive';
  const n = confirm.targets.length;
  if (n === 1) {
    const name = confirm.targets[0]?.name ?? 'this event';
    return `${verb} "${name}"?`;
  }
  return `${verb} ${n} events?`;
}
