/**
 * 1 → "1", 1200 → "1.2k", 3_400_000 → "3.4m".
 *
 * Matches the formatting the public site uses, so an editor comparing a
 * count here against the website is reading the same number written the
 * same way.
 *
 * Kept apart from `content-metrics.ts`, which is `server-only`: the
 * column definitions that format these numbers run in the browser.
 */
export function compactCount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '')}k`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`;
}
