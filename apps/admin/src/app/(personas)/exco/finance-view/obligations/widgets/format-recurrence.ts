/**
 * Maps the finance.charge_recurrence enum values to display labels.
 * Falls through unknown values to the raw string so future enum
 * additions don't render as blank while the client catches up.
 */
export function formatRecurrence(rec: string): string {
  switch (rec) {
    case 'one_time':
      return 'One-time';
    case 'monthly':
      return 'Monthly';
    case 'quarterly':
      return 'Quarterly';
    case 'biannual':
      return 'Bi-annual';
    case 'yearly':
      return 'Yearly';
    default:
      return rec;
  }
}
