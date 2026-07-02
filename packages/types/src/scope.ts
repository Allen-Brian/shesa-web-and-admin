/**
 * Shesa's org hierarchy types.
 *
 * The DB table is `core.scopes` (per the Phase 0 planning decision —
 * spec §7 wins over the earlier `org_nodes` naming). Each row has a
 * `scope_type` matching one of the values below.
 *
 * Hierarchy (parent → child):
 *
 *   mainstream  (the single root)
 *     └─ branch
 *          └─ chapter
 *               └─ batch
 *                    └─ house
 *
 *   sector cuts across the tree (functional grouping); it doesn't fit
 *   strictly under one of the others.
 *
 * Phase 1 §2.5: Chapter rows carry a `chapter_kind` classifier —
 * autonomous chapters hold direct memberships and their own treasury;
 * grouping chapters only *tag* members whose real membership stays
 * with the parent Branch.
 */

export const SCOPE_TYPES = ['mainstream', 'branch', 'chapter', 'batch', 'house', 'sector'] as const;

export type ScopeType = (typeof SCOPE_TYPES)[number];

export const CHAPTER_KINDS = ['autonomous', 'grouping'] as const;

export type ChapterKind = (typeof CHAPTER_KINDS)[number];

/**
 * A lightweight scope reference passed through policy checks and audit
 * entries. Full scope rows (with `chapter_kind`, `currency_code`, etc.)
 * are loaded only when actually needed.
 */
export interface ScopeRef {
  readonly scopeId: string;
  readonly scopeType: ScopeType;
  readonly slug: string;
  readonly name: string;
}
