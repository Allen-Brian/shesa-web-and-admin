/**
 * Convert a title (or any string) into a URL-safe slug. Kept simple —
 * lowercase, collapse non-alphanumeric runs into hyphens, trim edges,
 * cap length so long titles don't produce unwieldy URLs.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining marks after NFKD
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
