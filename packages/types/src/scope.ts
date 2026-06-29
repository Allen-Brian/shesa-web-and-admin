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
 */

export const SCOPE_TYPES = ['mainstream', 'branch', 'chapter', 'batch', 'house', 'sector'] as const;

export type ScopeType = (typeof SCOPE_TYPES)[number];

/**
 * A lightweight scope reference passed through policy checks and audit
 * entries. Full scope rows (with `is_autonomous`, `currency_code`, etc.)
 * are loaded only when actually needed.
 */
export interface ScopeRef {
  readonly scopeId: string;
  readonly scopeType: ScopeType;
  readonly slug: string;
  readonly name: string;
}
