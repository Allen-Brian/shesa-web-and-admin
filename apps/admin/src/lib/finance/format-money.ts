/**
 * Money formatters used across the finance persona.
 *
 * Two flavours:
 *
 *   `formatMoney`         — full amount with the currency suffix.
 *                           `1,234,567 XAF`. Use everywhere except KPI
 *                           cards: tables, receipts, detail sheets,
 *                           dialogs, reports.
 *
 *   `formatCompactMoney`  — abbreviated with K / M / B. `1.2M XAF`.
 *                           Use ONLY on StatsCard KPI values — those
 *                           cards run out of room fast on branch-level
 *                           dashboards where a monthly total easily
 *                           runs into eight digits.
 *
 * Both round to a sensible precision so downstream cells don't need
 * to `.toFixed()` themselves.
 */

/** Full amount + currency suffix. Rounded to whole units. */
export function formatMoney(amount: number, currency: string): string {
  return `${new Intl.NumberFormat().format(Math.round(amount))} ${currency}`;
}

/**
 * Abbreviated amount for tight KPI cells. K/M/B suffixes; one decimal
 * place under 100, whole numbers above.
 *
 *   999          → 999 XAF
 *   1,200        → 1.2K XAF
 *   45,000       → 45K XAF
 *   1,234,567    → 1.2M XAF
 *   12,345,678   → 12M XAF
 *   1,234,567,890 → 1.2B XAF
 *
 * Signed inputs preserve their sign (used by the Net card).
 */
export function formatCompactMoney(amount: number, currency: string): string {
  const sign = amount < 0 ? '-' : '';
  const abs = Math.abs(amount);
  return `${sign}${compactNumber(abs)} ${currency}`;
}

function compactNumber(n: number): string {
  if (n < 1_000) return String(Math.round(n));
  if (n < 1_000_000) return `${trim(n / 1_000)}K`;
  if (n < 1_000_000_000) return `${trim(n / 1_000_000)}M`;
  return `${trim(n / 1_000_000_000)}B`;
}

function trim(n: number): string {
  return n < 100 ? n.toFixed(1).replace(/\.0$/, '') : String(Math.round(n));
}
