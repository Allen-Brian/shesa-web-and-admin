/**
 * Putting an office before its deputy.
 *
 * ─── The problem ───────────────────────────────────────────────────────
 * Mainstream leaders were rendered in `sort_order` alone — one number per
 * row, typed by whoever added them. Nothing tied a deputy's number to the
 * number of the office it deputises for, so "Assistant Secretary General"
 * would appear above "Secretary General" the moment someone added the
 * assistant first, or renumbered, or reordered the sector. It is the kind
 * of mistake that is invisible to the person making it and obvious to
 * everyone who knows the organisation.
 *
 * ─── The fix ───────────────────────────────────────────────────────────
 * Rank the *office*, not the row. Positions sharing a base title are one
 * office — "Vice President" and "National President" are both president —
 * and an office sits where its most senior holder sits. Within the office
 * the principal comes first and deputies follow. `sort_order` still
 * decides everything else, so an editor's arrangement is respected right
 * up to the point where it would print a deputy above their principal.
 *
 * This is derived rather than stored on purpose. A `rank` column would
 * need every existing row backfilled and every new one filled in
 * correctly, which is the same act of care that was already going wrong.
 */

/** Words that mark a position as subordinate to another one. */
const DEPUTY_WORDS = [
  'assistant',
  'asst',
  'deputy',
  'vice',
  'acting',
  'ag',
  'associate',
  'second',
  '2nd',
];

/**
 * Qualifiers that name *which* holder rather than *which office*.
 *
 * "National President" and "President" are the same office; "Financial
 * Secretary" and "Secretary" are not, which is why only scope words are
 * listed here and never a word that modifies the role itself.
 */
const SCOPE_WORDS = ['national', 'general assembly', 'mainstream', 'central', 'first', '1st'];

function words(position: string): string[] {
  return position
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/** 0 for a principal, 1 for a deputy. Nothing sorts below a deputy. */
export function deputyRank(position: string): 0 | 1 {
  return words(position).some((w) => DEPUTY_WORDS.includes(w)) ? 1 : 0;
}

/**
 * The office behind a position title.
 *
 * `Assistant National Secretary General` and `Secretary General` both
 * reduce to `secretary general`, so they rank together. A title that is
 * nothing but qualifiers keeps its original words rather than reducing to
 * the empty string and colliding with every other such title.
 */
export function officeKey(position: string): string {
  const rest = words(position).filter((w) => !DEPUTY_WORDS.includes(w) && !SCOPE_WORDS.includes(w));
  return (rest.length > 0 ? rest : words(position)).join(' ');
}

interface Rankable {
  readonly position: string;
  /** The editor's own number. Kept as the tiebreak inside an office. */
  readonly sortOrder: number;
}

/**
 * Order one group of leaders — a sector, a branch, a committee.
 *
 * Stable: equal keys keep the order the caller supplied, which is the
 * database's `sort_order` then whatever it uses to break ties, so the
 * result is deterministic across requests.
 */
export function orderByOffice<T extends Rankable>(leaders: readonly T[]): T[] {
  // An office is placed by its most senior member, so a deputy listed
  // first in the raw data still drags the whole office no higher than
  // where its principal belongs.
  const officeRank = new Map<string, number>();
  for (const l of leaders) {
    const key = officeKey(l.position);
    const seen = officeRank.get(key);
    if (seen === undefined || l.sortOrder < seen) officeRank.set(key, l.sortOrder);
  }

  return [...leaders].sort((a, b) => {
    const byOffice =
      (officeRank.get(officeKey(a.position)) ?? 0) - (officeRank.get(officeKey(b.position)) ?? 0);
    if (byOffice !== 0) return byOffice;

    const byRank = deputyRank(a.position) - deputyRank(b.position);
    if (byRank !== 0) return byRank;

    return a.sortOrder - b.sortOrder;
  });
}
