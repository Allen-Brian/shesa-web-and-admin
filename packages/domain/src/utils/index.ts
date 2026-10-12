/**
 * Generic helpers — currency, date, string formatters with
 * Cameroon-specific defaults (XAF, fr-CM) per ADR-0027.
 *
 * Domain-specific helpers (e.g. "compute outstanding obligation balance")
 * live in the relevant subfolder (rbac/audit/scopes/etc), not here.
 */

/**
 * Format an amount as Central African CFA franc.
 * XAF has no minor unit, so amounts are integers (no cents).
 *
 *   formatCurrency(15000) === '15 000 FCFA'
 */
export function formatCurrency(amount: number, locale = 'fr-CM'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format an ISO date string as a localized date.
 *
 *   formatDate('2026-06-29') === '29 juin 2026'  (fr-CM)
 */
export function formatDate(iso: string, locale = 'fr-CM'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(`${iso}T00:00:00`));
}

/**
 * Convert a string to a kebab-case slug suitable for URLs and DB slugs.
 * Strips diacritics, lowercases, collapses non-alphanumerics to dashes.
 * Pass `maxLength` to cap it; the cut never leaves a trailing dash.
 *
 *   slugify('Shesa Buéa')            === 'shesa-buea'
 *   slugify('Yaoundé Gala 2026', 12) === 'yaounde-gala'
 *
 * The diacritic strip is load-bearing, not cosmetic. Eight copies of this
 * function lived in the apps; two of them — used for finance group and
 * charge slugs — skipped the NFKD pass, so every accented name produced a
 * mangled slug: `Buéa Homecoming` became `bu-a-homecoming`, `Yaoundé Gala`
 * became `yaound-gala`. For an organisation whose branches include Yaoundé
 * and Buéa and whose networks include Santé, that is not an edge case.
 */
export function slugify(input: string, maxLength?: number): string {
  const slug = input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // Trim to a length, then drop any dash the cut left dangling.
  return maxLength ? slug.slice(0, maxLength).replace(/-+$/, '') : slug;
}

/**
 * Truncate a string to a max length, appending an ellipsis.
 * Returns the original string when it's already short enough.
 *
 *   truncate('Lorem ipsum dolor', 10) === 'Lorem ips…'
 */
export function truncate(input: string, max: number): string {
  if (input.length <= max) return input;
  return `${input.slice(0, Math.max(0, max - 1))}…`;
}
