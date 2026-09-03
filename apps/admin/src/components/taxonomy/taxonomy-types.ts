/**
 * Shared vocabulary for the Editor's flat, ordered classification lists.
 *
 * Six surfaces — gallery albums, news articles, projects, site events,
 * mainstream leadership sectors and organ sectors — each grew their own
 * copy of the same three-widget CRUD (row editor, row creator, manager
 * dialog). Twenty-two files; the four category row editors were byte
 * identical apart from a doc comment. What actually differs between
 * surfaces is a noun, some copy, and which server actions to call, so
 * that is exactly what this module takes as parameters.
 */

/**
 * The minimum a row must expose to be managed here. Surfaces keep their
 * own richer row types (leadership's carries its leaders, organs' its
 * slug) and satisfy this structurally.
 */
export interface TaxonomyRow {
  readonly id: string;
  readonly name: string;
  readonly sortOrder: number;
}

/** What the editor and creator hand back on save. */
export interface TaxonomyDraft {
  readonly name: string;
  /** Empty string when the surface has no caption field. */
  readonly caption: string;
}

/**
 * Structurally satisfied by every surface's own `ActionResult`, so the
 * server actions pass in unwrapped.
 */
export type TaxonomyActionResult = { readonly ok: true } | { readonly ok: false; message: string };

/**
 * The three server actions behind a taxonomy. Surfaces adapt their own
 * signatures here — organs derives a slug, leadership forwards the
 * caption, the categories ignore it.
 */
export interface TaxonomyActions {
  create(draft: TaxonomyDraft & { readonly sortOrder: number }): Promise<TaxonomyActionResult>;
  update(id: string, draft: TaxonomyDraft): Promise<TaxonomyActionResult>;
  remove(id: string): Promise<TaxonomyActionResult>;
}
