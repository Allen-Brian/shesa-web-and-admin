/**
 * Small pure helpers used by the events form. Kept in a `.ts` (no JSX)
 * file so the main form.tsx stays focused on JSX.
 */

export function combineDateTime(date: string, time: string): string {
  if (!date || !time) return '';
  const dt = new Date(`${date}T${time}:00`);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toISOString();
}

export function isoToDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isoToTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function normalizeProgramTime(raw: string): string {
  // Backend stores TIME as "HH:mm:ss"; the form uses "HH:mm".
  if (!raw) return '';
  const parts = raw.split(':');
  const hh = parts[0] ?? '00';
  const mm = parts[1] ?? '00';
  return `${hh.padStart(2, '0')}:${mm.padStart(2, '0')}`;
}

export function newProgramItemId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}
