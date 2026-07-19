/**
 * Human-readable recurrence label. "Every month" reads better than
 * the raw enum, and multi-interval forms ("Every 2 quarters") stay
 * grammatical without a lookup table per interval.
 */
export function formatRecurrence(recurrence: string, interval: number): string {
  if (recurrence === 'one_time') return 'One-time';
  const base =
    recurrence === 'biannual'
      ? 'half-year'
      : recurrence === 'quarterly'
        ? 'quarter'
        : recurrence === 'yearly'
          ? 'year'
          : recurrence === 'monthly'
            ? 'month'
            : recurrence;
  return interval === 1 ? `Every ${base}` : `Every ${interval} ${base}s`;
}
