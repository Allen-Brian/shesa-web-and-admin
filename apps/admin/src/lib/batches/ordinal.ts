/**
 * Format an integer as an English ordinal ("1st", "2nd", "3rd", "4th", ...
 * "11th", "12th", "13th", "21st", "22nd", "23rd", "101st", "111th", ...).
 * Returns `null` for null / non-positive values so callers can render an
 * em-dash without extra guarding.
 */
export function formatOrdinal(n: number | null | undefined): string | null {
  if (n == null || !Number.isFinite(n) || n <= 0) return null;
  const abs = Math.trunc(n);
  const lastTwo = abs % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${abs}th`;
  const lastOne = abs % 10;
  const suffix = lastOne === 1 ? 'st' : lastOne === 2 ? 'nd' : lastOne === 3 ? 'rd' : 'th';
  return `${abs}${suffix}`;
}

/**
 * Compose the ordinal-form batch label: "53rd Batch". Falls back to `null`
 * when the ordinal is unset so the UI can render a placeholder ("—") or
 * hide the label.
 */
export function ordinalBatchLabel(ordinal: number | null | undefined): string | null {
  const formatted = formatOrdinal(ordinal);
  return formatted ? `${formatted} Batch` : null;
}
