/**
 * Re-exports scope literals from `@shesa/types` so consumers in
 * `packages/domain` don't reach across packages themselves.
 */

export { SCOPE_TYPES, CHAPTER_KINDS } from '@shesa/types';
export type { ScopeType, ChapterKind, ScopeRef } from '@shesa/types';
