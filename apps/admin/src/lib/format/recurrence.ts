/**
 * Display label for a charge's recurrence.
 *
 * ─── Why this is one function now ───────────────────────────────────
 * There were four implementations, and they did not agree. Three took
 * `(recurrence, interval)` and produced "Every month" / "Every 2
 * quarters". The fourth — used by the Obligations list — took only
 * `(recurrence)` and produced "Monthly" / "Quarterly".
 *
 * That was not merely a wording difference. A charge set to run every
 * two quarters rendered as "Every 2 quarters" on the Charges list and
 * as plain "Quarterly" on Obligations: the same charge, described
 * differently, with the Obligations view quietly wrong about how often
 * money is actually owed.
 *
 * One function, interval-aware, defaulting to 1 so the call sites that
 * genuinely have no interval to hand still read correctly.
 */

/** Singular noun per recurrence, so pluralisation stays grammatical. */
const UNIT: Record<string, string> = {
  monthly: 'month',
  quarterly: 'quarter',
  biannual: 'half-year',
  yearly: 'year',
};

export function formatRecurrence(recurrence: string, interval = 1): string {
  if (recurrence === 'one_time') return 'One-time';

  // Unknown values fall through to the raw string rather than rendering
  // blank, so a new enum member is visible instead of silent.
  const unit = UNIT[recurrence] ?? recurrence;

  return interval === 1 ? `Every ${unit}` : `Every ${interval} ${unit}s`;
}
