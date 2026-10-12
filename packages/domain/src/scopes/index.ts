/**
 * Scopes domain — helpers for the org hierarchy (Mainstream → Branch →
 * Chapter → Batch → House, plus Sector cutting across).
 *
 * Phase 1 E1.1 additions:
 *   - CHAPTER_KINDS + ChapterKind type (autonomous | grouping)
 *   - resolveScopeCapabilities — pure default capability map,
 *     consumed by Exco UI to disable actions per scope shape.
 */

export * from './scope-constants';
export * from './capability';
export * from './display';
