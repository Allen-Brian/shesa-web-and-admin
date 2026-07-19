import type { MembersConfirmState } from './members-table-types';

export function buildMembersConfirmTitle(confirm: MembersConfirmState): string {
  if (!confirm) return '';
  const n = confirm.targets.length;
  if (n === 1) return `Remove ${confirm.targets[0]?.full_name ?? 'this member'}?`;
  return `Remove ${n} members?`;
}

/**
 * Case-insensitive dedup + sort of a nullable string list, used to
 * derive filter-dimension option lists from the actual row set.
 */
export function sortedUnique(values: readonly (string | null | undefined)[]): string[] {
  const set = new Set<string>();
  for (const v of values) {
    if (v == null) continue;
    const trimmed = v.trim();
    if (trimmed.length > 0) set.add(trimmed);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
